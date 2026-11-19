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
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Attendee, Connection, EventDoc, JoinedEvent, Lead, Profile } from "@/lib/types";

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

// ---------- events ----------

export function newEventId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function createEvent(event: EventDoc): Promise<string> {
  const id = newEventId();
  await setDoc(doc(db(), "events", id), event);
  return id;
}

export async function getEvent(eventId: string): Promise<EventDoc | null> {
  const snap = await getDoc(doc(db(), "events", eventId));
  return snap.exists() ? (snap.data() as EventDoc) : null;
}

export async function updateEvent(eventId: string, patch: Partial<Pick<EventDoc, "name" | "date" | "venue" | "description" | "open">>) {
  await updateDoc(doc(db(), "events", eventId), patch);
}

export async function listMyEvents(uid: string): Promise<(EventDoc & { id: string })[]> {
  const snap = await getDocs(query(collection(db(), "events"), where("organiserUid", "==", uid), orderBy("date", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as EventDoc) }));
}

export async function listJoined(uid: string): Promise<(JoinedEvent & { id: string })[]> {
  const snap = await getDocs(query(collection(db(), "users", uid, "joined"), orderBy("joinedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as JoinedEvent) }));
}

export async function isJoined(uid: string, eventId: string): Promise<boolean> {
  return (await getDoc(doc(db(), "users", uid, "joined", eventId))).exists();
}

export async function joinEvent(uid: string, eventId: string, event: EventDoc, username: string, profile: Profile) {
  const now = Date.now();
  const batch = writeBatch(db());
  const attendee: Attendee = {
    username,
    displayName: profile.displayName,
    headline: profile.headline,
    thumb: profile.thumb,
    joinedAt: now,
  };
  batch.set(doc(db(), "events", eventId, "attendees", uid), attendee);
  batch.set(doc(db(), "users", uid, "joined", eventId), { name: event.name, date: event.date, joinedAt: now } satisfies JoinedEvent);
  await batch.commit();
}

export async function leaveEvent(uid: string, eventId: string) {
  const batch = writeBatch(db());
  batch.delete(doc(db(), "events", eventId, "attendees", uid));
  batch.delete(doc(db(), "users", uid, "joined", eventId));
  await batch.commit();
}

export async function listAttendees(eventId: string): Promise<(Attendee & { uid: string })[]> {
  const snap = await getDocs(query(collection(db(), "events", eventId, "attendees"), orderBy("joinedAt", "desc")));
  return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Attendee) }));
}

export async function removeAttendee(eventId: string, uid: string) {
  await deleteDoc(doc(db(), "events", eventId, "attendees", uid));
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
