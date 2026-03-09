import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newTickets = [
  {
    name: "Golden Ticket",
    description: "Exclusive VIP access to all areas and speakers lounge.",
    color: "#FFD700",
    price: 5000,
    currency: "INR",
    totalQuantity: 50,
    soldCount: 0,
    reservedCount: 0,
    availableQuantity: 50,
    isVisible: false,
    accessCode: "GOLDEN2026",
    perPersonLimit: 2,
    isEarlyBird: false,
    earlyBirdSoldCount: 0,
    isActive: true,
    requiresApproval: false,
    features: ["VIP Seating", "Speaker Lounge Access", "Lunch Included", "Premium Swag", "Invite-only Dinner"],
    allowedCoupons: [],
    formFields: [],
    displayOrder: 10,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    name: "Silver Ticket",
    description: "Premium access to all talks and priority seating.",
    color: "#C0C0C0",
    price: 2500,
    currency: "INR",
    totalQuantity: 100,
    soldCount: 0,
    reservedCount: 0,
    availableQuantity: 100,
    isVisible: false,
    accessCode: "SILVER2026",
    perPersonLimit: 2,
    isEarlyBird: false,
    earlyBirdSoldCount: 0,
    isActive: true,
    requiresApproval: false,
    features: ["Priority Seating", "Lunch Included", "Premium Swag"],
    allowedCoupons: [],
    formFields: [],
    displayOrder: 11,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    name: "Organizing Team",
    description: "All access pass for the core organizing team.",
    color: "#ff4d4d",
    price: 0,
    currency: "INR",
    totalQuantity: -1, // Unlimited
    soldCount: 0,
    reservedCount: 0,
    availableQuantity: -1,
    isVisible: false,
    accessCode: "TEAMOPEN EVEN26",
    perPersonLimit: 1,
    isEarlyBird: false,
    earlyBirdSoldCount: 0,
    isActive: true,
    requiresApproval: false,
    features: ["All Access", "Backstage Pass", "Staff Meals"],
    allowedCoupons: [],
    formFields: [],
    displayOrder: 12,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  },
  {
    name: "Sponsor Pass",
    description: "Special access for our generous sponsors.",
    color: "#8A2BE2",
    price: 0,
    currency: "INR",
    totalQuantity: -1,
    soldCount: 0,
    reservedCount: 0,
    availableQuantity: -1,
    isVisible: false,
    accessCode: "SPONSORVIP26",
    perPersonLimit: 5,
    isEarlyBird: false,
    earlyBirdSoldCount: 0,
    isActive: true,
    requiresApproval: false,
    features: ["Sponsor Booth", "VIP Seating", "Gala Invite"],
    allowedCoupons: [],
    formFields: [],
    displayOrder: 13,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
];

async function seed() {
  const categoriesRef = collection(db, "ticketCategories");
  for (const ticket of newTickets) {
    await addDoc(categoriesRef, ticket);
    console.log(`Added \${ticket.name}`);
  }
  console.log("Done seeding tickets.");
  process.exit(0);
}

seed().catch(console.error);
