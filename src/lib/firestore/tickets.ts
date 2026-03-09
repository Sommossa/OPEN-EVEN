import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export interface FormField {
    id: string;
    type: "text" | "email" | "number" | "select" | "checkbox";
    label: string;
    required: boolean;
    options?: string[]; // for select type
}

export interface TicketCategory {
    id: string;
    name: string;
    description: string;
    logoUrl: string | null;
    color: string;
    price: number; // in INR (e.g., 100.00 = ₹100.00), 0 = free
    currency: string;
    totalQuantity: number; // -1 = unlimited
    soldCount: number;
    reservedCount: number;
    availableQuantity: number; // computed
    isVisible: boolean;
    accessCode: string | null;
    perPersonLimit: number;
    isEarlyBird: boolean;
    earlyBirdDeadline: Timestamp | null;
    earlyBirdPrice: number | null;
    earlyBirdQuantity: number | null;
    earlyBirdSoldCount: number;
    saleStartDate: Timestamp;
    saleEndDate: Timestamp;
    isActive: boolean;
    requiresApproval: boolean;
    features: string[];
    allowedCoupons: string[];
    formFields: FormField[];
    displayOrder: number;
    createdBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

const COLLECTION_NAME = "ticketCategories";

/**
 * Fetch all active and visible ticket categories (client-side filtered to avoid composite index)
 */
export async function getPublicTicketCategories(): Promise<TicketCategory[]> {
    if (!db) return [];
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketCategory));
    return all
        .filter(c => c.isActive && c.isVisible)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

/**
 * Fetch a specific category by querying the dynamically generated access codes
 */
export async function getTicketCategoryByAccessCode(code: string): Promise<TicketCategory | null> {
    if (!db) return null;
    try {
        // Query the specific dynamically generated ticket code
        const codeRef = doc(db, "ticketCodes", code);
        const codeSnap = await getDoc(codeRef);

        if (!codeSnap.exists()) return null;
        const codeData = codeSnap.data();

        // Ensure code is active and has remaning uses
        if (!codeData.active || codeData.usedCount >= codeData.maxUses) {
            return null;
        }

        // The type field is the TicketCategory ID
        const categoryId = codeData.type;
        const catRef = doc(db, COLLECTION_NAME, categoryId);
        const catSnap = await getDoc(catRef);

        if (!catSnap.exists()) return null;

        const category = { id: catSnap.id, ...catSnap.data() } as TicketCategory;
        if (!category.isActive) return null;

        return category;
    } catch (err) {
        console.error("Error looking up access code:", err);
        return null;
    }
}

/**
 * Increment the used usage count for a dynamic access code
 */
export async function incrementTicketCodeUsage(code: string): Promise<void> {
    if (!db) return;
    try {
        const codeRef = doc(db, "ticketCodes", code);
        const codeSnap = await getDoc(codeRef);
        if (codeSnap.exists()) {
            await updateDoc(codeRef, {
                usedCount: (codeSnap.data().usedCount || 0) + 1
            });
        }
    } catch (err) {
        console.error("Failed to increment access code usage:", err);
    }
}

/**
 * Admin: Fetch all ticket categories regardless of status
 */
export async function getAllTicketCategories(): Promise<TicketCategory[]> {
    if (!db) return [];
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TicketCategory));
    return all.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

/**
 * Admin: Create a new ticket category
 */
export async function createTicketCategory(data: Omit<TicketCategory, "id" | "createdAt" | "updatedAt" | "soldCount" | "reservedCount" | "availableQuantity" | "earlyBirdSoldCount">): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");

    const newRef = doc(collection(db, COLLECTION_NAME));

    const fullData: TicketCategory = {
        ...data,
        id: newRef.id,
        soldCount: 0,
        reservedCount: 0,
        availableQuantity: data.totalQuantity,
        earlyBirdSoldCount: 0,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
    };

    await setDoc(newRef, fullData);
    return newRef.id;
}

/**
 * Admin: Update a ticket category
 */
export async function updateTicketCategory(id: string, data: Partial<TicketCategory>): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

/**
 * Admin: Delete a ticket category
 */
export async function deleteTicketCategory(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
}
