import { createRoute, z } from "@hono/zod-openapi";
import { PublicAPIApp } from "~/server/public-api/hono";
import { workspaceLookupResponseSchema } from "~/server/public-api/schemas/workspace-schema";
import { requireAdminApiKey } from "./admin-auth";
import { db } from "~/server/db";
import { UnsendApiError } from "~/server/public-api/api-error";

const route = createRoute({
  method: "get",
  path: "/v1/workspaces/{externalId}",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      externalId: z.string().openapi({
        example: "1327681267",
        description: "The client-hub repo_id the workspace maps to.",
      }),
    }),
  },
  responses: {
    200: {
      description:
        "Look up a workspace by externalId (client-hub repo_id). Authenticated with the instance admin key. Does not return an API key.",
      content: {
        "application/json": {
          schema: workspaceLookupResponseSchema,
        },
      },
    },
  },
});

function getWorkspace(app: PublicAPIApp) {
  app.openapi(route, async (c) => {
    requireAdminApiKey(c);
    const { externalId } = c.req.valid("param");

    const team = await db.team.findUnique({ where: { externalId } });
    if (!team || !team.externalId) {
      throw new UnsendApiError({
        code: "NOT_FOUND",
        message: "Workspace not found",
      });
    }

    return c.json({
      teamId: team.id,
      externalId: team.externalId,
      name: team.name,
    });
  });
}

export default getWorkspace;
