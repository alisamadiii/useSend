import { z } from "@hono/zod-openapi";

export const workspaceCreateSchema = z.object({
  name: z.string().min(1),
  externalId: z
    .union([z.string().min(1), z.number()])
    .transform((v) => String(v))
    .openapi({
      example: "1327681267",
      description: "The client-hub repo_id this workspace maps to (string or number).",
    }),
  apiKeyName: z.string().min(1).optional(),
  permission: z.enum(["FULL", "SENDING"]).optional(),
});

export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>;

export const workspaceResponseSchema = z.object({
  teamId: z.number(),
  externalId: z.string(),
  name: z.string(),
  apiKey: z.string(),
});

export const workspaceLookupResponseSchema = z.object({
  teamId: z.number(),
  externalId: z.string(),
  name: z.string(),
});
