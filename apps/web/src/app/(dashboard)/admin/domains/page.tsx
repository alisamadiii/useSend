"use client";

import { useState } from "react";
import { Badge } from "@usesend/ui/src/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@usesend/ui/src/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import Spinner from "@usesend/ui/src/spinner";
import { toast } from "@usesend/ui/src/toaster";
import { formatDistanceToNow } from "date-fns";

import { api } from "~/trpc/react";

export default function AdminDomainsPage() {
  const utils = api.useUtils();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const domainsQuery = api.admin.listDomains.useQuery();
  const teamsQuery = api.team.getAllTeams.useQuery();

  const reassignDomain = api.admin.reassignDomain.useMutation({
    onSuccess: async () => {
      await utils.admin.listDomains.invalidate();
      toast.success("Domain reassigned");
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to reassign domain");
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  const domains = domainsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Domains</h2>
      <p className="text-sm text-muted-foreground">
        Every domain across all workspaces. Reassign a domain to move it to a
        different team.
      </p>

      <div className="bg-card shadow-card overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Current team</TableHead>
              <TableHead>Reassign</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domainsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <Spinner className="mx-auto h-6 w-6" />
                </TableCell>
              </TableRow>
            ) : domains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  No domains found.
                </TableCell>
              </TableRow>
            ) : (
              domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium">{domain.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        domain.status === "SUCCESS" ? "outline" : "secondary"
                      }
                    >
                      {domain.status === "SUCCESS"
                        ? "Verified"
                        : domain.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{domain.region}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(domain.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    {domain.team?.name ?? `Team #${domain.teamId}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={domain.teamId.toString()}
                        disabled={
                          reassignDomain.isPending || teamsQuery.isLoading
                        }
                        onValueChange={(value) => {
                          const teamId = Number(value);
                          if (teamId === domain.teamId) return;
                          setPendingId(domain.id);
                          reassignDomain.mutate({
                            domainId: domain.id,
                            teamId,
                          });
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {reassignDomain.isPending && pendingId === domain.id ? (
                        <Spinner className="h-4 w-4" />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
