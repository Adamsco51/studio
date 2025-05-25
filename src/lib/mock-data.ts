
import type { Client, BillOfLading, Expense, User, WorkType, ChatMessage, TodoItem } from './types';
import { format } from 'date-fns';

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Alice Employee', role: 'employee' },
  { id: 'user-2', name: 'Bob Admin', role: 'admin' },
  { id: 'user-3', name: 'Charlie Collaborator', role: 'employee'},
];

export let MOCK_WORK_TYPES: WorkType[] = [
  { id: 'wt-1', name: 'Transit Standard', description: 'Service de transit de base.', createdAt: new Date('2023-01-01T10:00:00Z').toISOString(), createdByUserId: 'user-2' },
  { id: 'wt-2', name: 'Transport Routier', description: 'Acheminement par camion.', createdAt: new Date('2023-01-05T11:00:00Z').toISOString(), createdByUserId: 'user-1' },
  { id: 'wt-3', name: 'Logistique d\'Entreposage', description: 'Stockage et gestion de marchandises.', createdAt: new Date('2023-01-10T12:00:00Z').toISOString(), createdByUserId: 'user-2' },
  { id: 'wt-4', name: 'Dédouanement Import', description: 'Formalités douanières pour importation.', createdAt: new Date('2023-02-01T13:00:00Z').toISOString(), createdByUserId: 'user-1' },
  { id: 'wt-5', name: 'Dédouanement Export', description: 'Formalités douanières pour exportation.', createdAt: new Date('2023-02-05T14:00:00Z').toISOString(), createdByUserId: 'user-2' },
  { id: 'wt-6', name: 'Projet Spécial', description: 'Gestion de projets logistiques complexes.', createdAt: new Date('2023-03-01T15:00:00Z').toISOString(), createdByUserId: 'user-1' },
];

export let MOCK_CLIENTS: Client[] = [
  {
    id: 'client-1',
    name: 'Global Imports Inc.',
    contactPerson: 'John Doe',
    email: 'john.doe@globalimports.com',
    phone: '+1-555-1234',
    address: '123 Import Lane, New York, NY 10001, USA',
    blIds: ['bl-1', 'bl-3'],
    createdAt: new Date('2023-05-10T09:30:00Z').toISOString(),
    createdByUserId: 'user-2',
  },
  {
    id: 'client-2',
    name: 'Export Solutions Ltd.',
    contactPerson: 'Jane Smith',
    email: 'jane.smith@exportsolutions.com',
    phone: '+44-20-7946-0958',
    address: '456 Export Road, London, EC1A 1BB, UK',
    blIds: ['bl-2'],
    createdAt: new Date('2023-06-15T14:00:00Z').toISOString(),
    createdByUserId: 'user-1',
  },
  {
    id: 'client-3',
    name: 'Logistique Express SARL',
    contactPerson: 'Pierre Durand',
    email: 'pierre.durand@logexpress.fr',
    phone: '+33-1-2345-6789',
    address: '789 Rue de la Logistique, 75001 Paris, France',
    blIds: ['bl-4'],
    createdAt: new Date('2023-07-20T16:45:00Z').toISOString(),
    createdByUserId: 'user-2',
  }
];

