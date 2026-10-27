"use client";

import { useSession } from "next-auth/react";
import { FullScreenLoading } from "~/components/FullScreenLoading";
import { AddSesSettings } from "~/components/settings/AddSesSettings";
import CreateTeam from "~/components/team/CreateTeam";
import { env } from "~/env";
import { api } from "~/trpc/react";
import { TeamProvider } from "./team-context";

export const DashboardProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user.isAdmin);
  const { data: teams, status } = api.team.getTeams.useQuery();
  // Admins oversee every workspace, so they can enter the dashboard even with no
  // membership of their own as long as at least one workspace exists.
  const { data: allTeams, status: allTeamsStatus } =
    api.team.getAllTeams.useQuery(undefined, { enabled: isAdmin });
  const { data: settings, status: settingsStatus } =
    api.admin.getSesSettings.useQuery(undefined, {
      enabled: !env.NEXT_PUBLIC_IS_CLOUD || session?.user.isAdmin,
    });

  if (
    status === "pending" ||
    (isAdmin && allTeamsStatus === "pending") ||
    (settingsStatus === "pending" && !env.NEXT_PUBLIC_IS_CLOUD)
  ) {
    return <FullScreenLoading />;
  }

  if (
    settings?.length === 0 &&
    (!env.NEXT_PUBLIC_IS_CLOUD || session?.user.isAdmin)
  ) {
    return <AddSesSettings />;
  }

  const hasTeam =
    (teams && teams.length > 0) || (isAdmin && (allTeams?.length ?? 0) > 0);

  if (!hasTeam) {
    return <CreateTeam />;
  }

  return <TeamProvider>{children}</TeamProvider>;
};
