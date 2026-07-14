import type { FastifyReply, FastifyRequest } from "fastify";
import { randomInt } from "node:crypto";

export const COOKIE_NAME = "mochi_token";

// Crockford-ish alphabet with ambiguous characters (0/O, 1/I/L) removed —
// this is meant to be hand-typed by a human recovering their account.
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRecoveryCode(): string {
  const groups = Array.from({ length: 4 }, () =>
    Array.from({ length: 5 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join(""),
  );
  return groups.join("-");
}

export function normalizeRecoveryCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

// Workspace invite codes are meant to be shared casually (chat, in person) and
// stay valid until regenerated — shorter than a recovery code on purpose.
export function generateInviteCode(): string {
  const groups = Array.from({ length: 2 }, () =>
    Array.from({ length: 4 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join(""),
  );
  return groups.join("-");
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export interface JwtPayload {
  sub: string;
  email: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    workspaceId?: string;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return reply.code(401).send({ error: "not authenticated" });
  }
  try {
    const payload = req.server.jwt.verify<JwtPayload>(token);
    req.user = payload;
  } catch {
    return reply.code(401).send({ error: "invalid session" });
  }
}
