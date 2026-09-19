"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@usesend/ui/src/table";
import { api } from "~/trpc/react";
import { Badge } from "@usesend/ui/src/badge";
import Spinner from "@usesend/ui/src/spinner";
import { formatDistanceToNow } from "date-fns";
import { Role } from "@prisma/client";
import React from "react";
import { Edit, LogOut, Trash2 } from "lucide-react";
import { RowActions, RowActionItem } from "~/components/RowActions";
import { EditTeamMember } from "./edit-team-member";
import { DeleteTeamMember } from "./delete-team-member";
import { ResendTeamInvite } from "./resend-team-invite";
import { DeleteTeamInvite } from "./delete-team-invite";
import { useTeam } from "~/providers/team-context";
import { useSession } from "next-auth/react";

export default function TeamMembersList() {
  const { currentIsAdmin } = useTeam();
  const { data: session } = useSession();
  const teamUsersQuery = api.team.getTeamUsers.useQuery();
  const teamInvitesQuery = api.team.getTeamInvites.useQuery();

  // Combine team users and invites for display
  const teamMembers = teamUsersQuery.data || [];
  const pendingInvites = teamInvitesQuery.data || [];

  const isLoading = teamUsersQuery.isLoading || teamInvitesQuery.isLoading;

  return (
    <div className="mt-10 flex flex-col gap-4">
      <div className="flex flex-col">
        <Table>
          <TableHeader>
            <TableRow className="">
              <TableHead className="">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={5} className="text-center py-4">
                  <Spinner
                    className="w-6 h-6 mx-auto"
                    innerSvgClass="stroke-primary"
                  />
                </TableCell>
              </TableRow>
            ) : teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <TeamMemberRow
                  key={member.userId}
                  member={member}
                  currentIsAdmin={currentIsAdmin}
                  isSelf={session?.user.id == member.userId}
                />
              ))
            ) : (
              <TableRow className="h-32">
                <TableCell colSpan={5} className="text-center py-4">
                  No team members found
                </TableCell>
              </TableRow>
            )}

            {/* Pending invites section */}
            {pendingInvites.length > 0 && (
              <>
                {pendingInvites.map((invite) => (
                  <TeamInviteRow
                    key={invite.id}
                    invite={invite}
                    currentIsAdmin={currentIsAdmin}
                  />
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TeamMemberRow({
  member,
  currentIsAdmin,
  isSelf,
}: {
  member: {
    userId: string | number;
    role: Role;
    user: { email?: string | null; createdAt: Date };
  };
  currentIsAdmin: boolean;
  isSelf: boolean;
}) {
  const [action, setAction] = React.useState<"edit" | "delete" | null>(null);
  const canDelete = currentIsAdmin || isSelf;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {member.user?.email || "Unknown user"}
      </TableCell>
      <TableCell>
        <span className="text-sm capitalize">
          {member.role.toLowerCase()}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant="success" className="min-w-[90px]">
          Active
        </Badge>
      </TableCell>
      <TableCell>
        {formatDistanceToNow(new Date(member.user.createdAt), {
          addSuffix: true,
        })}
      </TableCell>
      <TableCell className="text-right">
        {currentIsAdmin || canDelete ? (
          <div className="flex justify-end">
            <RowActions>
              {(close) => (
                <>
                  {currentIsAdmin ? (
                    <RowActionItem
                      icon={<Edit className="h-4 w-4" />}
                      label="Edit"
                      onSelect={() => {
                        setAction("edit");
                        close();
                      }}
                    />
                  ) : null}
                  {canDelete ? (
                    <RowActionItem
                      icon={
                        isSelf ? (
                          <LogOut className="h-4 w-4" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )
                      }
                      label={isSelf ? "Leave team" : "Remove"}
                      destructive
                      onSelect={() => {
                        setAction("delete");
                        close();
                      }}
                    />
                  ) : null}
                </>
              )}
            </RowActions>
          </div>
        ) : null}
        {currentIsAdmin ? (
          <EditTeamMember
            teamUser={{ userId: String(member.userId), role: member.role }}
            open={action === "edit"}
            onOpenChange={(o) => setAction(o ? "edit" : null)}
          />
        ) : null}
        {canDelete ? (
          <DeleteTeamMember
            teamUser={{
              userId: String(member.userId),
              role: member.role,
              email: member.user?.email || "Unknown user",
            }}
            self={isSelf}
            open={action === "delete"}
            onOpenChange={(o) => setAction(o ? "delete" : null)}
          />
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function TeamInviteRow({
  invite,
  currentIsAdmin,
}: {
  invite: { id: string; email: string; role: Role; createdAt: Date };
  currentIsAdmin: boolean;
}) {
  const [action, setAction] = React.useState<"delete" | null>(null);

  return (
    <TableRow>
      <TableCell className="font-medium">{invite.email}</TableCell>
      <TableCell>
        <span className="text-sm capitalize">{invite.role.toLowerCase()}</span>
      </TableCell>
      <TableCell>
        <Badge variant="warning" className="min-w-[90px]">
          Pending
        </Badge>
      </TableCell>
      <TableCell>
        {formatDistanceToNow(new Date(invite.createdAt), {
          addSuffix: true,
        })}
      </TableCell>
      <TableCell className="text-right">
        {currentIsAdmin ? (
          <>
            <div className="flex justify-end">
              <RowActions>
                {(close) => (
                  <>
                    <ResendTeamInvite
                      invite={invite}
                      mode="menu"
                      onDone={close}
                    />
                    <RowActionItem
                      icon={<Trash2 className="h-4 w-4" />}
                      label="Cancel invite"
                      destructive
                      onSelect={() => {
                        setAction("delete");
                        close();
                      }}
                    />
                  </>
                )}
              </RowActions>
            </div>
            <DeleteTeamInvite
              invite={invite}
              open={action === "delete"}
              onOpenChange={(o) => setAction(o ? "delete" : null)}
            />
          </>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
