import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { authenticate, COOKIE_NAME, generateRecoveryCode, normalizeRecoveryCode, generateInviteCode } from "../auth.js";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  // Render serves everything over HTTPS; local dev is plain http://localhost,
  // where a `secure` cookie would just silently never get sent.
  secure: process.env.NODE_ENV === "production",
};

export function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password || password.length < 6) {
      return reply.code(400).send({ error: "email и пароль от 6 символов обязательны" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "аккаунт с такой почтой уже есть" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const recoveryCode = generateRecoveryCode();
    const recoveryCodeHash = await bcrypt.hash(recoveryCode, 10);
    const user = await prisma.user.create({ data: { email, passwordHash, recoveryCodeHash } });

    // Every account gets a private workspace to start in — "shared" ones are
    // created or joined later, this one always exists and can't be deleted.
    await prisma.workspace.create({
      data: {
        name: "Личное",
        isPersonal: true,
        ownerId: user.id,
        inviteCode: generateInviteCode(),
        members: { create: { userId: user.id, role: "owner" } },
      },
    });

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    reply.setCookie(COOKIE_NAME, token, COOKIE_OPTS);
    return reply.code(201).send({ id: user.id, email: user.email, recoveryCode });
  });

  app.post("/api/auth/login", async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return reply.code(400).send({ error: "email и пароль обязательны" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.code(401).send({ error: "неверная почта или пароль" });
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    reply.setCookie(COOKIE_NAME, token, COOKIE_OPTS);
    return { id: user.id, email: user.email };
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return reply.code(204).send();
  });

  app.get("/api/auth/me", { preHandler: authenticate }, async (req) => {
    return { id: req.user!.sub, email: req.user!.email };
  });

  // Forgot-password flow — no email involved: the one-time recovery code
  // shown at registration (and rotated on every use) stands in for it.
  app.post("/api/auth/reset-password", async (req, reply) => {
    const body = req.body as { email?: string; recoveryCode?: string; newPassword?: string };
    const email = body.email?.trim().toLowerCase();
    const recoveryCode = body.recoveryCode ? normalizeRecoveryCode(body.recoveryCode) : undefined;
    const newPassword = body.newPassword;

    if (!email || !recoveryCode || !newPassword || newPassword.length < 6) {
      return reply.code(400).send({ error: "почта, код восстановления и новый пароль (от 6 символов) обязательны" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.recoveryCodeHash || !(await bcrypt.compare(recoveryCode, user.recoveryCodeHash))) {
      return reply.code(401).send({ error: "неверная почта или код восстановления" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const nextRecoveryCode = generateRecoveryCode();
    const recoveryCodeHash = await bcrypt.hash(nextRecoveryCode, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash, recoveryCodeHash } });

    const token = app.jwt.sign({ sub: user.id, email: user.email });
    reply.setCookie(COOKIE_NAME, token, COOKIE_OPTS);
    return { id: user.id, email: user.email, recoveryCode: nextRecoveryCode };
  });

  app.post("/api/auth/change-password", { preHandler: authenticate }, async (req, reply) => {
    const body = req.body as { currentPassword?: string; newPassword?: string };
    if (!body.currentPassword || !body.newPassword || body.newPassword.length < 6) {
      return reply.code(400).send({ error: "текущий и новый пароль (от 6 символов) обязательны" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      return reply.code(401).send({ error: "неверный текущий пароль" });
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return reply.code(204).send();
  });

  app.post("/api/auth/regenerate-recovery-code", { preHandler: authenticate }, async (req, reply) => {
    const body = req.body as { password?: string };
    if (!body.password) {
      return reply.code(400).send({ error: "пароль обязателен" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "неверный пароль" });
    }

    const recoveryCode = generateRecoveryCode();
    const recoveryCodeHash = await bcrypt.hash(recoveryCode, 10);
    await prisma.user.update({ where: { id: user.id }, data: { recoveryCodeHash } });
    return { recoveryCode };
  });
}
