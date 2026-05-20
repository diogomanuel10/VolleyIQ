import webpush from "web-push";
import { eq, and, lt, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { pushSubscriptions, matches, teams } from "@shared/schema";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:info@volleyiq.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export { VAPID_PUBLIC };

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

async function sendToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string; id: string },
  payload: PushPayload,
): Promise<boolean> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (err: any) {
    // 410 Gone or 404 = subscription expired, remove it
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    }
    return false;
  }
}

async function sendToUid(uid: string, payload: PushPayload) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.uid, uid));
  await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));
}

// ── Pre-match reminders ──────────────────────────────────────────────────
// Called once per day. Finds matches starting in the next 22–26h window
// and notifies the team owner.
export async function sendPrematchReminders() {
  const now = new Date();
  const from = new Date(now.getTime() + 22 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  const upcoming = await db
    .select({ match: matches, team: teams })
    .from(matches)
    .innerJoin(teams, eq(matches.teamId, teams.id))
    .where(
      and(
        eq(matches.status, "scheduled"),
        gte(matches.date, from),
        lte(matches.date, to),
      ),
    );

  for (const { match, team } of upcoming) {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.teamId, team.id));

    const time = new Date(match.date).toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const payload: PushPayload = {
      title: `🏐 Jogo amanhã às ${time}`,
      body: `${team.name} vs ${match.opponent}${match.competition ? ` · ${match.competition}` : ""}`,
      tag: `prematch-${match.id}`,
      url: `/#/scout/${match.id}`,
    };

    await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));
  }
}

// ── Analysis ready ───────────────────────────────────────────────────────
// Called when a match transitions to "finished" and has actions recorded.
export async function sendAnalysisReadyNotification(
  matchId: string,
  teamId: string,
  opponentName: string,
) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.teamId, teamId));

  const payload: PushPayload = {
    title: "📊 Análise pronta",
    body: `O relatório pós-jogo vs ${opponentName} está disponível.`,
    tag: `analysis-${matchId}`,
    url: `/#/post-match/${matchId}`,
  };

  await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));
}

// ── Registration reminder ────────────────────────────────────────────────
// Called once per week. Finds teams with no matches in the last 14 days.
export async function sendRegistrationReminders() {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Get all team IDs that have a recent match
  const recentMatches = await db
    .select({ teamId: matches.teamId })
    .from(matches)
    .where(gte(matches.date, cutoff));

  const activeTeamIds = new Set(recentMatches.map((m) => m.teamId));

  // Find subscriptions for teams with no recent activity
  const allSubs = await db.select().from(pushSubscriptions);
  const inactiveSubs = allSubs.filter(
    (s) => s.teamId && !activeTeamIds.has(s.teamId),
  );

  const payload: PushPayload = {
    title: "📋 Sem actividade recente",
    body: "Tens jogos por registar? Entra no VolleyIQ e mantém as estatísticas em dia.",
    tag: "registration-reminder",
    url: "/#/matches",
  };

  await Promise.allSettled(
    inactiveSubs.map((s) => sendToSubscription(s, payload)),
  );
}