export let MOCK_BILLS_OF_LADING: BillOfLading[] = [
  {
    id: 'bl-1',
    blNumber: 'MEDU824522',
    clientId: 'client-1',
    allocatedAmount: 5000,
    workTypeId: 'wt-1',
    description: 'Electronics and computer parts from Shanghai to New York.',
    categories: ['Électronique', 'Haute Technologie'],
    status: 'terminé',
    createdAt: new Date('2023-10-15T10:00:00Z').toISOString(),
    createdByUserId: 'user-2', // Bob Admin
  },
  {
    id: 'bl-2',
    blNumber: 'MAEU123456',
    clientId: 'client-2',
    allocatedAmount: 7500,
    workTypeId: 'wt-3',
    description: 'Apparel and textiles from Bangladesh to London.',
    categories: ['Textile', 'Importation'],
    status: 'en cours',
    createdAt: new Date('2023-11-01T14:30:00Z').toISOString(),
    createdByUserId: 'user-1', // Alice Employee
  },
  {
    id: 'bl-3',
    blNumber: 'CMAU789012',
    clientId: 'client-1',
    allocatedAmount: 3000,
    workTypeId: 'wt-2',
    description: 'Automotive spare parts from Germany to New York.',
    categories: ['Automobile', 'Pièces détachées'],
    status: 'en cours',
    createdAt: new Date('2023-11-20T09:15:00Z').toISOString(),
    createdByUserId: 'user-2', // Bob Admin
  },
  {
    id: 'bl-4',
    blNumber: 'SUDU999000',
    clientId: 'client-3',
    allocatedAmount: 12000,
    workTypeId: 'wt-6',
    description: 'Machinerie lourde pour chantier de construction.',
    categories: ['Machinerie', 'Projet Spécial'],
    status: 'inactif',
    createdAt: new Date('2023-09-01T09:15:00Z').toISOString(),
    createdByUserId: 'user-1', // Alice Employee
  }
];

export let MOCK_EXPENSES: Expense[] = [
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
    blId: 'bl-1',
    label: 'Unexpected Storage Fee',
    amount: 2000, // This expense made bl-1 a loss
    date: new Date('2023-10-25T09:00:00Z').toISOString(),
    employeeId: 'user-1',
  },
  {
    id: 'exp-6',
    blId: 'bl-3',
    label: 'Frais de dossier',
    amount: 150,
    date: new Date('2023-11-21T09:00:00Z').toISOString(),
    employeeId: 'user-1',
  },
  {
    id: 'exp-7',
    blId: 'bl-4',
    label: 'Pré-acheminement',
    amount: 800,
    date: new Date('2023-09-05T09:00:00Z').toISOString(),
    employeeId: 'user-1',
  }
];

