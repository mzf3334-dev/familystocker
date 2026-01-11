export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  familyId: string | null;
}

export interface Family {
  id: string;
  name: string;
  members: string[]; // Array of user UIDs
}

export interface InventoryItem {
  id: string;
  familyId: string;
  name: string;
  chineseName?: string;
  expiryDate: string; // ISO string
  category?: string;
  addedBy: string; // User UID
  createdAt: string; // ISO string
}
