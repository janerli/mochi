import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import { prisma } from "../prisma.js";
import { authenticate } from "../auth.js";
import { requireWorkspaceMember } from "../workspace.js";

function nextOccurrence(from: Date, recurrence: string): Date {
  const next = new Date(from);
  if (recurrence === "daily") next.setDate(next.getDate() + 1);
  else if (recurrence === "weekly") next.setDate(next.getDate() + 7);
  else if (recurrence === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

export function registerTaskRoutes(rootApp: FastifyInstance, io: SocketServer) {
  rootApp.register(async (app) => {
    app.addHook("preHandler", authenticate);
    app.addHook("preHandler", requireWorkspaceMember);

    app.get("/api/tasks", async (req) => {
      const tasks = await prisma.task.findMany({
        where: { workspaceId: req.workspaceId! },
        orderBy: { order: "asc" },
        include: { _count: { select: { attachments: true } } },
      });
      return tasks.map(({ _count, ...task }) => ({ ...task, attachmentCount: _count.attachments }));
    });

    app.post("/api/tasks", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const body = req.body as {
        title: string;
        description?: string;
        status?: string;
        priority?: string;
        dueDate?: string;
        tag?: string;
        recurrence?: string;
        estimateMinutes?: number | null;
        reminderMinutesBefore?: number | null;
      };

      if (!body.title || !body.title.trim()) {
        return reply.code(400).send({ error: "title is required" });
      }

      const maxOrder = await prisma.task.aggregate({
        where: { workspaceId, status: body.status ?? "todo" },
        _max: { order: true },
      });

      const task = await prisma.task.create({
        data: {
          workspaceId,
          title: body.title.trim(),
          description: body.description,
          status: body.status ?? "todo",
          priority: body.priority ?? "medium",
          dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
          tag: body.tag,
          recurrence: body.recurrence ?? "none",
          estimateMinutes: body.estimateMinutes ?? undefined,
          reminderMinutesBefore: body.reminderMinutesBefore ?? undefined,
          order: (maxOrder._max.order ?? 0) + 1,
        },
      });

      io.to(`workspace:${workspaceId}`).emit("tasks:changed", { workspaceId });
      return reply.code(201).send(task);
    });

    app.patch("/api/tasks/:id", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { id } = req.params as { id: string };
      const body = req.body as Partial<{
        title: string;
        description: string;
        status: string;
        priority: string;
        dueDate: string | null;
        tag: string;
        order: number;
        recurrence: string;
        estimateMinutes: number | null;
        reminderMinutesBefore: number | null;
      }>;

      const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
      if (!existing) {
        return reply.code(404).send({ error: "task not found" });
      }

      const task = await prisma.task.update({
        where: { id },
        data: {
          ...body,
          dueDate:
            body.dueDate === undefined
              ? undefined
              : body.dueDate === null
                ? null
                : new Date(body.dueDate),
        },
      });

      // completing a recurring task spawns its next occurrence
      const justCompleted = body.status === "done" && existing.status !== "done";
      if (justCompleted && task.recurrence !== "none") {
        const base = existing.dueDate ?? new Date();
        const maxOrder = await prisma.task.aggregate({
          where: { workspaceId, status: "todo" },
          _max: { order: true },
        });
        await prisma.task.create({
          data: {
            workspaceId,
            title: task.title,
            description: task.description,
            status: "todo",
            priority: task.priority,
            dueDate: nextOccurrence(base, task.recurrence),
            tag: task.tag,
            recurrence: task.recurrence,
            estimateMinutes: task.estimateMinutes,
            reminderMinutesBefore: task.reminderMinutesBefore,
            order: (maxOrder._max.order ?? 0) + 1,
          },
        });
      }

      io.to(`workspace:${workspaceId}`).emit("tasks:changed", { workspaceId });
      return task;
    });

    app.delete("/api/tasks/:id", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { id } = req.params as { id: string };
      const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
      if (!existing) {
        return reply.code(404).send({ error: "task not found" });
      }
      await prisma.task.delete({ where: { id } });
      io.to(`workspace:${workspaceId}`).emit("tasks:changed", { workspaceId });
      io.to(`workspace:${workspaceId}`).emit("notes:changed", { workspaceId }); // linked notes may have lost their taskId
      return reply.code(204).send();
    });
  });
}
