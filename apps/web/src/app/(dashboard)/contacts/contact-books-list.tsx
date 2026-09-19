"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { api } from "~/trpc/react";
import DeleteContactBook from "./delete-contact-book";
import EditContactBook from "./edit-contact-book";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import Spinner from "@usesend/ui/src/spinner";
import { RowActions, RowActionItem } from "~/components/RowActions";
import { Edit, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@usesend/ui/src/tooltip";
import { useUrlState } from "~/hooks/useUrlState";
import { Input } from "@usesend/ui/src/input";
import { useDebouncedCallback } from "use-debounce";

type ContactBook = {
  id: string;
  name: string;
  createdAt: Date;
  doubleOptInEnabled?: boolean;
  doubleOptInFrom?: string | null;
  _count: { contacts: number };
};

export default function ContactBooksList() {
  const [search, setSearch] = useUrlState("search");
  const contactBooksQuery = api.contacts.getContactBooks.useQuery({
    search: search ?? undefined,
  });

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
  }, 1000);

  return (
    <div className="mt-10 flex flex-col gap-4">
      <Input
        placeholder="Search contact book"
        className="w-[300px]"
        defaultValue={search ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
      />
      <div className="flex flex-col">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactBooksQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={4} className="text-center py-4">
                  <Spinner
                    className="w-6 h-6 mx-auto"
                    innerSvgClass="stroke-primary"
                  />
                </TableCell>
              </TableRow>
            ) : contactBooksQuery.data?.length ? (
              contactBooksQuery.data.map((contactBook) => (
                <ContactBookRow
                  key={contactBook.id}
                  contactBook={contactBook}
                />
              ))
            ) : (
              <TableRow className="h-32">
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-muted-foreground"
                >
                  No contact books found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ContactBookRow({ contactBook }: { contactBook: ContactBook }) {
  const router = useRouter();
  const [action, setAction] = React.useState<"edit" | "delete" | null>(null);

  const missingDoubleOptInFrom =
    Boolean(contactBook.doubleOptInEnabled) && !contactBook.doubleOptInFrom;

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/contacts/${contactBook.id}`)}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {contactBook.name}
          {missingDoubleOptInFrom ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full bg-destructive"
                    aria-label="Double opt-in misconfigured"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  Double opt-in is enabled but no From address is set. Add a
                  From address before using it.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        <span className="font-mono">{contactBook._count.contacts}</span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDistanceToNow(contactBook.createdAt, { addSuffix: true })}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <RowActions>
            {(close) => (
              <>
                <RowActionItem
                  icon={<Edit className="h-4 w-4" />}
                  label="Edit"
                  onSelect={() => {
                    setAction("edit");
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
        <EditContactBook
          contactBook={contactBook}
          open={action === "edit"}
          onOpenChange={(o) => setAction(o ? "edit" : null)}
        />
        <DeleteContactBook
          contactBook={contactBook}
          open={action === "delete"}
          onOpenChange={(o) => setAction(o ? "delete" : null)}
        />
      </TableCell>
    </TableRow>
  );
}
