import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./db";
import {
  teams,
  memberships,
  players,
  matches,
  actions,
  checklistItems,
  type InsertTeam,
  type InsertPlayer,
  type InsertMatch,
  type InsertAction,
} from "@shared/schema";

/**
 * Camada fina de acesso a dados. Cada função respeita `teamId` como
 * fronteira de tenancy — nunca devolve linhas de outra equipa.
 */

const newId = () => nanoid(12);

// ── Teams ────────────────────────────────────────────────────────────────
export async function listTeamsForUser(uid: string) {
  const rows = await db
    .select({ team: teams })
    .from(memberships)
    .innerJoin(teams, eq(memberships.teamId, teams.id))
    .where(eq(memberships.uid, uid));
  return rows.map((r) => r.team);
}

export async function createTeam(uid: string, data: InsertTeam) {
  const id = newId();
  await db.insert(teams).values({ ...data, id, ownerUid: uid });
  await db.insert(memberships).values({
    id: newId(),
    teamId: id,
    uid,
    role: "owner",
  });
  const row = await db.select().from(teams).where(eq(teams.id, id)).get();
  return row!;
}

export async function userBelongsToTeam(uid: string, teamId: string) {
  const row = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.uid, uid), eq(memberships.teamId, teamId)))
    .get();
  return !!row;
}

// ── Players ──────────────────────────────────────────────────────────────
export async function listPlayers(teamId: string) {
  return db.select().from(players).where(eq(players.teamId, teamId));
}

export async function getPlayer(teamId: string, id: string) {
  return db
    .select()
    .from(players)
    .where(and(eq(players.teamId, teamId), eq(players.id, id)))
    .get();
}

export async function createPlayer(data: InsertPlayer) {
  const id = newId();
  await db.insert(players).values({ ...data, id });
  return db.select().from(players).where(eq(players.id, id)).get();
}

// ── Matches ──────────────────────────────────────────────────────────────
export async function listMatches(teamId: string) {
  return db
    .select()
    .from(matches)
    .where(eq(matches.teamId, teamId))
    .orderBy(desc(matches.date));
}

export async function createMatch(data: InsertMatch) {
  const id = newId();
  await db.insert(matches).values({ ...data, id });
  return db.select().from(matches).where(eq(matches.id, id)).get();
}

// ── Actions (Live Scout) ─────────────────────────────────────────────────
export async function listActions(matchId: string) {
  return db
    .select()
    .from(actions)
    .where(eq(actions.matchId, matchId))
    .orderBy(actions.timestamp);
}

export async function createAction(data: InsertAction) {
  const id = newId();
  await db.insert(actions).values({ ...data, id });
  return db.select().from(actions).where(eq(actions.id, id)).get();
}

export async function deleteAction(id: string) {
  await db.delete(actions).where(eq(actions.id, id));
}

// ── Checklist ────────────────────────────────────────────────────────────
export async function listChecklist(matchId: string) {
  return db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.matchId, matchId))
    .orderBy(checklistItems.order);
}

export async function toggleChecklistItem(id: string, done: boolean) {
  await db.update(checklistItems).set({ done }).where(eq(checklistItems.id, id));
}
