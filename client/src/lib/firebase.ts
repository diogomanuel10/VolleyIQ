import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

const USE_DEV = import.meta.env.VITE_USE_DEV_AUTH === "true";

interface DevUser {
  uid: string;
  email: string;
  displayName: string;
}

export type AppUser = User | DevUser;

const DEV_USER: DevUser = {
  uid: "dev-user",
  email: "dev@volleyiq.local",
  displayName: "Dev User",
};

let app: FirebaseApp | null = null;

function getApp() {
  if (app || USE_DEV) return app;
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  app = initializeApp(cfg);
  return app;
}

function isFirebaseUser(user: AppUser | null): user is User {
  return !!user && "getIdToken" in user;
}

function waitForAuthState(): Promise<User | null> {
  return new Promise((resolve) => {
    getApp();
    const unsub = onAuthStateChanged(getAuth(), (user) => {
      unsub();
      resolve(user);
    });
  });
}

export function subscribeAuth(cb: (user: AppUser | null) => void) {
  if (USE_DEV) {
    const stored = localStorage.getItem("volleyiq:dev-auth");
    cb(stored === "out" ? null : DEV_USER);
    return () => {};
  }

  getApp();
  return onAuthStateChanged(getAuth(), cb);
}

export async function loginEmail(email: string, password: string) {
  if (USE_DEV) {
    localStorage.removeItem("volleyiq:dev-auth");
    return DEV_USER;
  }
  getApp();
  const cred = await signInWithEmailAndPassword(getAuth(), email, password);
  return cred.user;
}

export async function registerEmail(email: string, password: string) {
  if (USE_DEV) return DEV_USER;
  getApp();
  const cred = await createUserWithEmailAndPassword(getAuth(), email, password);
  return cred.user;
}

export async function loginGoogle() {
  if (USE_DEV) {
    localStorage.removeItem("volleyiq:dev-auth");
    return DEV_USER;
  }
  getApp();
  const cred = await signInWithPopup(getAuth(), new GoogleAuthProvider());
  return cred.user;
}

export async function logout() {
  if (USE_DEV) {
    localStorage.setItem("volleyiq:dev-auth", "out");
    window.location.reload();
    return;
  }
  getApp();
  await signOut(getAuth());
}

export async function getIdToken(): Promise<string | null> {
  if (USE_DEV) return "dev-token";

  getApp();
  const auth = getAuth();
  const user = auth.currentUser ?? (await waitForAuthState());

  if (!isFirebaseUser(user)) return null;
  return user.getIdToken();
}