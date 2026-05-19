import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { webhooks, matches } from "@shared/schema";
import { buildDashboard } from "./stats";

export interface WebhookPayload {
  event: "match.finished";
  teamId: string;
  match: {
    id: string;
    opponent: string;
    date: string | null;
    setsWon: number;
    setsLost: number;
    result: "win" | "loss" | "draw";
    competition: string | null;
  };
  kpis: {
    killPct: number;
    sideOutPct: number;
    passRating: number;
    serveAcePct: number;
    attackEfficiency: number;
    record: string;
  };
  sentAt: string; // ISO timestamp
}

export async function fireMatchFinishedWebhooks(
  teamId: string,
  matchId: string,
): Promise<void> {
  const hooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.teamId, teamId), eq(webhooks.enabled, true)));

  if (!hooks.length) return;

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return;

  const dashboard = await buildDashboard(teamId);

  const payload: WebhookPayload = {
    event: "match.finished",
    teamId,
    match: {
      id: match.id,
      opponent: match.opponent,
      date: match.date ? match.date.toISOString() : null,
      setsWon: match.setsWon,
      setsLost: match.setsLost,
      result: match.setsWon > match.setsLost ? "win" : match.setsWon < match.setsLost ? "loss" : "draw",
      competition: match.competition ?? null,
    },
    kpis: dashboard.kpis,
    sentAt: new Date().toISOString(),
  };

  await Promise.allSettled(
    hooks.map((hook) => deliverWebhook(hook, payload)),
  );
}

async function deliverWebhook(
  hook: { id: string; url: string; secret: string | null },
  payload: WebhookPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "VolleyIQ-Webhook/1.0",
    "X-VolleyIQ-Event": payload.event,
  };

  if (hook.secret) {
    const sig = crypto
      .createHmac("sha256", hook.secret)
      .update(body)
      .digest("hex");
    headers["X-VolleyIQ-Signature"] = `sha256=${sig}`;
  }

  let status = 0;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(hook.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    status = res.status;
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (err: any) {
    error = err?.message ?? "unknown error";
  }

  await db
    .update(webhooks)
    .set({ lastFiredAt: new Date(), lastStatus: status || null, lastError: error })
    .where(eq(webhooks.id, hook.id))
    .catch(() => {});
}

export async function testWebhook(
  hook: { id: string; url: string; secret: string | null },
  teamId: string,
): Promise<{ status: number | null; error: string | null }> {
  const payload: WebhookPayload = {
    event: "match.finished",
    teamId,
    match: {
      id: "test-match-id",
      opponent: "Equipa de Teste",
      date: new Date().toISOString(),
      setsWon: 3,
      setsLost: 1,
      result: "win",
      competition: "Teste",
    },
    kpis: {
      killPct: 44.5,
      sideOutPct: 62.1,
      passRating: 2.18,
      serveAcePct: 8.3,
      attackEfficiency: 0.285,
      record: "test",
    },
    sentAt: new Date().toISOString(),
  };

  let status: number | null = null;
  let error: string | null = null;
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "VolleyIQ-Webhook/1.0",
    "X-VolleyIQ-Event": "match.finished",
    "X-VolleyIQ-Test": "true",
  };
  if (hook.secret) {
    const sig = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
    headers["X-VolleyIQ-Signature"] = `sha256=${sig}`;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(hook.url, { method: "POST", headers, body, signal: controller.signal });
    clearTimeout(timeout);
    status = res.status;
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (err: any) {
    error = err?.message ?? "unknown error";
  }
  await db
    .update(webhooks)
    .set({ lastFiredAt: new Date(), lastStatus: status, lastError: error })
    .where(eq(webhooks.id, hook.id))
    .catch(() => {});
  return { status, error };
}
