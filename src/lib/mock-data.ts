
import type { Client, BillOfLading, Expense, User, WorkType, ChatMessage, TodoItem } from './types';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  serverTimestamp,
  Timestamp,
  query, 
  where
} from "firebase/firestore";

export let MOCK_USERS: User[] = [
  { id: 'user-1-mock', name: 'Alice Employee (Mock)', role: 'employee' },
  { id: 'user-2-mock', name: 'Bob Admin (Mock)', role: 'admin' },
  { id: 'user-3-mock', name: 'Charlie Collaborator (Mock)', role: 'employee'},
];

export let MOCK_WORK_TYPES: WorkType[] = [
  { id: 'wt-1', name: 'Transit Standard', description: 'Service de transit de base.', createdAt: new Date('2023-01-01T10:00:00Z').toISOString(), createdByUserId: 'user-2-mock' },
  { id: 'wt-2', name: 'Transport Routier', description: 'Acheminement par camion.', createdAt: new Date('2023-01-05T11:00:00Z').toISOString(), createdByUserId: 'user-1-mock' },
  { id: 'wt-3', name: 'Logistique d\'Entreposage', description: 'Stockage et gestion de marchandises.', createdAt: new Date('2023-01-10T12:00:00Z').toISOString(), createdByUserId: 'user-2-mock' },
  { id: 'wt-4', name: 'Dédouanement Import', description: 'Formalités douanières pour importation.', createdAt: new Date('2023-02-01T13:00:00Z').toISOString(), createdByUserId: 'user-1-mock' },
  { id: 'wt-5', name: 'Dédouanement Export', description: 'Formalités douanières pour exportation.', createdAt: new Date('2023-02-05T14:00:00Z').toISOString(), createdByUserId: 'user-2-mock' },
  { id: 'wt-6', name: 'Projet Spécial', description: 'Gestion de projets logistiques complexes.', createdAt: new Date('2023-03-01T15:00:00Z').toISOString(), createdByUserId: 'user-1-mock' },
];

// MOCK_CLIENTS is now managed by Firestore
// export let MOCK_CLIENTS: Client[] = [ ... ]; 

// MOCK_BILLS_OF_LADING is now managed by Firestore
/*
export let MOCK_BILLS_OF_LADING: BillOfLading[] = [
  {
    id: 'bl-1',
    blNumber: 'MEDU824522',
    clientId: 'client-1-firestore', // Example, will need to match actual Firestore ID later
    allocatedAmount: 5000,
    workTypeId: 'wt-1',
    description: 'Electronics and computer parts from Shanghai to New York.',
    categories: ['Électronique', 'Haute Technologie'],
    status: 'terminé',
    createdAt: new Date('2023-10-15T10:00:00Z').toISOString(),
    createdByUserId: 'user-2-mock',
  },
  {
    id: 'bl-2',
    blNumber: 'MAEU123456',
    clientId: 'client-2-firestore', // Example
    allocatedAmount: 7500,
    workTypeId: 'wt-3',
    description: 'Apparel and textiles from Bangladesh to London.',
    categories: ['Textile', 'Importation'],
    status: 'en cours',
    createdAt: new Date('2023-11-01T14:30:00Z').toISOString(),
    createdByUserId: 'user-1-mock',
  },
  // ... other BLs, ensuring clientId points to Firestore IDs if linked
];
*/

export let MOCK_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    blId: 'bl-1', // This ID would need to match a Firestore BL ID once expenses are migrated
    label: 'Ocean Freight Charges',
    amount: 2500,
    date: new Date('2023-10-20T11:00:00Z').toISOString(),
    employeeId: 'user-1-mock',
  },
   {
    id: 'exp-2',
    blId: 'bl-1',
    label: 'Local Transport',
    amount: 300,
    date: new Date('2023-10-22T09:00:00Z').toISOString(),
    employeeId: 'user-1-mock',
  },
  {
    id: 'exp-3',
    blId: 'bl-2', // This ID would need to match a Firestore BL ID
    label: 'Customs Clearance',
    amount: 1200,
    date: new Date('2023-11-05T16:00:00Z').toISOString(),
    employeeId: 'user-2-mock',
  },
  // ... other expenses
];

