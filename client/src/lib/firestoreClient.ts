import { getApps, initializeApp } from "firebase/app";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  type Firestore,
} from "firebase/firestore";

/**
 * Subscrição Firestore do lado do cliente. Usado pela Segunda-Écran para ver
 * acções em tempo real quando o mirror server-side está ligado.
 *
 * Fica opcional: se o projecto Firebase não estiver configurado no cliente,
 * `subscribeMatchActions` devolve null e a página cai em polling.
 */

let firestore: Firestore | null = null;
let attempted = false;

function getClient(): Firestore | null {
  if (attempted) return firestore;
  attempted = true;
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  if (!cfg.projectId) return null;
  try {
    const app = getApps()[0] ?? initializeApp(cfg);
    firestore = getFirestore(app);
    return firestore;
  } catch {
    return null;
  }
}

export interface MirroredAction {
  id: string;
  matchId: string;
  playerId?: string | null;
  type: string;
  result: string;
  zoneTo?: number | null;
  rallyId?: string | null;
  rotation?: number | null;
  videoTimeSec?: number | null;
  timestamp?: string | null;
}

export function subscribeMatchActions(
  matchId: string,
  cb: (actions: MirroredAction[]) => void,
): (() => void) | null {
  const db = getClient();
  if (!db) return null;
  const q = query(
    collection(db, "matches", matchId, "actions"),
    orderBy("timestamp"),
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => d.data() as MirroredAction));
    },
    () => {
      // em caso de erro (regras, rede), a página continua a funcionar via polling
    },
  );
}
