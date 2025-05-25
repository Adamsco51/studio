
export type BLStatus = 'en cours' | 'terminé' | 'inactif';

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  blIds: string[];
}

export interface BillOfLading {
  id: string;
  blNumber: string;
  clientId: string;
  allocatedAmount: number;
  serviceTypes: string[];
  description: string; // For context, can still be useful
  categories: string[]; // Manual categories
  status: BLStatus;
  createdAt: string; // ISO Date string
}

export interface Expense {
  id: string;
  blId: string;
  label: string;
  amount: number;
  date: string; // ISO Date string
  employeeId: string; // Mocked, in a real app this would be a user ID
}

// For mock user data
export interface User {
  id: string;
  name: string;
  role: 'employee' | 'admin';
}