// CHAT & TODO MOCK DATA
export let MOCK_CHAT_MESSAGES: ChatMessage[] = [
    { id: 'msg-1', senderId: 'user-1', senderName: 'Alice Employee', text: 'Bonjour l\'équipe, n\'oubliez pas la réunion de 14h.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'msg-2', senderId: 'user-2', senderName: 'Bob Admin', text: 'Bien noté Alice. J\'ai ajouté une tâche pour la préparation du rapport BL-2.', timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
    { id: 'msg-3', senderId: 'user-3', senderName: 'Charlie Collaborator', text: 'Je peux m\'occuper de contacter le client Global Imports Inc. pour le BL-3.', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
];

export let MOCK_TODO_ITEMS: TodoItem[] = [
    { id: 'todo-1', text: 'Préparer le rapport financier pour BL-2', assignedToUserId: 'user-1', assignedToUserName: 'Alice Employee', completed: false, createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(), createdByUserId: 'user-2', createdByName: 'Bob Admin' },
    { id: 'todo-2', text: 'Contacter le client Global Imports Inc. (BL-3)', assignedToUserId: 'user-3', assignedToUserName: 'Charlie Collaborator', completed: false, createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(), createdByUserId: 'user-3', createdByName: 'Charlie Collaborator' },
    { id: 'todo-3', text: 'Vérifier les documents douaniers pour BL-1', completed: true, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), createdByUserId: 'user-2', createdByName: 'Bob Admin' },
];


// CRUD Functions
export const addClient = (client: Omit<Client, 'id' | 'createdAt' | 'createdByUserId' | 'blIds'>) => {
  const newClient: Client = {
    id: `client-${Date.now()}`,
    ...client,
    blIds: [],
    createdAt: new Date().toISOString(),
    createdByUserId: MOCK_USERS[0].id, 
  };
  MOCK_CLIENTS.push(newClient);
};
export const updateClient = (updatedClient: Client) => {
  MOCK_CLIENTS = MOCK_CLIENTS.map(client => client.id === updatedClient.id ? { ...client, ...updatedClient } : client);
};
export const deleteClient = (clientId: string) => {
  MOCK_CLIENTS = MOCK_CLIENTS.filter(client => client.id !== clientId);
  MOCK_BILLS_OF_LADING = MOCK_BILLS_OF_LADING.filter(bl => bl.clientId !== clientId);
};

export const addBL = (bl: Omit<BillOfLading, 'id' | 'createdAt' | 'createdByUserId'>) => {
  const newBL: BillOfLading = {
    id: `bl-${Date.now()}`,
    ...bl,
    createdAt: new Date().toISOString(),
    createdByUserId: bl.createdByUserId || MOCK_USERS[0].id,
  };
  MOCK_BILLS_OF_LADING.push(newBL);
  const client = MOCK_CLIENTS.find(c => c.id === newBL.clientId);
  if (client && !client.blIds.includes(newBL.id)) {
    client.blIds.push(newBL.id);
  }
};
export const updateBL = (updatedBL: BillOfLading) => {
  MOCK_BILLS_OF_LADING = MOCK_BILLS_OF_LADING.map(bl => bl.id === updatedBL.id ? { ...bl, ...updatedBL } : bl);
};
export const deleteBL = (blId: string) => {
  const blToDelete = MOCK_BILLS_OF_LADING.find(bl => bl.id === blId);
  if (blToDelete) {
    MOCK_CLIENTS = MOCK_CLIENTS.map(client => {
      if (client.id === blToDelete.clientId) {
        return { ...client, blIds: client.blIds.filter(id => id !== blId) };
      }
      return client;
    });
  }
  MOCK_BILLS_OF_LADING = MOCK_BILLS_OF_LADING.filter(bl => bl.id !== blId);
  MOCK_EXPENSES = MOCK_EXPENSES.filter(exp => exp.blId !== blId); 
};

export const addExpense = (expense: Expense) => {
  MOCK_EXPENSES.push(expense);
};
export const deleteExpense = (expenseId: string) => {
  MOCK_EXPENSES = MOCK_EXPENSES.filter(exp => exp.id !== expenseId);
};

export const addWorkType = (workType: Omit<WorkType, 'id' | 'createdAt' | 'createdByUserId'>) => {
  const newWorkType: WorkType = {
    id: `wt-${Date.now()}`,
    ...workType,
    createdAt: new Date().toISOString(),
    createdByUserId: MOCK_USERS[0].id, 
  };
  MOCK_WORK_TYPES.push(newWorkType);
};
export const updateWorkType = (updatedWorkType: WorkType) => {
  MOCK_WORK_TYPES = MOCK_WORK_TYPES.map(wt => wt.id === updatedWorkType.id ? { ...wt, ...updatedWorkType } : wt);
};
export const deleteWorkType = (workTypeId: string) => {
  MOCK_WORK_TYPES = MOCK_WORK_TYPES.filter(wt => wt.id !== workTypeId);
};

// Chat & Todo CRUD
// For simplicity, current user is user-2 (Bob Admin) for sending messages/creating todos
const getCurrentUserId = () => MOCK_USERS[1].id;
const getCurrentUserName = () => MOCK_USERS[1].name;

export const addChatMessage = (text: string): ChatMessage => {
  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    senderId: getCurrentUserId(),
    senderName: getCurrentUserName(),
    text,
    timestamp: new Date().toISOString(),
  };
  MOCK_CHAT_MESSAGES.push(newMessage);
  return newMessage;
};

export const addTodoItem = (text: string, assignedToUserId?: string): TodoItem => {
  const assignedUser = MOCK_USERS.find(u => u.id === assignedToUserId);
  const newTodo: TodoItem = {
    id: `todo-${Date.now()}`,
    text,
    assignedToUserId,
    assignedToUserName: assignedUser?.name,
    completed: false,
    createdAt: new Date().toISOString(),
    createdByUserId: getCurrentUserId(),
    createdByName: getCurrentUserName(),
  };
  MOCK_TODO_ITEMS.push(newTodo);
  return newTodo;
};

export const toggleTodoItemCompletion = (todoId: string): void => {
  MOCK_TODO_ITEMS = MOCK_TODO_ITEMS.map(todo =>
    todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
  );
};

export const deleteTodoItem = (todoId: string): void => {
  MOCK_TODO_ITEMS = MOCK_TODO_ITEMS.filter(todo => todo.id !== todoId);
};
