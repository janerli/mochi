import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export const WORKSPACE_HEADER = "x-workspace-id";

// Runs after `authenticate` — reads the active workspace from a header (the
// frontend attaches it to every workspace-scoped request) and confirms the
// signed-in user is actually a member before letting the route touch its data.
export async function requireWorkspaceMember(req: FastifyRequest, reply: FastifyReply) {
  const workspaceId = req.headers[WORKSPACE_HEADER];
  if (!workspaceId || typeof workspaceId !== "string") {
    return reply.code(400).send({ error: "missing workspace" });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user!.sub } },
  });
  if (!membership) {
    return reply.code(403).send({ error: "not a member of this workspace" });
  }

  req.workspaceId = workspaceId;
}
