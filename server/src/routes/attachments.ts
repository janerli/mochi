import crypto from "node:crypto";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import multipart from "@fastify/multipart";
import { prisma } from "../prisma.js";
import { authenticate } from "../auth.js";
import { requireWorkspaceMember } from "../workspace.js";
import { uploadFile, downloadFile, deleteFile } from "../storage.js";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function registerAttachmentRoutes(rootApp: FastifyInstance, io: SocketServer) {
  rootApp.register(async (app) => {
    await app.register(multipart, { limits: { fileSize: MAX_FILE_SIZE } });

    app.addHook("preHandler", authenticate);
    app.addHook("preHandler", requireWorkspaceMember);

    app.get("/api/tasks/:taskId/attachments", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { taskId } = req.params as { taskId: string };

      const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId } });
      if (!task) {
        return reply.code(404).send({ error: "task not found" });
      }

      return prisma.attachment.findMany({ where: { taskId }, orderBy: { createdAt: "asc" } });
    });

    app.post("/api/tasks/:taskId/attachments", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { taskId } = req.params as { taskId: string };

      const task = await prisma.task.findFirst({ where: { id: taskId, workspaceId } });
      if (!task) {
        return reply.code(404).send({ error: "task not found" });
      }

      const data = await req.file();
      if (!data) {
        return reply.code(400).send({ error: "no file uploaded" });
      }

      const buffer = await data.toBuffer();
      if (data.file.truncated) {
        return reply.code(413).send({ error: `file exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` });
      }

      const ext = path.extname(data.filename);
      const storagePath = `${workspaceId}/${taskId}/${crypto.randomUUID()}${ext}`;

      try {
        await uploadFile(storagePath, buffer, data.mimetype);
      } catch (err) {
        req.log.error(err, "failed to upload attachment to Supabase Storage");
        return reply.code(500).send({ error: "failed to save file" });
      }

      const attachment = await prisma.attachment.create({
        data: {
          filename: data.filename,
          storagePath,
          size: buffer.length,
          mimeType: data.mimetype,
          taskId,
        },
      });

      io.to(`workspace:${workspaceId}`).emit("attachments:changed", { workspaceId, taskId });
      return reply.code(201).send(attachment);
    });

    app.delete("/api/attachments/:id", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { id } = req.params as { id: string };

      const attachment = await prisma.attachment.findFirst({
        where: { id, task: { workspaceId } },
      });
      if (!attachment) {
        return reply.code(404).send({ error: "attachment not found" });
      }

      try {
        await deleteFile(attachment.storagePath);
      } catch (err) {
        req.log.warn(err, "failed to delete attachment from storage (continuing to delete DB row)");
      }

      await prisma.attachment.delete({ where: { id } });

      io.to(`workspace:${workspaceId}`).emit("attachments:changed", { workspaceId, taskId: attachment.taskId });
      return reply.code(204).send();
    });

    app.get("/api/attachments/:id/download", async (req, reply) => {
      const workspaceId = req.workspaceId!;
      const { id } = req.params as { id: string };

      const attachment = await prisma.attachment.findFirst({
        where: { id, task: { workspaceId } },
      });
      if (!attachment) {
        return reply.code(404).send({ error: "attachment not found" });
      }

      let buffer: Buffer;
      try {
        buffer = await downloadFile(attachment.storagePath);
      } catch (err) {
        req.log.error(err, "failed to download attachment from Supabase Storage");
        return reply.code(404).send({ error: "file missing in storage" });
      }

      reply.header("Content-Type", attachment.mimeType);
      reply.header("Content-Disposition", `attachment; filename="${attachment.filename.replace(/"/g, "")}"`);
      return reply.send(buffer);
    });
  });
}
