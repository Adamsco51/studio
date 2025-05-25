import type { Client, BillOfLading, Expense, User } from './types';

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Alice Employee', role: 'employee' },
  { id: 'user-2', name: 'Bob Admin', role: 'admin' },
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'Global Imports Inc.',
    contactPerson: 'John Doe',
    email: 'john.doe@globalimports.com',
    phone: '+1-555-1234',
    address: '123 Import Lane, New York, NY 10001, USA',
    blIds: ['bl-1', 'bl-3'],
  },
  {
    id: 'client-2',
    name: 'Export Solutions Ltd.',
    contactPerson: 'Jane Smith',
    email: 'jane.smith@exportsolutions.com',
    phone: '+44-20-7946-0958',
    address: '456 Export Road, London, EC1A 1BB, UK',
    blIds: ['bl-2'],
  },
];

export const MOCK_BILLS_OF_LADING: BillOfLading[] = [
  {
    id: 'bl-1',
    blNumber: 'MEDU824522',
    clientId: 'client-1',
    allocatedAmount: 5000,
    serviceTypes: ['Transit', 'Transport'],
    description: 'Electronics and computer parts from Shanghai to New York.',
    aiSuggestedCategories: ['Electronics', 'Computer Components'],
    aiSuggestedSubCategories: ['High-Value Goods', 'Fragile Items'],
    createdAt: new Date('2023-10-15T10:00:00Z').toISOString(),
  },
  {
    id: 'bl-2',
    blNumber: 'MAEU123456',
    clientId: 'client-2',
    allocatedAmount: 7500,
    serviceTypes: ['Logistique', 'Customs Clearance'],
    description: 'Apparel and textiles from Bangladesh to London.',
    createdAt: new Date('2023-11-01T14:30:00Z').toISOString(),
  },
  {
    id: 'bl-3',
    blNumber: 'CMAU789012',
    clientId: 'client-1',
    allocatedAmount: 3000,
    serviceTypes: ['Transit'],
    description: 'Automotive spare parts from Germany to New York.',
    createdAt: new Date('2023-11-20T09:15:00Z').toISOString(),
  },
];

export const MOCK_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    blId: 'bl-1',
    label: 'Ocean Freight Charges',
    amount: 2500,
    date: new Date('2023-10-20T11:00:00Z').toISOString(),
    employeeId: 'user-1',
  },
  {
    id: 'exp-2',
    blId: 'bl-1',
    label: 'Port Handling Fees NYC',
    amount: 800,
    date: new Date('2023-10-22T15:30:00Z').toISOString(),
    employeeId: 'user-1',
  },
  {
    id: 'exp-3',
    blId: 'bl-2',
    label: 'Air Freight',
    amount: 4000,
    date: new Date('2023-11-05T10:00:00Z').toISOString(),
    employeeId: 'user-1',
  },
  {
    id: 'exp-4',
    blId: 'bl-2',
    label: 'Customs Duty',
    amount: 1500,
    date: new Date('2023-11-06T16:45:00Z').toISOString(),
    employeeId: 'user-1',
  },
  {
    id: 'exp-5',
    blId: 'bl-1', // This expense will cause bl-1 to be at a loss
    label: 'Unexpected Storage Fee',
    amount: 2000,
    date: new Date('2023-10-25T09:00:00Z').toISOString(),
    employeeId: 'user-1',
  }
];
