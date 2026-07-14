import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import { prisma } from "../prisma.js";
import { authenticate } from "../auth.js";
import { requireWorkspaceMember } from "../workspace.js";

export function registerNoteGroupRoutes(rootApp: FastifyInstance, io: SocketServer) {
  rootApp.register(async (app) => {
    app.addHook("preHandler", authenticate);
    app.addHook("preHandler", requireWorkspaceMember);

    app.get("/api/note-groups", async (req) => {
      return prisma.noteGroup.findMany({ where: { workspaceId: req.workspaceId! }, orderBy: { order: "asc" } });
    });

    app.post("/api/note-groups", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const body = req.body as { name: string };

      if (!body.name || !body.name.trim()) {
        return reply.code(400).send({ error: "name is required" });
      }

      const maxOrder = await prisma.noteGroup.aggregate({ where: { workspaceId }, _max: { order: true } });
      const group = await prisma.noteGroup.create({
        data: { workspaceId, name: body.name.trim(), order: (maxOrder._max.order ?? 0) + 1 },
      });

      io.to(`workspace:${workspaceId}`).emit("noteGroups:changed", { workspaceId });
      return reply.code(201).send(group);
    });

    app.delete("/api/note-groups/:id", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { id } = req.params as { id: string };
      const existing = await prisma.noteGroup.findFirst({ where: { id, workspaceId } });
      if (!existing) {
        return reply.code(404).send({ error: "note group not found" });
      }
      await prisma.noteGroup.delete({ where: { id } });
      io.to(`workspace:${workspaceId}`).emit("noteGroups:changed", { workspaceId });
      io.to(`workspace:${workspaceId}`).emit("notes:changed", { workspaceId }); // notes in this group lost their groupId
      return reply.code(204).send();
    });
  });
}
