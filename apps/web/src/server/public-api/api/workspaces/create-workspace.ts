import { createRoute } from "@hono/zod-openapi";
import { Prisma } from "@prisma/client";
import { PublicAPIApp } from "~/server/public-api/hono";
import {
  workspaceCreateSchema,
  workspaceResponseSchema,
} from "~/server/public-api/schemas/workspace-schema";
import { requireAdminApiKey } from "./admin-auth";
import { TeamService } from "~/server/service/team-service";
import { addApiKey } from "~/server/service/api-service";
import { UnsendApiError } from "~/server/public-api/api-error";

const route = createRoute({
  method: "post",
  path: "/v1/workspaces",
  security: [{ Bearer: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: workspaceCreateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "Create a workspace (team) and return a per-team API key. Authenticated with the instance admin key (USESEND_ADMIN_API_KEY), not a team token.",
      content: {
        "application/json": {
          schema: workspaceResponseSchema,
        },
      },
    },
  },
});

function createWorkspace(app: PublicAPIApp) {
  app.openapi(route, async (c) => {
    requireAdminApiKey(c);
    const body = c.req.valid("json");
    const permission = body.permission ?? "FULL";

    try {
      const team = await TeamService.createTeamForExternal({
        name: body.name,
        externalId: body.externalId,
      });

      const apiKey = await addApiKey({
        name: body.apiKeyName ?? "client-hub",
        permission,
        teamId: team.id,
      });

      return c.json({
        teamId: team.id,
        externalId: body.externalId,
        name: team.name,
        apiKey,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new UnsendApiError({
          code: "NOT_UNIQUE",
          message: "A workspace already exists for this externalId",
        });
      }
      throw error;
    }
  });
}

export default createWorkspace;
