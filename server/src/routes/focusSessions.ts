import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import { prisma } from "../prisma.js";
import { authenticate } from "../auth.js";

export function registerFocusSessionRoutes(rootApp: FastifyInstance, io: SocketServer) {
  rootApp.register(async (app) => {
    app.addHook("preHandler", authenticate);

    app.get("/api/focus-sessions", async (req) => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      return prisma.focusSession.findMany({
        where: { userId: req.user!.sub, completedAt: { gte: since } },
        orderBy: { completedAt: "desc" },
      });
    });

    app.post("/api/focus-sessions", async (req, reply) => {
      const userId = req.user!.sub;
      const body = req.body as { durationMinutes: number };

      if (!body.durationMinutes || body.durationMinutes <= 0) {
        return reply.code(400).send({ error: "durationMinutes is required" });
      }

      const session = await prisma.focusSession.create({
        data: { userId, durationMinutes: body.durationMinutes },
      });

      io.to(`user:${userId}`).emit("focusSessions:changed");
      return reply.code(201).send(session);
    });
  });
}
