"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { ACTIVE_TEAM_COOKIE } from "~/lib/constants/cookies";

// Define the Team type based on the Prisma schema
type Team = {
  id: number;
  name: string;
  externalId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  plan: "FREE" | "BASIC";
  stripeCustomerId?: string | null;
  billingEmail?: string | null;
  teamUsers?: { role: "ADMIN" | "MEMBER" }[];
};

interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  isLoading: boolean;
  currentRole: "ADMIN" | "MEMBER";
  currentIsAdmin: boolean;
  isAdmin: boolean;
  setActiveTeam: (teamId: number) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

function writeActiveTeamCookie(teamId: number) {
  // Advisory cookie only — the backend always re-validates team access.
  document.cookie = `${ACTIVE_TEAM_COOKIE}=${teamId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const utils = api.useUtils();

  const memberTeamsQuery = api.team.getTeams.useQuery();
  const allTeamsQuery = api.team.getAllTeams.useQuery(undefined, {
    enabled: isAdmin,
  });

  const activeQuery = isAdmin ? allTeamsQuery : memberTeamsQuery;
  const teams = (activeQuery.data ?? []) as Team[];

  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);

  useEffect(() => {
    setActiveTeamId(parseActiveTeamCookieClient());
  }, []);

  const currentTeam =
    teams.find((team) => team.id === activeTeamId) ?? teams[0] ?? null;

  const membershipRole = currentTeam?.teamUsers?.[0]?.role;
  const currentRole: "ADMIN" | "MEMBER" =
    membershipRole ?? (isAdmin ? "ADMIN" : "MEMBER");

  const setActiveTeam = (teamId: number) => {
    writeActiveTeamCookie(teamId);
    setActiveTeamId(teamId);
    // Nearly every query is team-scoped, so refresh the whole cache.
    void utils.invalidate();
  };

  const value: TeamContextType = {
    currentTeam,
    teams,
    isLoading: activeQuery.status === "pending",
    currentRole,
    currentIsAdmin: currentRole === "ADMIN",
    isAdmin,
    setActiveTeam,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

function parseActiveTeamCookieClient(): number | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACTIVE_TEAM_COOKIE}=`));
  if (!entry) return null;
  const id = Number(entry.slice(ACTIVE_TEAM_COOKIE.length + 1));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
