import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import fastifyStatic from "@fastify/static";
import { parse as parseCookie } from "cookie";
import { Server as SocketServer } from "socket.io";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerTaskRoutes } from "./routes/tasks.js";
import { registerNoteRoutes } from "./routes/notes.js";
import { registerNoteGroupRoutes } from "./routes/noteGroups.js";
import { registerFocusSessionRoutes } from "./routes/focusSessions.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";
import { registerAttachmentRoutes } from "./routes/attachments.js";
import { registerTagRoutes } from "./routes/tags.js";
import { COOKIE_NAME, type JwtPayload } from "./auth.js";
import { prisma } from "./prisma.js";

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? "mochi-dev-secret-change-me";

const app = Fastify({ logger: true });

// The deployed server serves the built web frontend itself (see STATIC_DIR
// below), so browser traffic is same-origin — this stays permissive mainly
// for the Electron desktop client and local tooling, not a real multi-origin
// web deployment.
await app.register(cors, { origin: true, credentials: true });
await app.register(cookie);
await app.register(jwt, { secret: JWT_SECRET });

const io = new SocketServer(app.server, {
  cors: { origin: "*" },
});

io.use((socket, next) => {
  const raw = socket.handshake.headers.cookie;
  const token = raw ? parseCookie(raw)[COOKIE_NAME] : undefined;
  if (!token) return next(new Error("unauthorized"));
  try {
    const payload = app.jwt.verify<JwtPayload>(token);
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", async (socket) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: socket.data.userId },
    select: { workspaceId: true },
  });
  for (const { workspaceId } of memberships) {
    socket.join(`workspace:${workspaceId}`);
  }
  app.log.info(`socket connected: ${socket.id} (user ${socket.data.userId}, ${memberships.length} workspaces)`);

  // Membership snapshot above is only taken once, at connect time — this lets
  // an already-open tab start receiving live updates for a workspace it just
  // created or joined mid-session, without needing a reconnect/refresh.
  socket.on("workspace:join-room", async (workspaceId: string) => {
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: socket.data.userId } },
    });
    if (membership) socket.join(`workspace:${workspaceId}`);
  });
});

registerAuthRoutes(app);
registerTaskRoutes(app, io);
registerNoteRoutes(app, io);
registerNoteGroupRoutes(app, io);
registerFocusSessionRoutes(app, io);
registerWorkspaceRoutes(app, io);
registerAttachmentRoutes(app, io);
registerTagRoutes(app, io);

app.get("/api/health", async () => ({ ok: true }));

// Hit by an external cron every few minutes to stop Render's free-tier
// instance from spinning down after 15 min idle. Touches the database too
// so the Supabase pooler connection doesn't go stale, not just the process.
app.get("/api/keep-alive", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, time: new Date().toISOString() };
});

// Set in production (Render) — serves the built `apps/web/dist` from the same
// origin as the API, so the browser and the Electron desktop app both just
// load this one URL with no CORS/cookie cross-origin complications. Unset in
// local dev, where Vite's own dev server + proxy handles the frontend instead.
if (process.env.STATIC_DIR) {
  // @fastify/static requires an absolute path. Resolve relative to this
  // file's location (repo-root/server/{src in dev, dist in prod}), not
  // process.cwd() — `npm run start -w server` runs with cwd = server/, so a
  // cwd-relative resolve would look for apps/web/dist *inside* server/.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  await app.register(fastifyStatic, { root: path.resolve(repoRoot, process.env.STATIC_DIR) });
}

app.listen({ port: PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
