import { Router } from "express";
import { requireAuth } from "./middleware/auth";
import * as storage from "./storage";
import { z } from "zod";
import { PLANS } from "@shared/types";

export const adminRouter = Router();

const ADMIN_UIDS = (process.env.ADMIN_UIDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAdmin(uid: string): boolean {
  return ADMIN_UIDS.length === 0 || ADMIN_UIDS.includes(uid);
}

function requireAdmin(req: any, res: any, next: any) {
  const uid = req.user?.uid;
  if (!uid || !isAdmin(uid)) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

// /me — só requer auth, devolve o UID e se é admin (útil para debug)
adminRouter.get("/me", requireAuth, (req: any, res) => {
  const uid = req.user?.uid ?? null;
  res.json({ uid, admin: uid ? isAdmin(uid) : false });
});

// Todas as rotas abaixo requerem auth + ser admin
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/teams", async (_req, res) => {
  const rows = await storage.listAllTeams();
  res.json(rows);
});

const patchTeamSchema = z.object({
  plan: z.enum(PLANS).optional(),
  subscribed: z.boolean().optional(),
  extendTrial: z.number().int().min(1).max(365).optional(),
});

adminRouter.patch("/teams/:id", async (req, res) => {
  const parsed = patchTeamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { plan, subscribed, extendTrial } = parsed.data;
  const update: Record<string, any> = {};

  if (plan !== undefined) update.plan = plan;

  if (subscribed === true) {
    update.subscribedAt = new Date();
  } else if (subscribed === false) {
    update.subscribedAt = null;
    update.easyPaySubscriptionId = null;
  }

  if (extendTrial !== undefined) {
    const base = new Date();
    base.setDate(base.getDate() + extendTrial);
    update.trialEndsAt = base;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: "no_changes" });
  }

  const team = await storage.adminUpdateTeam(req.params.id, update);
  if (!team) return res.status(404).json({ error: "not_found" });
  res.json(team);
});