export let MOCK_CHAT_MESSAGES: ChatMessage[] = [
    { id: 'msg-1', senderId: 'user-1-mock', senderName: 'Alice Employee (Mock)', text: 'Bonjour l\'équipe, n\'oubliez pas la réunion de 14h.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'msg-2', senderId: 'user-2-mock', senderName: 'Bob Admin (Mock)', text: 'Bien noté Alice. J\'ai ajouté une tâche pour la préparation du rapport BL-2.', timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
    { id: 'msg-3', senderId: 'user-3-mock', senderName: 'Charlie Collaborator (Mock)', text: 'Je peux m\'occuper de contacter le client Global Imports Inc. pour le BL-3.', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
];

export let MOCK_TODO_ITEMS: TodoItem[] = [
    { id: 'todo-1', text: 'Préparer le rapport financier pour BL-2', assignedToUserId: 'user-1-mock', assignedToUserName: 'Alice Employee (Mock)', completed: false, createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(), createdByUserId: 'user-2-mock', createdByName: 'Bob Admin (Mock)' },
    { id: 'todo-2', text: 'Contacter le client Global Imports Inc. (BL-3)', assignedToUserId: 'user-3-mock', assignedToUserName: 'Charlie Collaborator (Mock)', completed: false, createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(), createdByUserId: 'user-3-mock', createdByName: 'Charlie Collaborator (Mock)' },
    { id: 'todo-3', text: 'Vérifier les documents douaniers pour BL-1', completed: true, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), createdByUserId: 'user-2-mock', createdByName: 'Bob Admin (Mock)' },
];

const clientsCollectionRef = collection(db, "clients");
const blsCollectionRef = collection(db, "billsOfLading");


// Client CRUD with Firestore
export const addClientToFirestore = async (clientData: Omit<Client, 'id' | 'createdAt' | 'blIds'> & { createdByUserId: string }) => {
  try {
    const docRef = await addDoc(clientsCollectionRef, {
      ...clientData,
      blIds: [], // Initialize with empty array
      createdAt: serverTimestamp() 
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document (client): ", e);
    throw e;
  }
};

export const getClientsFromFirestore = async (): Promise<Client[]> => {
  try {
    const data = await getDocs(clientsCollectionRef);
    return data.docs.map(doc => {
      const clientData = doc.data();
      return {
        ...clientData,
        id: doc.id,
        createdAt: clientData.createdAt instanceof Timestamp ? clientData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Client;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(
        "Firestore permission denied while trying to fetch clients. " +
        "Please check your Firestore security rules in the Firebase console. " +
        "Rule suggestion for authenticated users: `service cloud.firestore { match /databases/{database}/documents { match /clients/{document=**} { allow read: if request.auth != null; } } }` " +
        "Ensure your rules allow reads on the 'clients' collection for authenticated users.",
        e
      );
    } else {
      console.error("Error getting documents (clients): ", e);
    }
    return [];
  }
};

export const getClientByIdFromFirestore = async (clientId: string): Promise<Client | null> => {
  try {
    const clientDocRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientDocRef);
    if (clientSnap.exists()) {
      const clientData = clientSnap.data();
      return {
        ...clientData,
        id: clientSnap.id,
        createdAt: clientData.createdAt instanceof Timestamp ? clientData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Client;
    } else {
      console.log("No such document for client ID:", clientId);
      return null;
    }
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(
        `Firestore permission denied while trying to fetch client with ID: ${clientId}. ` +
        "Please check your Firestore security rules in the Firebase console. " +
        "Ensure rules allow reads on individual client documents (e.g., `match /clients/{clientId} { allow read: if request.auth != null; }`).",
        e
      );
    } else {
      console.error(`Error getting document (client ${clientId}): `, e);
    }
    return null;
  }
};

export const updateClientInFirestore = async (clientId: string, updatedData: Partial<Omit<Client, 'id' | 'createdAt' | 'createdByUserId'>>) => {
  const clientDoc = doc(db, "clients", clientId);
  try {
    await updateDoc(clientDoc, updatedData);
  } catch (e) {
    console.error("Error updating document (client): ", e);
    throw e;
  }
};

export const deleteClientFromFirestore = async (clientId: string) => {
  const clientDoc = doc(db, "clients", clientId);
  try {
    // TODO: In a real app, handle deletion of associated BLs and Expenses, or use Firestore Functions for cascading deletes.
    // For now, just delete the client.
    // Consider deleting BLs associated with this client:
    // const blsSnapshot = await getDocs(query(blsCollectionRef, where("clientId", "==", clientId)));
    // const deletePromises = blsSnapshot.docs.map(blDoc => deleteBLFromFirestore(blDoc.id));
    // await Promise.all(deletePromises);
    await deleteDoc(clientDoc);
  } catch (e) {
    console.error("Error deleting document (client): ", e);
    throw e;
  }
};

// BL CRUD with Firestore
export const addBLToFirestore = async (blData: Omit<BillOfLading, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(blsCollectionRef, {
      ...blData,
      createdAt: serverTimestamp()
    });
    // Optionally update client's blIds array
    if (blData.clientId) {
        const clientDocRef = doc(db, "clients", blData.clientId);
        const clientSnap = await getDoc(clientDocRef);
        if (clientSnap.exists()) {
            const clientData = clientSnap.data() as Client;
            const updatedBlIds = [...(clientData.blIds || []), docRef.id];
            await updateDoc(clientDocRef, { blIds: updatedBlIds });
        }
    }
    return docRef.id;
  } catch (e) {
    console.error("Error adding document (BL): ", e);
    throw e;
  }
};

export const getBLsFromFirestore = async (): Promise<BillOfLading[]> => {
  try {
    const data = await getDocs(blsCollectionRef);
    return data.docs.map(doc => {
      const blData = doc.data();
      return {
        ...blData,
        id: doc.id,
        createdAt: blData.createdAt instanceof Timestamp ? blData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as BillOfLading;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by newest first
  } catch (e: any) {
     if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch BLs.", e);
    } else {
      console.error("Error getting documents (BLs): ", e);
    }
    return [];
  }
};

export const getBLByIdFromFirestore = async (blId: string): Promise<BillOfLading | null> => {
  try {
    const blDocRef = doc(db, "billsOfLading", blId);
    const blSnap = await getDoc(blDocRef);
    if (blSnap.exists()) {
      const blData = blSnap.data();
      return {
        ...blData,
        id: blSnap.id,
        createdAt: blData.createdAt instanceof Timestamp ? blData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as BillOfLading;
    } else {
      console.log("No such document for BL ID:", blId);
      return null;
    }
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch BL with ID: ${blId}.`, e);
    } else {
      console.error(`Error getting document (BL ${blId}): `, e);
    }
    return null;
  }
};

export const getBLsByClientIdFromFirestore = async (clientId: string): Promise<BillOfLading[]> => {
  try {
    const q = query(blsCollectionRef, where("clientId", "==", clientId));
    const data = await getDocs(q);
    return data.docs.map(doc => {
      const blData = doc.data();
      return {
        ...blData,
        id: doc.id,
        createdAt: blData.createdAt instanceof Timestamp ? blData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as BillOfLading;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch BLs for client ID: ${clientId}.`, e);
    } else {
      console.error(`Error getting documents (BLs for client ${clientId}): `, e);
    }
    return [];
  }
};


export const updateBLInFirestore = async (blId: string, updatedData: Partial<Omit<BillOfLading, 'id' | 'createdAt' | 'createdByUserId'>>) => {
  const blDoc = doc(db, "billsOfLading", blId);
  try {
    await updateDoc(blDoc, updatedData);
  } catch (e) {
    console.error("Error updating document (BL): ", e);
    throw e;
  }
};

export const deleteBLFromFirestore = async (blId: string) => {
  const blDocRef = doc(db, "billsOfLading", blId);
  try {
    const blSnap = await getDoc(blDocRef);
    if (blSnap.exists()) {
        const blData = blSnap.data() as BillOfLading;
        // Remove BL ID from client's blIds array
        if (blData.clientId) {
            const clientDocRef = doc(db, "clients", blData.clientId);
            const clientSnap = await getDoc(clientDocRef);
            if (clientSnap.exists()) {
                const clientData = clientSnap.data() as Client;
                const updatedBlIds = (clientData.blIds || []).filter(id => id !== blId);
                await updateDoc(clientDocRef, { blIds: updatedBlIds });
            }
        }
    }
    // TODO: Delete associated expenses when expenses are migrated to Firestore.
    await deleteDoc(blDocRef);
  } catch (e) {
    console.error("Error deleting document (BL): ", e);
    throw e;
  }
};


// --- Legacy Mock Data Functions (to be phased out or adapted for other entities) ---
/*
export const addBL = (bl: BillOfLading) => {
  MOCK_BILLS_OF_LADING.push(bl);
};
export const updateBL = (updatedBL: BillOfLading) => {
  MOCK_BILLS_OF_LADING = MOCK_BILLS_OF_LADING.map(bl => bl.id === updatedBL.id ? { ...bl, ...updatedBL } : bl);
};
export const deleteBL = (blId: string) => {
  MOCK_BILLS_OF_LADING = MOCK_BILLS_OF_LADING.filter(bl => bl.id !== blId);
  MOCK_EXPENSES = MOCK_EXPENSES.filter(exp => exp.blId !== blId); 
};
*/

export const addExpense = (expense: Expense) => {
  MOCK_EXPENSES.push(expense);
};
export const deleteExpense = (expenseId: string) => {
  MOCK_EXPENSES = MOCK_EXPENSES.filter(exp => exp.id !== expenseId);
};

export const addWorkType = (workType: WorkType) => {
  MOCK_WORK_TYPES.push(workType);
};
export const updateWorkType = (updatedWorkType: WorkType) => {
  MOCK_WORK_TYPES = MOCK_WORK_TYPES.map(wt => wt.id === updatedWorkType.id ? { ...wt, ...updatedWorkType } : wt);
};
export const deleteWorkType = (workTypeId: string) => {
  MOCK_WORK_TYPES = MOCK_WORK_TYPES.filter(wt => wt.id !== workTypeId);
};

export const addChatMessage = (text: string, senderId: string, senderName: string): ChatMessage => {
  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    senderId,
    senderName,
    text,
    timestamp: new Date().toISOString(),
  };
  MOCK_CHAT_MESSAGES.push(newMessage);
  return newMessage;
};

export const addTodoItem = (
    text: string, 
    createdByUserId: string, 
    createdByName: string, 
    assignedToUserId?: string, 
    assignedToUserName?: string
): TodoItem => {
  const newTodo: TodoItem = {
    id: `todo-${Date.now()}`,
    text,
    assignedToUserId,
    assignedToUserName,
    completed: false,
    createdAt: new Date().toISOString(),
    createdByUserId,
    createdByName,
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
