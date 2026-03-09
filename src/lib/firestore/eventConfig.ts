import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export interface EventConfig {
    eventName: string;
    startDate: string;
    endDate: string;
    supportEmail: string;
    registrationOpen: boolean;
    location: string;
    mode: string;
    updatedAt?: Timestamp;
}

const DOC_PATH = "eventConfig";
const DOC_ID = "main";

export async function getEventConfig(): Promise<EventConfig | null> {
    if (!db) return null;
    const docRef = doc(db, DOC_PATH, DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data() as EventConfig;
    }
    return null;
}

export async function saveEventConfig(data: EventConfig): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, DOC_PATH, DOC_ID);
    await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}
