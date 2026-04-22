import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Mirror opcional de `actions` e `checklist_items` para Firestore, para que
 * um segundo dispositivo (tablet no banco) possa subscrever em tempo real.
 *
 * O mirror está desligado por omissão — só arranca quando
 * `FIRESTORE_MIRROR=true` e existe credencial Firebase disponível. Quando
 * desactivado, todas as funções no-op, por isso o código chamador pode
 * chamá-las sempre sem guardas.
 */

const ENABLED = process.env.FIRESTORE_MIRROR === "true";

let firestore: Firestore | null = null;
let initFailed = false;

function getClient(): Firestore | null {
  if (!ENABLED || initFailed) return null;
  if (firestore) return firestore;
  try {
    if (!getApps().length) {
      const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (json) {
        initializeApp({ credential: cert(JSON.parse(json)) });
      } else {
        // GOOGLE_APPLICATION_CREDENTIALS ou ADC
        initializeApp({ credential: applicationDefault() });
      }
    }
    firestore = getFirestore();
    return firestore;
  } catch (err) {
    console.warn("[firestore] mirror desligado — init falhou:", err);
    initFailed = true;
    return null;
  }
}

function safe<T extends unknown[]>(fn: (...args: T) => Promise<unknown>) {
  return async (...args: T) => {
    const db = getClient();
    if (!db) return;
    try {
      await fn(...args);
    } catch (err) {
      // Mirror é best-effort — o SQLite continua a ser a source of truth.
      console.warn("[firestore] write falhou:", err);
    }
  };
}

export const mirrorAction = safe(async (action: any) => {
  const db = getClient()!;
  await db
    .collection("matches")
    .doc(action.matchId)
    .collection("actions")
    .doc(action.id)
    .set({
      ...action,
      timestamp: action.timestamp?.toISOString?.() ?? action.timestamp ?? null,
    });
});

export const mirrorDeleteAction = safe(
  async (matchId: string, actionId: string) => {
    const db = getClient()!;
    await db
      .collection("matches")
      .doc(matchId)
      .collection("actions")
      .doc(actionId)
      .delete();
  },
);

export const mirrorChecklistItem = safe(async (item: any) => {
  const db = getClient()!;
  await db
    .collection("matches")
    .doc(item.matchId)
    .collection("checklist")
    .doc(item.id)
    .set(item);
});

export function mirrorStatus() {
  return { enabled: ENABLED, ready: !!firestore, initFailed };
}
