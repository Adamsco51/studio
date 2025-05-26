
export type BLStatus = 'en cours' | 'terminé' | 'inactif';

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  blIds: string[];
  createdAt: string; // ISO Date string
  createdByUserId?: string;
}

export interface WorkType {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO Date string
  createdByUserId?: string;
}

export interface BillOfLading {
  id: string;
  blNumber: string;
  clientId: string;
  allocatedAmount: number;
  workTypeId: string;
  description: string;
  categories: string[]; // Manual categories
  status: BLStatus;
  createdAt: string; // ISO Date string
  createdByUserId?: string; 
}

export interface Expense {
  id: string;
  blId: string;
  label: string;
  amount: number;
  date: string; // ISO Date string
  employeeId: string; 
}

// This User type is for the mock data and general app use for displaying names/roles if needed
export interface User {
  id: string;
  name: string;
  role: 'employee' | 'admin';
}

// This type represents the authenticated user from Firebase
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: 'admin' | 'employee'; 
}

export interface UserProfile {
  uid: string; // Should match Firebase Auth UID
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'employee';
  createdAt: string; // ISO Date string for when the profile was created/updated
}


export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string; 
  text: string;
  timestamp: string; // ISO Date string
}

export interface TodoItem {
  id: string;
  text: string;
  assignedToUserId?: string;
  assignedToUserName?: string; 
  completed: boolean;
  createdAt: string; // ISO Date string
  createdByUserId: string;
  createdByName: string; 
}

export type ApprovalRequestEntityType = 'bl' | 'client' | 'workType' | 'expense';
export type ApprovalRequestActionType = 'edit' | 'delete';
export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'pin_issued' | 'completed';

export interface ApprovalRequest {
  id: string; // Firestore document ID will be used here
  requestedByUserId: string;
  requestedByUserName: string;
  entityType: ApprovalRequestEntityType;
  entityId: string;
  entityDescription?: string; // e.g., BL Number, Client Name
  actionType: ApprovalRequestActionType;
  reason: string;
  status: ApprovalRequestStatus;
  createdAt: string; // ISO Date string
  processedAt?: string; // ISO Date string, when admin processed it
  adminNotes?: string;
  pinCode?: string;
  pinExpiresAt?: string; // ISO Date string
}
