
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
  createdByUserId?: string; // Added field for user who created the BL
}

export interface Expense {
  id: string;
  blId: string;
  label: string;
  amount: number;
  date: string; // ISO Date string
  employeeId: string; // Mocked, in a real app this would be a user ID
}

export interface User {
  id: string;
  name: string;
  role: 'employee' | 'admin';
}
