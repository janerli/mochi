import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import { prisma } from "../prisma.js";
import { authenticate, generateInviteCode, normalizeInviteCode } from "../auth.js";

export function registerWorkspaceRoutes(rootApp: FastifyInstance, io: SocketServer) {
  rootApp.register(async (app) => {
    app.addHook("preHandler", authenticate);

    app.get("/api/workspaces", async (req) => {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: req.user!.sub },
        include: { workspace: true },
        orderBy: { joinedAt: "asc" },
      });
      return memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        isPersonal: m.workspace.isPersonal,
        inviteCode: m.workspace.inviteCode,
        role: m.role,
      }));
    });

    app.get("/api/workspaces/:id/members", async (req, reply) => {
      const { id } = req.params as { id: string };
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: id, userId: req.user!.sub } },
      });
      if (!membership) return reply.code(403).send({ error: "not a member of this workspace" });

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: id },
        include: { user: { select: { email: true } } },
        orderBy: { joinedAt: "asc" },
      });
      return members.map((m) => ({ email: m.user.email, role: m.role, joinedAt: m.joinedAt }));
    });

    app.post("/api/workspaces", async (req, reply) => {
      const userId = req.user!.sub;
      const body = req.body as { name?: string };
      const name = body.name?.trim();
      if (!name) return reply.code(400).send({ error: "name is required" });

      const workspace = await prisma.workspace.create({
        data: {
          name,
          ownerId: userId,
          inviteCode: generateInviteCode(),
          members: { create: { userId, role: "owner" } },
        },
      });

      return reply.code(201).send({
        id: workspace.id,
        name: workspace.name,
        isPersonal: workspace.isPersonal,
        inviteCode: workspace.inviteCode,
        role: "owner",
      });
    });

    app.post("/api/workspaces/join", async (req, reply) => {
      const userId = req.user!.sub;
      const body = req.body as { inviteCode?: string };
      if (!body.inviteCode) return reply.code(400).send({ error: "inviteCode is required" });

      const workspace = await prisma.workspace.findUnique({
        where: { inviteCode: normalizeInviteCode(body.inviteCode) },
      });
      if (!workspace) return reply.code(404).send({ error: "неверный код приглашения" });

      const existing = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
      });
      if (existing) {
        return reply.code(409).send({ error: "ты уже в этом workspace" });
      }

      await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId, role: "member" } });

      return reply.code(201).send({
        id: workspace.id,
        name: workspace.name,
        isPersonal: workspace.isPersonal,
        inviteCode: workspace.inviteCode,
        role: "member",
      });
    });

    app.post("/api/workspaces/:id/rename", async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as { name?: string };
      const name = body.name?.trim();
      if (!name) return reply.code(400).send({ error: "name is required" });

      const workspace = await prisma.workspace.findUnique({ where: { id } });
      if (!workspace || workspace.ownerId !== req.user!.sub) {
        return reply.code(403).send({ error: "только владелец может переименовать workspace" });
      }

      const updated = await prisma.workspace.update({ where: { id }, data: { name } });
      io.to(`workspace:${id}`).emit("workspaces:changed");
      return { id: updated.id, name: updated.name };
    });

    app.post("/api/workspaces/:id/regenerate-invite", async (req, reply) => {
      const { id } = req.params as { id: string };
      const workspace = await prisma.workspace.findUnique({ where: { id } });
      if (!workspace || workspace.ownerId !== req.user!.sub) {
        return reply.code(403).send({ error: "только владелец может перевыпустить код" });
      }

      const inviteCode = generateInviteCode();
      await prisma.workspace.update({ where: { id }, data: { inviteCode } });
      return { inviteCode };
    });

    app.post("/api/workspaces/:id/leave", async (req, reply) => {
      const { id } = req.params as { id: string };
      const userId = req.user!.sub;
      const workspace = await prisma.workspace.findUnique({ where: { id } });
      if (!workspace) return reply.code(404).send({ error: "workspace not found" });
      if (workspace.ownerId === userId) {
        return reply.code(400).send({ error: "владелец не может покинуть свой workspace — удали его вместо этого" });
      }

      await prisma.workspaceMember.deleteMany({ where: { workspaceId: id, userId } });
      return reply.code(204).send();
    });

    app.delete("/api/workspaces/:id", async (req, reply) => {
      const { id } = req.params as { id: string };
      const workspace = await prisma.workspace.findUnique({ where: { id } });
      if (!workspace || workspace.ownerId !== req.user!.sub) {
        return reply.code(403).send({ error: "только владелец может удалить workspace" });
      }
      if (workspace.isPersonal) {
        return reply.code(400).send({ error: "личный workspace нельзя удалить" });
      }

      await prisma.workspace.delete({ where: { id } });
      io.to(`workspace:${id}`).emit("workspaces:changed");
      return reply.code(204).send();
    });
  });
}
