"use client";

import { Domain } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Switch } from "@usesend/ui/src/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import { api } from "~/trpc/react";
import React from "react";
import { DomainStatusBadge } from "./domain-badge";
import Spinner from "@usesend/ui/src/spinner";

export default function DomainsList() {
  const domainsQuery = api.domain.domains.useQuery();

  return (
    <div className="mt-10 flex flex-col">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domain</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Tracking</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {domainsQuery.isLoading ? (
            <TableRow className="h-32">
              <TableCell colSpan={5} className="text-center py-4">
                <Spinner
                  className="w-6 h-6 mx-auto"
                  innerSvgClass="stroke-primary"
                />
              </TableCell>
            </TableRow>
          ) : domainsQuery.data?.length ? (
            domainsQuery.data?.map((domain) => (
              <DomainRow key={domain.id} domain={domain} />
            ))
          ) : (
            <TableRow className="h-32">
              <TableCell
                colSpan={5}
                className="text-center py-10 text-muted-foreground"
              >
                No domains added
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

const DomainRow: React.FC<{ domain: Domain }> = ({ domain }) => {
  const router = useRouter();
  const updateDomain = api.domain.updateDomain.useMutation();
  const utils = api.useUtils();

  const [clickTracking, setClickTracking] = React.useState(
    domain.clickTracking,
  );
  const [openTracking, setOpenTracking] = React.useState(domain.openTracking);

  function handleClickTrackingChange() {
    setClickTracking(!clickTracking);
    updateDomain.mutate(
      { id: domain.id, clickTracking: !clickTracking },
      { onSuccess: () => utils.domain.domains.invalidate() },
    );
  }

  function handleOpenTrackingChange() {
    setOpenTracking(!openTracking);
    updateDomain.mutate(
      { id: domain.id, openTracking: !openTracking },
      { onSuccess: () => utils.domain.domains.invalidate() },
    );
  }

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/domains/${domain.id}`)}
    >
      <TableCell className="font-medium">{domain.name}</TableCell>
      <TableCell>
        <DomainStatusBadge status={domain.status} />
      </TableCell>
      <TableCell className="text-muted-foreground">{domain.region}</TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Click</span>
            <Switch
              checked={clickTracking}
              onCheckedChange={handleClickTrackingChange}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Open</span>
            <Switch
              checked={openTracking}
              onCheckedChange={handleOpenTrackingChange}
            />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};
