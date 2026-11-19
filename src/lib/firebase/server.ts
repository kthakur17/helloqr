import "server-only";
import { getApp, getApps, initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore, increment, setDoc } from "firebase/firestore/lite";
import type { Feedback } from "@/lib/feedback";
import type { CounterKey, EventDoc, Lead, Profile } from "@/lib/types";
import { USERNAME_RE } from "@/lib/username";

// The REST-based "lite" SDK reads public documents as an anonymous client, so the same
// security rules apply here as in the browser and no service-account key is needed.
const NAME = "helloqr-server";

function db() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId) {
    throw new Error("Firebase is not configured: set the NEXT_PUBLIC_FIREBASE_* variables.");
  }
  const app = getApps().some((a) => a.name === NAME) ? getApp(NAME) : initializeApp(config, NAME);
  return getFirestore(app);
}

export async function getPublicProfile(username: string): Promise<Profile | null> {
  if (!USERNAME_RE.test(username)) {
    return null;
  }
  const snap = await getDoc(doc(db(), "profiles", username));
  return snap.exists() ? (snap.data() as Profile) : null;
}

export async function getPublicEvent(eventId: string): Promise<EventDoc | null> {
  if (!/^[a-z0-9]{10}$/.test(eventId)) {
    return null;
  }
  const snap = await getDoc(doc(db(), "events", eventId));
  return snap.exists() ? (snap.data() as EventDoc) : null;
}

/** Writes a visitor's details to the card owner's private inbox; the rules re-check every field. */
export async function addLead(username: string, id: string, lead: Lead): Promise<void> {
  await setDoc(doc(db(), "profiles", username, "leads", id), lead);
}

/** Product feedback goes to a collection only the project owner reads, in the Firebase console. */
export async function addFeedback(id: string, feedback: Feedback): Promise<void> {
  await setDoc(doc(db(), "feedback", id), feedback);
}

export const COUNTER_KEY_RE = /^(views|scans|saves|vcard|click_[a-z0-9]{1,16})$/;

export async function bumpCounter(username: string, key: CounterKey): Promise<void> {
  if (!USERNAME_RE.test(username) || !COUNTER_KEY_RE.test(key)) {
    return;
  }
  await setDoc(doc(db(), "profiles", username, "counters", key), { n: increment(1) }, { merge: true });
}
