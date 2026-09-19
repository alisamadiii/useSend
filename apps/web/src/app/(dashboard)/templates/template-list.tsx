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
import { useUrlState } from "~/hooks/useUrlState";
import { Button } from "@usesend/ui/src/button";
import Spinner from "@usesend/ui/src/spinner";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import React from "react";
import { Copy, Trash2 } from "lucide-react";

import { TextWithCopyButton } from "@usesend/ui/src/text-with-copy";
import DeleteTemplate from "./delete-template";
import DuplicateTemplate from "./duplicate-template";
import { RowActions, RowActionItem } from "~/components/RowActions";

type Template = {
  id: string;
  name: string;
  createdAt: Date;
};

export default function TemplateList() {
  const [page, setPage] = useUrlState("page", "1");

  const pageNumber = Number(page);

  const templateQuery = api.template.getTemplates.useQuery({
    page: pageNumber,
  });

  return (
    <div className="mt-10 flex flex-col gap-4">
      <div className="flex flex-col">
        <Table className="">
          <TableHeader className="">
            <TableRow className="">
              <TableHead className="">Name</TableHead>
              <TableHead className="">ID</TableHead>
              <TableHead className="">Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templateQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={4} className="text-center py-4">
                  <Spinner
                    className="w-6 h-6 mx-auto"
                    innerSvgClass="stroke-primary"
                  />
                </TableCell>
              </TableRow>
            ) : templateQuery.data?.templates.length ? (
              templateQuery.data?.templates.map((template) => (
                <TemplateRow key={template.id} template={template} />
              ))
            ) : (
              <TableRow className="h-32">
                <TableCell colSpan={4} className="text-center py-4">
                  No templates found
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
          disabled={pageNumber >= (templateQuery.data?.totalPage ?? 0)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function TemplateRow({ template }: { template: Template }) {
  const [action, setAction] = React.useState<"duplicate" | "delete" | null>(
    null,
  );

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          className="underline underline-offset-4 decoration-dashed text-foreground hover:text-foreground"
          href={`/templates/${template.id}/edit`}
        >
          {template.name}
        </Link>
      </TableCell>
      <TableCell>
        <TextWithCopyButton
          value={template.id}
          className="w-[200px] overflow-hidden"
        />
      </TableCell>
      <TableCell>
        {formatDistanceToNow(new Date(template.createdAt), {
          addSuffix: true,
        })}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <RowActions>
            {(close) => (
              <>
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
        <DuplicateTemplate
          template={template}
          open={action === "duplicate"}
          onOpenChange={(o) => setAction(o ? "duplicate" : null)}
        />
        <DeleteTemplate
          template={template}
          open={action === "delete"}
          onOpenChange={(o) => setAction(o ? "delete" : null)}
        />
      </TableCell>
    </TableRow>
  );
}
