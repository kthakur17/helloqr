import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Connection, EventDoc, JoinedEvent, Lead, Profile } from "@/lib/types";

export async function getMyUsername(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db(), "users", uid));
  return snap.exists() ? (snap.data().username as string) : null;
}

export async function getProfile(username: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db(), "profiles", username));
  return snap.exists() ? (snap.data() as Profile) : null;
}

/** Taken by a live card, or retired when its owner deleted their account. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const [profile, retired] = await Promise.all([getDoc(doc(db(), "profiles", username)), getDoc(doc(db(), "retired", username))]);
  return profile.exists() || retired.exists();
}

/** Claims the username and creates the profile in one batch; the rules allow one per account. */
export async function claimUsername(uid: string, username: string, profile: Profile): Promise<void> {
  const batch = writeBatch(db());
  batch.set(doc(db(), "profiles", username), profile);
  batch.set(doc(db(), "users", uid), { username, createdAt: Date.now() });
  await batch.commit();
}

export async function saveProfile(username: string, profile: Profile): Promise<void> {
  // Firestore rejects undefined values; optional fields an older card never set are simply left out.
  const data = Object.fromEntries(Object.entries({ ...profile, updatedAt: Date.now() }).filter(([, v]) => v !== undefined));
  await setDoc(doc(db(), "profiles", username), data);
}

export async function getCounters(username: string): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db(), "profiles", username, "counters"));
  const out: Record<string, number> = {};
  snap.forEach((d) => {
    out[d.id] = (d.data().n as number) ?? 0;
  });
  return out;
}

// ---------- events (feature removed) ----------
// Events are no longer offered. These two reads remain so data export and account deletion
// still cover any event data created while the feature existed.

export async function listMyEvents(uid: string): Promise<(EventDoc & { id: string })[]> {
  const snap = await getDocs(query(collection(db(), "events"), where("organiserUid", "==", uid), orderBy("date", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as EventDoc) }));
}

export async function listJoined(uid: string): Promise<(JoinedEvent & { id: string })[]> {
  const snap = await getDocs(query(collection(db(), "users", uid, "joined"), orderBy("joinedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as JoinedEvent) }));
}

// ---------- details visitors shared with you ----------

export async function listLeads(username: string): Promise<(Lead & { id: string })[]> {
  const snap = await getDocs(query(collection(db(), "profiles", username, "leads"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Lead) }));
}

export async function countLeads(username: string): Promise<number> {
  return (await getCountFromServer(collection(db(), "profiles", username, "leads"))).data().count;
}

export async function deleteLead(username: string, id: string) {
  await deleteDoc(doc(db(), "profiles", username, "leads", id));
}

// ---------- connections ----------

export async function getConnection(uid: string, username: string): Promise<Connection | null> {
  const snap = await getDoc(doc(db(), "users", uid, "connections", username));
  return snap.exists() ? (snap.data() as Connection) : null;
}

/** `savedAt` defaults to now; pass the original time when updating an existing connection. */
export async function saveConnection(uid: string, username: string, connection: Omit<Connection, "savedAt"> & { savedAt?: number }) {
  const data: Connection = { ...connection, savedAt: connection.savedAt ?? Date.now() };
  await setDoc(doc(db(), "users", uid, "connections", username), data);
}

export async function removeConnection(uid: string, username: string) {
  await deleteDoc(doc(db(), "users", uid, "connections", username));
}

export async function listConnections(uid: string): Promise<(Connection & { username: string })[]> {
  const snap = await getDocs(query(collection(db(), "users", uid, "connections"), orderBy("savedAt", "desc")));
  return snap.docs.map((d) => ({ username: d.id, ...(d.data() as Connection) }));
}
