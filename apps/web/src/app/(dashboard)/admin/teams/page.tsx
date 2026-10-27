"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@usesend/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@usesend/ui/src/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@usesend/ui/src/form";
import { Input } from "@usesend/ui/src/input";
import { Switch } from "@usesend/ui/src/switch";
import Spinner from "@usesend/ui/src/spinner";
import { toast } from "@usesend/ui/src/toaster";
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

import { api } from "~/trpc/react";
import { DeleteResource } from "~/components/DeleteResource";
import type { AppRouter } from "~/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type TeamRow = RouterOutputs["admin"]["listTeams"][number];

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  apiRateLimit: z.coerce.number().int().min(1).max(10_000),
  dailyEmailLimit: z.coerce.number().int().min(0).max(10_000_000),
  isBlocked: z.boolean(),
  plan: z.enum(["FREE", "BASIC"]),
});

type UpdateInput = z.infer<typeof updateSchema>;

export default function AdminTeamsPage() {
  const utils = api.useUtils();
  const [filter, setFilter] = useState("");

  const teamsQuery = api.admin.listTeams.useQuery();
  const myTeamsQuery = api.team.getTeams.useQuery();

  const ownIds = useMemo(
    () => new Set((myTeamsQuery.data ?? []).map((t) => t.id)),
    [myTeamsQuery.data],
  );

  const deleteTeam = api.admin.deleteTeam.useMutation({
    onSuccess: () => {
      utils.admin.listTeams.invalidate();
      toast.success("Team deleted");
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to delete team");
    },
  });

  const teams = teamsQuery.data ?? [];
  const query = filter.trim().toLowerCase();
  const filtered = query
    ? teams.filter(
        (t) =>
          t.name.toLowerCase().includes(query) || String(t.id).includes(query),
      )
    : teams;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Teams</h2>
        <Input
          placeholder="Filter by name or ID"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="bg-card shadow-card overflow-hidden rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead className="text-right">Domains</TableHead>
              <TableHead className="text-right">Daily limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <Spinner className="mx-auto h-6 w-6" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  No teams found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{team.plan}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {team._count.teamUsers}
                  </TableCell>
                  <TableCell className="text-right">
                    {team._count.domains}
                  </TableCell>
                  <TableCell className="text-right">
                    {team.dailyEmailLimit.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={team.isBlocked ? "destructive" : "outline"}>
                      {team.isBlocked ? "Blocked" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <EditTeamDialog team={team} />
                      {ownIds.has(team.id) ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <DeleteResource
                          title="Delete team"
                          resourceName={team.name}
                          schema={z
                            .object({ confirmation: z.string() })
                            .refine((d) => d.confirmation === team.name, {
                              message: "Name does not match",
                              path: ["confirmation"],
                            })}
                          isLoading={deleteTeam.isPending}
                          onConfirm={() =>
                            deleteTeam.mutate({ teamId: team.id })
                          }
                          descriptionBody="This permanently deletes the team, its members, domains, API keys, emails, campaigns and contacts. This cannot be undone."
                          trigger={
                            <Button variant="destructive" size="sm">
                              Delete
                            </Button>
                          }
                          confirmLabel="Delete team"
                        />
                      )}
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

function EditTeamDialog({ team }: { team: TeamRow }) {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const form = useForm<UpdateInput>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      name: team.name,
      apiRateLimit: team.apiRateLimit,
      dailyEmailLimit: team.dailyEmailLimit,
      isBlocked: team.isBlocked,
      plan: team.plan,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: team.name,
        apiRateLimit: team.apiRateLimit,
        dailyEmailLimit: team.dailyEmailLimit,
        isBlocked: team.isBlocked,
        plan: team.plan,
      });
    }
  }, [open, team, form]);

  const updateTeam = api.admin.updateTeamSettings.useMutation({
    onSuccess: () => {
      utils.admin.listTeams.invalidate();
      toast.success("Team updated");
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to update team settings");
    },
  });

  const onSubmit = (values: UpdateInput) => {
    updateTeam.mutate({ teamId: team.id, ...values });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {team.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={updateTeam.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiRateLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API rate limit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      {...field}
                      value={Number.isNaN(field.value) ? 1 : field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                      disabled={updateTeam.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailyEmailLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily email limit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={10_000_000}
                      {...field}
                      value={Number.isNaN(field.value) ? 0 : field.value}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                      disabled={updateTeam.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={updateTeam.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">Free</SelectItem>
                        <SelectItem value="BASIC">Basic</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isBlocked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blocked</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={updateTeam.isPending}
                      />
                      <span className="text-sm text-muted-foreground">
                        {field.value ? "Team is blocked" : "Team is active"}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateTeam.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTeam.isPending}>
                {updateTeam.isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
