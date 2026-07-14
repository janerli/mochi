import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import { prisma } from "../prisma.js";
import { authenticate } from "../auth.js";
import { requireWorkspaceMember } from "../workspace.js";

export function registerTagRoutes(rootApp: FastifyInstance, io: SocketServer) {
  rootApp.register(async (app) => {
    app.addHook("preHandler", authenticate);
    app.addHook("preHandler", requireWorkspaceMember);

    app.get("/api/tags", async (req) => {
      const workspaceId = req.workspaceId!;
      const grouped = await prisma.task.groupBy({
        by: ["tag"],
        where: { workspaceId, tag: { not: null } },
        _count: { tag: true },
      });

      return grouped
        .map((g) => ({ tag: g.tag as string, count: g._count.tag }))
        .sort((a, b) => a.tag.localeCompare(b.tag));
    });

    app.post("/api/tags/rename", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const body = req.body as { from?: string; to?: string };

      if (!body.from || !body.from.trim() || !body.to || !body.to.trim()) {
        return reply.code(400).send({ error: "from and to are required" });
      }

      const result = await prisma.task.updateMany({
        where: { workspaceId, tag: body.from },
        data: { tag: body.to.trim() },
      });

      io.to(`workspace:${workspaceId}`).emit("tasks:changed", { workspaceId });
      return { updated: result.count };
    });

    app.post("/api/tags/delete", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const body = req.body as { tag?: string };

      if (!body.tag || !body.tag.trim()) {
        return reply.code(400).send({ error: "tag is required" });
      }

      const result = await prisma.task.updateMany({
        where: { workspaceId, tag: body.tag },
        data: { tag: null },
      });

      io.to(`workspace:${workspaceId}`).emit("tasks:changed", { workspaceId });
      return { updated: result.count };
    });
  });
}
