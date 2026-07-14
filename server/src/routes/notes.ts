import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import { prisma } from "../prisma.js";
import { authenticate } from "../auth.js";
import { requireWorkspaceMember } from "../workspace.js";

export function registerNoteRoutes(rootApp: FastifyInstance, io: SocketServer) {
  rootApp.register(async (app) => {
    app.addHook("preHandler", authenticate);
    app.addHook("preHandler", requireWorkspaceMember);

    app.get("/api/notes", async (req) => {
      return prisma.note.findMany({
        where: { workspaceId: req.workspaceId! },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      });
    });

    app.post("/api/notes", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const body = req.body as {
        kind?: string;
        title: string;
        content?: string;
        color?: string;
        taskId?: string | null;
        groupId?: string | null;
        pinned?: boolean;
      };

      if (!body.title || !body.title.trim()) {
        return reply.code(400).send({ error: "title is required" });
      }

      if (body.taskId) {
        const task = await prisma.task.findFirst({ where: { id: body.taskId, workspaceId } });
        if (!task) return reply.code(400).send({ error: "linked task not found" });
      }
      if (body.groupId) {
        const group = await prisma.noteGroup.findFirst({ where: { id: body.groupId, workspaceId } });
        if (!group) return reply.code(400).send({ error: "note group not found" });
      }

      const note = await prisma.note.create({
        data: {
          workspaceId,
          kind: body.kind === "big" ? "big" : "quick",
          title: body.title.trim(),
          content: body.content ?? "",
          color: body.color ?? "pink",
          taskId: body.taskId ?? undefined,
          groupId: body.groupId ?? undefined,
          pinned: body.pinned ?? false,
        },
      });

      io.to(`workspace:${workspaceId}`).emit("notes:changed", { workspaceId });
      return reply.code(201).send(note);
    });

    app.patch("/api/notes/:id", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { id } = req.params as { id: string };
      const body = req.body as Partial<{
        title: string;
        content: string;
        color: string;
        taskId: string | null;
        groupId: string | null;
        pinned: boolean;
      }>;

      const existing = await prisma.note.findFirst({ where: { id, workspaceId } });
      if (!existing) {
        return reply.code(404).send({ error: "note not found" });
      }

      const note = await prisma.note.update({
        where: { id },
        data: body,
      });

      io.to(`workspace:${workspaceId}`).emit("notes:changed", { workspaceId });
      return note;
    });

    app.delete("/api/notes/:id", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { id } = req.params as { id: string };
      const existing = await prisma.note.findFirst({ where: { id, workspaceId } });
      if (!existing) {
        return reply.code(404).send({ error: "note not found" });
      }
      await prisma.note.delete({ where: { id } });
      io.to(`workspace:${workspaceId}`).emit("notes:changed", { workspaceId });
      return reply.code(204).send();
    });
  });
}
