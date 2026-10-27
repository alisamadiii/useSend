import { TRPCError } from "@trpc/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { sendMail, sendTeamInviteEmail } from "~/server/mailer";
import { logger } from "~/server/logger/log";
import type { Prisma, Team, TeamInvite, TeamUser } from "@prisma/client";
import { UnsendApiError } from "../public-api/api-error";
import { getRedis, redisKey } from "~/server/redis";
import { LimitReason } from "~/lib/constants/plans";
import { LimitService } from "./limit-service";
import { renderUsageLimitReachedEmail } from "../email-templates/UsageLimitReachedEmail";
import { renderUsageWarningEmail } from "../email-templates/UsageWarningEmail";
import { deleteDomain } from "./domain-service";

// Cache stores exactly Prisma Team shape (no counts)

const TEAM_CACHE_TTL_SECONDS = 120; // 2 minutes

export class TeamService {
  private static cacheKey(teamId: number) {
    return redisKey(`team:${teamId}`);
  }

  static async refreshTeamCache(teamId: number): Promise<Team | null> {
    const team = await db.team.findUnique({ where: { id: teamId } });

    if (!team) return null;

    const redis = getRedis();
    await redis.setex(
      TeamService.cacheKey(teamId),
      TEAM_CACHE_TTL_SECONDS,
      JSON.stringify(team),
    );
    return team;
  }

  static async invalidateTeamCache(teamId: number) {
    const redis = getRedis();
    await redis.del(TeamService.cacheKey(teamId));
  }

