import fetch from 'node-fetch';

const projectId = "OPEN EVEN26-6e70e"; // Hardcoded from firebase.ts

const newTickets = [
  {
    name: { stringValue: "Golden Ticket" },
    description: { stringValue: "Exclusive VIP access to all areas and speakers lounge." },
    color: { stringValue: "#FFD700" },
    price: { integerValue: "5000" },
    currency: { stringValue: "INR" },
    totalQuantity: { integerValue: "50" },
    soldCount: { integerValue: "0" },
    reservedCount: { integerValue: "0" },
    availableQuantity: { integerValue: "50" },
    isVisible: { booleanValue: false },
    accessCode: { stringValue: "GOLDEN2026" },
    perPersonLimit: { integerValue: "2" },
    isEarlyBird: { booleanValue: false },
    earlyBirdSoldCount: { integerValue: "0" },
    isActive: { booleanValue: true },
    requiresApproval: { booleanValue: false },
    features: {
      arrayValue: {
        values: [
          { stringValue: "VIP Seating" },
          { stringValue: "Speaker Lounge Access" },
          { stringValue: "Lunch Included" },
          { stringValue: "Premium Swag" },
          { stringValue: "Invite-only Dinner" }
        ]
      }
    },
    displayOrder: { integerValue: "10" }
  },
  {
    name: { stringValue: "Silver Ticket" },
    description: { stringValue: "Premium access to all talks and priority seating." },
    color: { stringValue: "#C0C0C0" },
    price: { integerValue: "2500" },
    currency: { stringValue: "INR" },
    totalQuantity: { integerValue: "100" },
    soldCount: { integerValue: "0" },
    reservedCount: { integerValue: "0" },
    availableQuantity: { integerValue: "100" },
    isVisible: { booleanValue: false },
    accessCode: { stringValue: "SILVER2026" },
    perPersonLimit: { integerValue: "2" },
    isEarlyBird: { booleanValue: false },
    earlyBirdSoldCount: { integerValue: "0" },
    isActive: { booleanValue: true },
    requiresApproval: { booleanValue: false },
    features: {
      arrayValue: {
        values: [
          { stringValue: "Priority Seating" },
          { stringValue: "Lunch Included" },
          { stringValue: "Premium Swag" }
        ]
      }
    },
    displayOrder: { integerValue: "11" }
  },
  {
    name: { stringValue: "Organizing Team" },
    description: { stringValue: "All access pass for the core organizing team." },
    color: { stringValue: "#ff4d4d" },
    price: { integerValue: "0" },
    currency: { stringValue: "INR" },
    totalQuantity: { integerValue: "-1" },
    soldCount: { integerValue: "0" },
    reservedCount: { integerValue: "0" },
    availableQuantity: { integerValue: "-1" },
    isVisible: { booleanValue: false },
    accessCode: { stringValue: "TEAMOPEN EVEN26" },
    perPersonLimit: { integerValue: "1" },
    isEarlyBird: { booleanValue: false },
    earlyBirdSoldCount: { integerValue: "0" },
    isActive: { booleanValue: true },
    requiresApproval: { booleanValue: false },
    features: {
      arrayValue: {
        values: [
          { stringValue: "All Access" },
          { stringValue: "Backstage Pass" },
          { stringValue: "Staff Meals" }
        ]
      }
    },
    displayOrder: { integerValue: "12" }
  },
  {
    name: { stringValue: "Sponsor Pass" },
    description: { stringValue: "Special access for our generous sponsors." },
    color: { stringValue: "#8A2BE2" },
    price: { integerValue: "0" },
    currency: { stringValue: "INR" },
    totalQuantity: { integerValue: "-1" },
    soldCount: { integerValue: "0" },
    reservedCount: { integerValue: "0" },
    availableQuantity: { integerValue: "-1" },
    isVisible: { booleanValue: false },
    accessCode: { stringValue: "SPONSORVIP26" },
    perPersonLimit: { integerValue: "5" },
    isEarlyBird: { booleanValue: false },
    earlyBirdSoldCount: { integerValue: "0" },
    isActive: { booleanValue: true },
    requiresApproval: { booleanValue: false },
    features: {
      arrayValue: {
        values: [
          { stringValue: "Sponsor Booth" },
          { stringValue: "VIP Seating" },
          { stringValue: "Gala Invite" }
        ]
      }
    },
    displayOrder: { integerValue: "13" }
  }
];

async function seed() {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/ticketCategories`;
  
  for (const ticket of newTickets) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: ticket })
    });
    
    if (!response.ok) {
      console.error(`Failed to add ticket`, await response.text());
    } else {
      console.log(`Successfully added ticket with access code ${ticket.accessCode.stringValue}`);
    }
  }
}

seed().catch(console.error);
