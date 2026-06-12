import type { Request, Response, NextFunction } from "express";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export interface AuthedUser {
  uid: string;
  email?: string;
  name?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

const DEV_BYPASS = process.env.DEV_AUTH_BYPASS === "true";

function getFirebaseAdmin() {
  if (getApps().length) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return; // em dev sem credencial, ficamos sem admin e caímos no bypass
  initializeApp({ credential: cert(JSON.parse(json)) });
}

/**
 * Verifica o Firebase ID token enviado em `Authorization: Bearer <token>`.
 * Em modo dev (`DEV_AUTH_BYPASS=true`) injeta um utilizador de teste para
 * desbloquear o desenvolvimento local sem um projecto Firebase configurado.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (DEV_BYPASS) {
    req.user = {
      uid: "dev-user",
      email: "dev@volleyiq.local",
      name: "Dev User",
    };
    next();
    return;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  try {
    getFirebaseAdmin();
    const decoded = await getAuth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Apaga o utilizador no Firebase Auth. Best-effort: em modo de bypass/dev sem
 * credencial admin, não há nada a apagar e a função resolve silenciosamente.
 */
export async function deleteAuthUser(uid: string): Promise<void> {
  if (DEV_BYPASS) return;
  try {
    getFirebaseAdmin();
    if (!getApps().length) return;
    await getAuth().deleteUser(uid);
  } catch (err) {
    console.error("[auth] deleteAuthUser failed:", err);
  }
}
