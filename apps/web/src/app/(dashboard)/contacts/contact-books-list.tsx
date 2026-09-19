"use client";

import { formatDistanceToNow } from "date-fns";
import { api } from "~/trpc/react";
import DeleteContactBook from "./delete-contact-book";
import Link from "next/link";
import EditContactBook from "./edit-contact-book";
import { useRouter } from "next/navigation";
import { Card } from "@usesend/ui/src/card";
import { useUrlState } from "~/hooks/useUrlState";
import { Input } from "@usesend/ui/src/input";
import { useDebouncedCallback } from "use-debounce";

export default function ContactBooksList() {
  const [search, setSearch] = useUrlState("search");
  const contactBooksQuery = api.contacts.getContactBooks.useQuery({
    search: search ?? undefined,
  });

  const router = useRouter();

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
  }, 1000);

  return (
    <div className="mt-10">
      <Input
        placeholder="Search contact book"
        className="w-[300px] mr-4 mb-4"
        defaultValue={search ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 ">
        {contactBooksQuery.data?.map((contactBook) => (
          <Card
            key={contactBook.id}
            className="flex flex-col overflow-hidden ring-1 ring-transparent transition-[box-shadow,ring] hover:ring-border hover:shadow-md"
          >
              <Link href={`/contacts/${contactBook.id}`} key={contactBook.id}>
                <div className="flex justify-between items-center p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate whitespace-nowrap overflow-ellipsis w-[180px]">
                      {contactBook.name}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-mono">
                      {contactBook._count.contacts}
                    </span>{" "}
                    contacts
                  </div>
                </div>
              </Link>

              <div className="flex justify-between items-center border-t  bg-muted/50">
                <div
                  className="text-muted-foreground text-xs cursor-pointer w-full py-3 pl-4"
                  onClick={() => router.push(`/contacts/${contactBook.id}`)}
                >
                  {formatDistanceToNow(contactBook.createdAt, {
                    addSuffix: true,
                  })}
                </div>
                <div className="flex gap-3 pr-4">
                  <EditContactBook contactBook={contactBook} />
                  <DeleteContactBook contactBook={contactBook} />
                </div>
              </div>
            </Card>
        ))}
      </div>
    </div>
  );
}
