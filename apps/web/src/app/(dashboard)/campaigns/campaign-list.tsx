"use client";

import { api } from "~/trpc/react";
import { useUrlState } from "~/hooks/useUrlState";
import { Button } from "@usesend/ui/src/button";
import Spinner from "@usesend/ui/src/spinner";
import { CampaignStatus } from "@prisma/client";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@usesend/ui/src/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import { Input } from "@usesend/ui/src/input";
import { Search, Copy, Trash2 } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { format, formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import React from "react";
import DeleteCampaign from "./delete-campaign";
import DuplicateCampaign from "./duplicate-campaign";
import TogglePauseCampaign from "./toggle-pause-campaign";
import CampaignStatusBadge from "./campaign-status-badge";
import { RowActions, RowActionItem } from "~/components/RowActions";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  from: string;
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date | null;
  total: number;
  sent: number;
  delivered: number;
  unsubscribed: number;
};

export default function CampaignList() {
  const [page, setPage] = useUrlState("page", "1");
  const [status, setStatus] = useUrlState("status");
  const [searchTerm, setSearchTerm] = useUrlState("search");
  const [search, setSearch] = useUrlState("search");

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
  }, 1000);

  const onSearch = (value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const pageNumber = Number(page);

  const campaignsQuery = api.campaign.getCampaigns.useQuery(
    {
      page: pageNumber,
      status: status as CampaignStatus | null,
      search,
    },
    {
      refetchInterval: (query) => {
        const c = query.state.data?.campaigns;
        if (!c) return false;
        const shouldPoll = c.some(
          (campaign) =>
            campaign.status === CampaignStatus.RUNNING ||
            campaign.status === CampaignStatus.SCHEDULED
        );
        return shouldPoll ? 5000 : false;
      },
    }
  );

  return (
    <div className="mt-10 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Search input */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm || ""}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status filter */}
        <Select
          value={status ?? "all"}
          onValueChange={(val) => setStatus(val === "all" ? null : val)}
        >
          <SelectTrigger className="w-[180px] capitalize">
            {status ? status.toLowerCase() : "All statuses"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className=" capitalize">
              All statuses
            </SelectItem>
            <SelectItem value={CampaignStatus.DRAFT} className=" capitalize">
              Draft
            </SelectItem>
            <SelectItem value={CampaignStatus.SCHEDULED} className=" capitalize">
              Scheduled
            </SelectItem>
            <SelectItem value={CampaignStatus.RUNNING} className=" capitalize">
              Running
            </SelectItem>
            <SelectItem value={CampaignStatus.PAUSED} className=" capitalize">
              Paused
            </SelectItem>
            <SelectItem value={CampaignStatus.SENT} className=" capitalize">
              Sent
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignsQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={5} className="text-center py-4">
                  <Spinner
                    className="w-6 h-6 mx-auto"
                    innerSvgClass="stroke-primary"
                  />
                </TableCell>
              </TableRow>
            ) : campaignsQuery.data?.campaigns.length ? (
              campaignsQuery.data.campaigns.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))
            ) : (
              <TableRow className="h-32">
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-muted-foreground"
                >
                  No campaigns found
                  {(search || status) && (
                    <div className="text-sm mt-2">
                      Try adjusting your search or filters
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((pageNumber - 1).toString())}
          disabled={pageNumber === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((pageNumber + 1).toString())}
          disabled={pageNumber >= (campaignsQuery.data?.totalPage ?? 0)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const pendingCount = campaign.total - campaign.sent;
  const [action, setAction] = React.useState<"duplicate" | "delete" | null>(
    null,
  );

  const href =
    campaign.status === CampaignStatus.DRAFT ||
    campaign.status === CampaignStatus.SCHEDULED
      ? `/campaigns/${campaign.id}/edit`
      : `/campaigns/${campaign.id}`;

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(href)}>
      <TableCell className="font-medium">{campaign.name}</TableCell>
      <TableCell>
        <CampaignStatusBadge status={campaign.status} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {campaign.status === CampaignStatus.SCHEDULED ? (
          campaign.scheduledAt ? (
            <span>
              At{" "}
              <strong>
                {format(new Date(campaign.scheduledAt), "MMM do, hh:mm a")}
              </strong>
            </span>
          ) : (
            "--"
          )
        ) : campaign.status === CampaignStatus.SENT ? (
          <span className="flex items-center gap-2">
            <span>
              Delivered <strong>{campaign.delivered},</strong>
            </span>
            <span>
              Unsubscribed <strong>{campaign.unsubscribed}</strong>
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span>
              Sent <strong>{campaign.sent}</strong>
            </span>
            {pendingCount > 0 && (
              <span>
                Pending <strong>{pendingCount}</strong>
              </span>
            )}
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <RowActions>
            {(close) => (
              <>
                <TogglePauseCampaign
                  campaign={campaign}
                  mode="menuitem"
                  onDone={close}
                />
                <RowActionItem
                  icon={<Copy className="h-4 w-4" />}
                  label="Duplicate"
                  onSelect={() => {
                    setAction("duplicate");
                    close();
                  }}
                />
                <RowActionItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Delete"
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
        <DuplicateCampaign
          campaign={campaign}
          open={action === "duplicate"}
          onOpenChange={(o) => setAction(o ? "duplicate" : null)}
        />
        <DeleteCampaign
          campaign={campaign}
          open={action === "delete"}
          onOpenChange={(o) => setAction(o ? "delete" : null)}
        />
      </TableCell>
    </TableRow>
  );
}
