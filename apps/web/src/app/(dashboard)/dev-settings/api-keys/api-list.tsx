"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import { formatDistanceToNow } from "date-fns";
import { api } from "~/trpc/react";
import DeleteApiKey from "./delete-api-key";
import { EditApiKeyDialog } from "./edit-api-key";
import Spinner from "@usesend/ui/src/spinner";
import { useState } from "react";
import { Edit3, Trash2 } from "lucide-react";
import { RowActions, RowActionItem } from "~/components/RowActions";

export default function ApiList() {
  const apiKeysQuery = api.apiKey.getApiKeys.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  return (
    <div className="mt-10">
      <div>
        <Table className="">
          <TableHeader className="">
            <TableRow className="">
              <TableHead className="">Name</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Domain Access</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created at</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeysQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={7} className="text-center py-4">
                  <Spinner
                    className="w-6 h-6 mx-auto"
                    innerSvgClass="stroke-primary"
                  />
                </TableCell>
              </TableRow>
            ) : apiKeysQuery.data?.length === 0 ? (
              <TableRow className="h-32">
                <TableCell colSpan={7} className="text-center py-4">
                  <p>No API keys added</p>
                </TableCell>
              </TableRow>
            ) : (
              apiKeysQuery.data?.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>{apiKey.name}</TableCell>
                  <TableCell>{apiKey.partialToken}</TableCell>
                  <TableCell>{apiKey.permission}</TableCell>
                  <TableCell>
                    {apiKey.domainId
                      ? apiKey.domain?.name ?? "Domain removed"
                      : "All domains"}
                  </TableCell>
                  <TableCell>
                    {apiKey.lastUsed
                      ? formatDistanceToNow(apiKey.lastUsed, {
                          addSuffix: true,
                        })
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(apiKey.createdAt, {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <RowActions>
                        {(close) => (
                          <>
                            <RowActionItem
                              icon={<Edit3 className="h-4 w-4" />}
                              label="Edit"
                              onSelect={() => {
                                setEditingId(apiKey.id);
                                close();
                              }}
                            />
                            <RowActionItem
                              icon={<Trash2 className="h-4 w-4" />}
                              label="Delete"
                              destructive
                              onSelect={() => {
                                setDeletingId(apiKey.id);
                                close();
                              }}
                            />
                          </>
                        )}
                      </RowActions>
                    </div>
                    <EditApiKeyDialog
                      apiKey={apiKey}
                      open={editingId === apiKey.id}
                      onOpenChange={(open) => {
                        if (!open) setEditingId(null);
                      }}
                    />
                    <DeleteApiKey
                      apiKey={apiKey}
                      open={deletingId === apiKey.id}
                      onOpenChange={(open) => {
                        if (!open) setDeletingId(null);
                      }}
                    />
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
