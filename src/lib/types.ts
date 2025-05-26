
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

export interface User {
  id: string;
  name: string;
  role: 'employee' | 'admin';
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: 'admin' | 'employee'; 
}

export interface UserProfile {
  uid: string; 
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'employee';
  createdAt: string; 
}


export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string; 
  text: string;
  timestamp: string; // ISO Date string, but Firestore will store as Timestamp
}

export interface TodoItem {
  id: string;
  text: string;
  assignedToUserId?: string;
  assignedToUserName?: string; 
  completed: boolean;
  createdAt: string; // ISO Date string, Firestore will store as Timestamp
  createdByUserId: string;
  createdByName: string; 
}

export type ApprovalRequestEntityType = 'bl' | 'client' | 'workType' | 'expense';
export type ApprovalRequestActionType = 'edit' | 'delete';
export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'pin_issued' | 'completed';

export interface ApprovalRequest {
  id: string; 
  requestedByUserId: string;
  requestedByUserName: string;
  entityType: ApprovalRequestEntityType;
  entityId: string;
  entityDescription?: string; 
  actionType: ApprovalRequestActionType;
  reason: string;
  status: ApprovalRequestStatus;
  createdAt: string; 
  processedAt?: string; 
  adminNotes?: string;
  processedByUserId?: string; 
  pinCode?: string; 
  pinExpiresAt?: string; 
}