  static async getTeamCached(teamId: number): Promise<Team> {
    const redis = getRedis();
    const raw = await redis.get(TeamService.cacheKey(teamId));
    if (raw) {
      return JSON.parse(raw) as Team;
    }
    const fresh = await TeamService.refreshTeamCache(teamId);
    if (!fresh) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
    }
    return fresh;
  }

  static async createTeam(
    userId: number,
    name: string,
  ): Promise<Team | undefined> {
    const teams = await db.team.findMany({
      where: {
        teamUsers: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (teams.length > 0) {
      logger.info({ userId }, "User already has a team");
      return;
    }

    // NOTE: the agency fork runs self-hosted with many client workspaces (teams),
    // one per client-hub project. The upstream "single team on self-hosted" guard is
    // intentionally removed here so admins can own/create multiple teams.

    const created = await db.team.create({
      data: {
        name,
        teamUsers: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });
    // Warm cache for the new team
    await TeamService.refreshTeamCache(created.id);
    return created;
  }

  /**
   * Create a workspace (team) provisioned by an external system (client-hub) via the
   * public API. No TeamUser is attached — these teams are machine-owned and accessed
   * through a per-team API key and/or the admin workspace switcher.
   * `externalId` stores the client-hub repo_id so the two map 1:1.
   */
  static async createTeamForExternal({
    name,
    externalId,
  }: {
    name: string;
    externalId: string;
  }): Promise<Team> {
    const created = await db.team.create({
      data: { name, externalId },
    });
    await TeamService.refreshTeamCache(created.id);
    return created;
  }

  /**
   * All teams, newest first. Used by the admin workspace switcher.
   */
  static async getAllTeams() {
    return db.team.findMany({ orderBy: { createdAt: "desc" } });
  }

  /**
   * Permanently delete a team and all of its data. Admin-only.
   * Refuses to delete a team the requester is a member of.
   */
  static async deleteTeam(teamId: number, requestingUserId: number) {
    const membership = await db.teamUser.findFirst({
      where: { teamId, userId: requestingUserId },
    });
    if (membership) {
      throw new Error("You cannot delete a team you are a member of");
    }

    const team = await db.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new Error("Team not found");
    }

    // Clean up AWS SES identities first — a raw cascade delete would orphan them.
    const domains = await db.domain.findMany({
      where: { teamId },
      select: { id: true, name: true },
    });
    for (const domain of domains) {
      try {
        await deleteDomain(domain.id);
      } catch (error) {
        logger.error(
          { err: error, domainId: domain.id, teamId },
          "[TeamService.deleteTeam]: failed to clean up domain; continuing",
        );
      }
    }

    // Cascade removes all remaining child rows (members, api keys, emails, etc.).
    await db.team.delete({ where: { id: teamId } });
    await TeamService.invalidateTeamCache(teamId);

    return { id: teamId };
  }

  /**
   * Resolve the active team for a request.
   * - If a selected team id is provided (from the active-team cookie) and the user is a
   *   member of it, use that team.
   * - If the user is an admin, they may select any team (a synthetic ADMIN teamUser is
   *   returned so admin-gated procedures keep working).
   * - Otherwise fall back to the user's first team membership.
   * The cookie is never trusted for authorization — access is always re-checked here.
   */
  static async resolveTeamContext(
    userId: number,
    isAdmin: boolean,
    selectedTeamId?: number | null,
  ): Promise<{ team: Team; teamUser: TeamUser & { team: Team } } | null> {
    if (selectedTeamId != null) {
      const membership = await db.teamUser.findFirst({
        where: { teamId: selectedTeamId, userId },
        include: { team: true },
      });
      if (membership) {
        return { team: membership.team, teamUser: membership };
      }

      if (isAdmin) {
        const team = await db.team.findUnique({
          where: { id: selectedTeamId },
        });
        if (team) {
          return {
            team,
            teamUser: { teamId: team.id, userId, role: "ADMIN", team },
          };
        }
      }
      // Selected team not accessible — fall through to the default team.
    }

    const first = await db.teamUser.findFirst({
      where: { userId },
      include: { team: true },
    });
    if (first) {
      return { team: first.team, teamUser: first };
    }

    return null;
  }

  /**
   * Update a team and refresh the cache.
   * Returns the full Prisma Team object.
   */
  static async updateTeam(
    teamId: number,
    data: Prisma.TeamUpdateInput,
  ): Promise<Team> {
    const updated = await db.team.update({ where: { id: teamId }, data });
    await TeamService.refreshTeamCache(teamId);
    return updated;
  }

  static async getUserTeams(userId: number) {
    return db.team.findMany({
      where: {
        teamUsers: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        teamUsers: {
          where: {
            userId: userId,
          },
        },
      },
    });
  }

  static async getTeamUsers(teamId: number) {
    return db.teamUser.findMany({
      where: {
        teamId,
      },
      include: {
        user: true,
      },
    });
  }

  static async getTeamInvites(teamId: number) {
    return db.teamInvite.findMany({
      where: {
        teamId,
      },
    });
  }

  static async createTeamInvite(
    teamId: number,
    email: string,
    role: "MEMBER" | "ADMIN",
    teamName: string,
    sendEmail: boolean = true,
  ): Promise<TeamInvite> {
    if (!email) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Email is required",
      });
    }

    const { isLimitReached } = await LimitService.checkTeamMemberLimit(teamId);
    if (isLimitReached) {
      throw new UnsendApiError({
        code: "FORBIDDEN",
        message: "Team invite limit reached",
      });
    }

    const user = await db.user.findUnique({
      where: {
        email,
      },
      include: {
        teamUsers: true,
      },
    });

    if (user && user.teamUsers.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User already part of a team",
      });
    }

    const teamInvite = await db.teamInvite.create({
      data: {
        teamId,
        email,
        role,
      },
    });

    const teamUrl = `${env.NEXTAUTH_URL}/join-team?inviteId=${teamInvite.id}`;

    if (sendEmail) {
      await sendTeamInviteEmail(email, teamUrl, teamName);
    }

    return teamInvite;
  }

  static async updateTeamUserRole(
    teamId: number,
    userId: string,
    role: "MEMBER" | "ADMIN",
  ) {
    const teamUser = await db.teamUser.findFirst({
      where: {
        teamId,
        userId: Number(userId),
      },
    });

    if (!teamUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team member not found",
      });
    }

    // Check if this is the last admin
    const adminCount = await db.teamUser.count({
      where: {
        teamId,
        role: "ADMIN",
      },
    });

    if (adminCount === 1 && teamUser.role === "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Need at least one admin",
      });
    }

    const updated = await db.teamUser.update({
      where: {
        teamId_userId: {
          teamId,
          userId: Number(userId),
        },
      },
      data: {
        role,
      },
    });
    // Role updates might influence permissions; refresh cache to be safe
    await TeamService.invalidateTeamCache(teamId);
    return updated;
  }

  static async deleteTeamUser(
    teamId: number,
    userId: string,
    requestorRole: string,
    requestorId: number,
  ) {
    const teamUser = await db.teamUser.findFirst({
      where: {
        teamId,
        userId: Number(userId),
      },
    });

    if (!teamUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team member not found",
      });
    }

    if (requestorRole !== "ADMIN" && requestorId !== Number(userId)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not authorized to delete this team member",
      });
    }

    // Check if this is the last admin
    const adminCount = await db.teamUser.count({
      where: {
        teamId,
        role: "ADMIN",
      },
    });

    if (adminCount === 1 && teamUser.role === "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Need at least one admin",
      });
    }

    const deleted = await db.teamUser.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: Number(userId),
        },
      },
    });
    await TeamService.invalidateTeamCache(teamId);
    return deleted;
  }

  static async resendTeamInvite(
    teamId: number,
    inviteId: string,
    teamName: string,
  ) {
    const invite = await db.teamInvite.findFirst({
      where: {
        teamId,
        id: {
          equals: inviteId,
        },
      },
    });

    if (!invite) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite not found",
      });
    }

    const teamUrl = `${env.NEXTAUTH_URL}/join-team?inviteId=${invite.id}`;

    await sendTeamInviteEmail(invite.email, teamUrl, teamName);

    return { success: true };
  }

  static async deleteTeamInvite(teamId: number, inviteId: string) {
    const invite = await db.teamInvite.findFirst({
      where: {
        teamId,
        id: {
          equals: inviteId,
        },
      },
    });

    if (!invite) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite not found",
      });
    }

    return db.teamInvite.delete({
      where: {
        teamId_email: {
          teamId,
          email: invite.email,
        },
      },
    });
  }

  /**
   * Notify all team users that email limit has been reached, at most once per day.
   */
  static async maybeNotifyEmailLimitReached(
    teamId: number,
    limit: number,
    reason: LimitReason | undefined,
  ) {
    logger.info(
      { teamId, limit, reason },
      "[TeamService]: maybeNotifyEmailLimitReached called",
    );
    if (!reason) {
      logger.info(
        { teamId },
        "[TeamService]: Skipping notify — no reason provided",
      );
      return;
    }
    // Only notify on actual email limit reasons
    if (
      ![
        LimitReason.EMAIL_DAILY_LIMIT_REACHED,
        LimitReason.EMAIL_FREE_PLAN_MONTHLY_LIMIT_REACHED,
      ].includes(reason)
    ) {
      logger.info(
        { teamId, reason },
        "[TeamService]: Skipping notify — reason not eligible",
      );
      return;
    }

    const redis = getRedis();
    const cacheKey = redisKey(`limit:notify:${teamId}:${reason}`);
    // Atomic SET NX to prevent race conditions: only one concurrent caller
    // can acquire the cooldown key. TTL = 24 hours (one notification per day).
    const acquired = await redis.set(cacheKey, "1", "EX", 24 * 60 * 60, "NX");
    if (acquired !== "OK") {
      logger.info(
        { teamId, cacheKey },
        "[TeamService]: Skipping notify — cooldown active",
      );
      return; // another request already claimed this window
    }

    const team = await TeamService.getTeamCached(teamId);
    // Only consider it a paid plan if the subscription is active
    const isPaidPlan = team.isActive && team.plan !== "FREE";

    const html = await getLimitReachedEmail(teamId, limit, reason);

    const subject =
      reason === LimitReason.EMAIL_FREE_PLAN_MONTHLY_LIMIT_REACHED
        ? "useSend: You've reached your monthly email limit"
        : "useSend: You've reached your daily email limit";

    const text = `Hi ${team.name} team,\n\nYou've reached your ${
      reason === LimitReason.EMAIL_FREE_PLAN_MONTHLY_LIMIT_REACHED
        ? "monthly"
        : "daily"
    } limit of ${limit.toLocaleString()} emails.\n\nSending is temporarily paused until your limit resets or ${
      isPaidPlan ? "your team is verified" : "your plan is upgraded"
    }.\n\nManage plan: ${env.NEXTAUTH_URL}/settings`;

    const teamUsers = await TeamService.getTeamUsers(teamId);
    const recipients = teamUsers
      .map((tu) => tu.user?.email)
      .filter((e): e is string => Boolean(e));

    logger.info(
      { teamId, recipientsCount: recipients.length, reason },
      "[TeamService]: Sending limit reached notifications",
    );

    // Send individually to all team users
    try {
      await Promise.all(
        recipients.map((to) =>
          sendMail(to, subject, text, html, "hey@usesend.com"),
        ),
      );
      logger.info(
        { teamId, recipientsCount: recipients.length },
        "[TeamService]: Limit reached notifications sent",
      );
    } catch (err) {
      logger.error(
        { err, teamId },
        "[TeamService]: Failed sending limit reached notifications",
      );
      throw err;
    }
  }

  /**
   * Notify all team users that they're nearing their email limit.
   * Rate limited via Redis to avoid spamming; sends at most once per day per reason.
   */
  static async sendWarningEmail(
    teamId: number,
    used: number,
    limit: number,
    reason: LimitReason | undefined,
  ) {
    logger.info(
      { teamId, used, limit, reason },
      "[TeamService]: sendWarningEmail called",
    );
    if (!reason) {
      logger.info(
        { teamId },
        "[TeamService]: Skipping warning — no reason provided",
      );
      return;
    }

    if (
      ![
        LimitReason.EMAIL_DAILY_LIMIT_REACHED,
        LimitReason.EMAIL_FREE_PLAN_MONTHLY_LIMIT_REACHED,
      ].includes(reason)
    ) {
      logger.info(
        { teamId, reason },
        "[TeamService]: Skipping warning — reason not eligible",
      );
      return;
    }

    const redis = getRedis();
    const cacheKey = redisKey(`limit:warning:${teamId}:${reason}`);
    // Atomic SET NX to prevent race conditions: only one concurrent caller
    // can acquire the cooldown key. TTL = 24 hours (one notification per day).
    const acquired = await redis.set(cacheKey, "1", "EX", 24 * 60 * 60, "NX");
    if (acquired !== "OK") {
      logger.info(
        { teamId, cacheKey },
        "[TeamService]: Skipping warning — cooldown active",
      );
      return; // another request already claimed this window
    }

    const team = await TeamService.getTeamCached(teamId);
    // Only consider it a paid plan if the subscription is active
    const isPaidPlan = team.isActive && team.plan !== "FREE";

    const period =
      reason === LimitReason.EMAIL_FREE_PLAN_MONTHLY_LIMIT_REACHED
        ? "monthly"
        : "daily";

    const html = await renderUsageWarningEmail({
      teamName: team.name,
      used,
      limit,
      isPaidPlan,
      period,
      manageUrl: `${env.NEXTAUTH_URL}/settings`,
    });

    const subject =
      period === "monthly"
        ? "useSend: You're nearing your monthly email limit"
        : "useSend: You're nearing your daily email limit";

    const text = `Hi ${team.name} team,\n\nYou've used ${used.toLocaleString()} of your ${period} limit of ${limit.toLocaleString()} emails.\n\nConsider ${
      isPaidPlan
        ? "verifying your team by replying to this email"
        : "upgrading your plan"
    }.\n\nManage plan: ${env.NEXTAUTH_URL}/settings`;

    const teamUsers = await TeamService.getTeamUsers(teamId);
    const recipients = teamUsers
      .map((tu) => tu.user?.email)
      .filter((e): e is string => Boolean(e));

    logger.info(
      { teamId, recipientsCount: recipients.length, reason },
      "[TeamService]: Sending warning notifications",
    );

    try {
      await Promise.all(
        recipients.map((to) =>
          sendMail(to, subject, text, html, "hey@usesend.com"),
        ),
      );
      logger.info(
        { teamId, recipientsCount: recipients.length },
        "[TeamService]: Warning notifications sent",
      );
    } catch (err) {
      logger.error(
        { err, teamId },
        "[TeamService]: Failed sending warning notifications",
      );
      throw err;
    }
  }
}

async function getLimitReachedEmail(
  teamId: number,
  limit: number,
  reason: LimitReason,
) {
  const team = await TeamService.getTeamCached(teamId);
  const isPaidPlan = team.isActive && team.plan !== "FREE";
  const email = await renderUsageLimitReachedEmail({
    teamName: team.name,
    limit,
    isPaidPlan,
    period:
      reason === LimitReason.EMAIL_FREE_PLAN_MONTHLY_LIMIT_REACHED
        ? "monthly"
        : "daily",
    manageUrl: `${env.NEXTAUTH_URL}/settings`,
  });
  return email;
}
