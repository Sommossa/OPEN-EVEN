import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export interface ScheduleSession {
    id: string;
    title: string;
    speaker: string;
    time: string;
    location: string;
    day: number;
    type: "keynote" | "talk" | "workshop" | "break" | "general";
    duration: number; // in minutes
    order: number;
    description?: string;
    tags?: string[];
    bannerImage?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

const COLLECTION_NAME = "schedule";

export async function getAllSessions(): Promise<ScheduleSession[]> {
    if (!db) return [];
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const sessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleSession));
    // Sort client-side to avoid composite index requirement
    return sessions.sort((a, b) => a.day - b.day || a.order - b.order);
}

export async function getSessionsByDay(day: number): Promise<ScheduleSession[]> {
    const all = await getAllSessions();
    return all.filter(s => s.day === day);
}

export async function createSession(data: Omit<ScheduleSession, "id" | "createdAt" | "updatedAt">): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");
    const newRef = doc(collection(db, COLLECTION_NAME));
    await setDoc(newRef, {
        ...data,
        id: newRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return newRef.id;
}

export async function updateSession(id: string, data: Partial<ScheduleSession>): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteSession(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    await deleteDoc(doc(db, COLLECTION_NAME, id));
}
