
import type { Client, BillOfLading, Expense, User, WorkType, ChatMessage, TodoItem, UserProfile, ApprovalRequest, ApprovalRequestStatus, ApprovalRequestEntityType, ApprovalRequestActionType } from './types';
import { db } from '@/lib/firebase/config';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  serverTimestamp,
  Timestamp,
  query, 
  where,
  orderBy, 
  arrayUnion,
  arrayRemove,
  deleteField // Ensure deleteField is imported
} from "firebase/firestore";

export let MOCK_USERS: User[] = [
  { id: 'user-1-mock', name: 'Alice Employee (Mock)', role: 'employee' },
  { id: 'user-2-mock', name: 'Bob Admin (Mock)', role: 'admin' },
  { id: 'user-3-mock', name: 'Charlie Collaborator (Mock)', role: 'employee'},
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

const usersCollectionRef = collection(db, "users");
const clientsCollectionRef = collection(db, "clients");
const blsCollectionRef = collection(db, "billsOfLading");
const expensesCollectionRef = collection(db, "expenses");
const workTypesCollectionRef = collection(db, "workTypes");
const approvalRequestsCollectionRef = collection(db, "approvalRequests");

// User Profile CRUD with Firestore
export const createUserProfile = async (uid: string, email: string | null, displayName: string | null, role: 'admin' | 'employee' = 'employee'): Promise<void> => {
  const userProfileDocRef = doc(db, "users", uid);
  try {
    await setDoc(userProfileDocRef, {
      uid, 
      email,
      displayName: displayName || email, 
      role,
      createdAt: serverTimestamp() 
    }, { merge: true }); 
  } catch (e) {
    console.error("Error creating/updating user profile: ", e);
    throw e;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userProfileDocRef = doc(db, "users", uid);
  try {
    const docSnap = await getDoc(userProfileDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as UserProfile;
    } else {
      console.log("No such user profile for UID:", uid);
      return null;
    }
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch user profile for UID: ${uid}. `, e);
    } else {
      console.error(`Error getting user profile (UID ${uid}): `, e);
    }
    return null;
  }
};


// Client CRUD with Firestore
export const addClientToFirestore = async (clientData: Omit<Client, 'id' | 'createdAt' | 'blIds'> & { createdByUserId: string }) => {
  try {
    const docRef = await addDoc(clientsCollectionRef, {
      ...clientData,
      blIds: [], 
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
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(
        "Firestore permission denied while trying to fetch clients. " +
        "Please check your Firestore security rules in the Firebase console for the 'clients' collection. ",
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
      console.error(`Firestore permission denied while trying to fetch client with ID: ${clientId}. Check rules for 'clients' collection.`, e);
    } else {
      console.error(`Error getting document (client ${clientId}): `, e);
    }
    return null;
  }
};

export const updateClientInFirestore = async (clientId: string, updatedData: Partial<Omit<Client, 'id' | 'createdAt' | 'createdByUserId' | 'blIds'>>) => {
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
    // Before deleting the client, find all BLs associated with this client
    const blsQuery = query(blsCollectionRef, where("clientId", "==", clientId));
    const blsSnapshot = await getDocs(blsQuery);
    const deleteBLPromises = blsSnapshot.docs.map(blDoc => deleteBLFromFirestore(blDoc.id)); // This will also handle their expenses
    await Promise.all(deleteBLPromises);

    // Now delete the client
    await deleteDoc(clientDoc);
  } catch (e) {
    console.error("Error deleting document (client and associated BLs/expenses): ", e);
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
    if (blData.clientId) {
        const clientDocRef = doc(db, "clients", blData.clientId);
        await updateDoc(clientDocRef, {
            blIds: arrayUnion(docRef.id)
        }).catch(err => console.error("Failed to update client with new BL ID:", err));
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
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e: any) {
     if (e.code === 'permission-denied') {
      console.error(
        "Firestore permission denied while trying to fetch Bills of Lading. " +
        "Please check your Firestore security rules for the 'billsOfLading' collection.",
        e
      );
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
      console.error(`Firestore permission denied while trying to fetch BL with ID: ${blId}. Check rules for 'billsOfLading' collection.`, e);
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
      console.error(`Firestore permission denied while trying to fetch BLs for client ID: ${clientId}. Check rules for 'billsOfLading' collection.`, e);
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
        const blData = blSnap.data(); 
        if (blData && blData.clientId) {
            const clientDocRef = doc(db, "clients", blData.clientId);
            await updateDoc(clientDocRef, {
                blIds: arrayRemove(blId)
            }).catch(err => console.error("Failed to remove BL ID from client:", err));
        }
        // Also delete all expenses associated with this BL
        const expensesQuery = query(expensesCollectionRef, where("blId", "==", blId));
        const expensesSnapshot = await getDocs(expensesQuery);
        const deleteExpensePromises = expensesSnapshot.docs.map(expenseDoc => deleteDoc(doc(db, "expenses", expenseDoc.id)));
        await Promise.all(deleteExpensePromises);
    }
    await deleteDoc(blDocRef);
  } catch (e) {
    console.error("Error deleting document (BL and associated data): ", e);
    throw e;
  }
};

// Expense CRUD with Firestore
export const addExpenseToFirestore = async (expenseData: Omit<Expense, 'id' | 'date'>) => {
  try {
    const docRef = await addDoc(expensesCollectionRef, {
      ...expenseData,
      date: serverTimestamp() 
    });
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
      const newExpenseData = newDocSnap.data();
      return { 
        ...newExpenseData,
        id: newDocSnap.id, 
        date: newExpenseData.date instanceof Timestamp ? newExpenseData.date.toDate().toISOString() : new Date().toISOString() 
      } as Expense;
    }
    // Fallback, should ideally not be reached if newDocSnap exists
    return { ...expenseData, id: docRef.id, date: new Date().toISOString() } as Expense;
  } catch (e) {
    console.error("Error adding document (expense): ", e);
    throw e;
  }
};

export const getExpensesFromFirestore = async (): Promise<Expense[]> => {
  try {
    const data = await getDocs(expensesCollectionRef);
    return data.docs.map(doc => {
      const expenseData = doc.data();
      return {
        ...expenseData,
        id: doc.id,
        date: expenseData.date instanceof Timestamp ? expenseData.date.toDate().toISOString() : new Date().toISOString(),
      } as Expense;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch expenses. Check rules for 'expenses' collection.", e);
    } else {
      console.error("Error getting documents (expenses): ", e);
    }
    return [];
  }
};

export const getExpensesByBlIdFromFirestore = async (blId: string): Promise<Expense[]> => {
  try {
    const q = query(expensesCollectionRef, where("blId", "==", blId));
    const data = await getDocs(q);
    return data.docs.map(doc => {
      const expenseData = doc.data();
      return {
        ...expenseData,
        id: doc.id,
        date: expenseData.date instanceof Timestamp ? expenseData.date.toDate().toISOString() : new Date().toISOString(),
      } as Expense;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch expenses for BL ID: ${blId}. Check rules for 'expenses' collection.`, e);
    } else {
      console.error(`Error getting documents (expenses for BL ${blId}): `, e);
    }
    return [];
  }
};

export const deleteExpenseFromFirestore = async (expenseId: string) => {
  const expenseDoc = doc(db, "expenses", expenseId);
  try {
    await deleteDoc(expenseDoc);
  } catch (e) {
    console.error("Error deleting document (expense): ", e);
    throw e;
  }
};


// WorkType CRUD with Firestore
export const addWorkTypeToFirestore = async (workTypeData: Omit<WorkType, 'id' | 'createdAt'> & { createdByUserId: string }) => {
  try {
    const docRef = await addDoc(workTypesCollectionRef, {
      ...workTypeData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document (work type): ", e);
    throw e;
  }
};

export const getWorkTypesFromFirestore = async (): Promise<WorkType[]> => {
  try {
    const data = await getDocs(workTypesCollectionRef);
    return data.docs.map(docSnap => { 
      const workTypeData = docSnap.data();
      return {
        ...workTypeData,
        id: docSnap.id,
        createdAt: workTypeData.createdAt instanceof Timestamp ? workTypeData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as WorkType;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch work types. Check rules for 'workTypes' collection.", e);
    } else {
      console.error("Error getting documents (work types): ", e);
    }
    return [];
  }
};

export const getWorkTypeByIdFromFirestore = async (workTypeId: string): Promise<WorkType | null> => {
  try {
    const workTypeDocRef = doc(db, "workTypes", workTypeId);
    const workTypeSnap = await getDoc(workTypeDocRef);
    if (workTypeSnap.exists()) {
      const workTypeData = workTypeSnap.data();
      return {
        ...workTypeData,
        id: workTypeSnap.id,
        createdAt: workTypeData.createdAt instanceof Timestamp ? workTypeData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as WorkType;
    } else {
      console.log("No such document for work type ID:", workTypeId);
      return null;
    }
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch work type with ID: ${workTypeId}. Check rules for 'workTypes' collection.`, e);
    } else {
      console.error(`Error getting document (work type ${workTypeId}): `, e);
    }
    return null;
  }
};

export const updateWorkTypeInFirestore = async (workTypeId: string, updatedData: Partial<Omit<WorkType, 'id' | 'createdAt' | 'createdByUserId'>>) => {
  const workTypeDoc = doc(db, "workTypes", workTypeId);
  try {
    await updateDoc(workTypeDoc, updatedData);
  } catch (e) {
    console.error("Error updating document (work type): ", e);
    throw e;
  }
};

export const deleteWorkTypeFromFirestore = async (workTypeId: string) => {
  const workTypeDoc = doc(db, "workTypes", workTypeId);
  try {
    await deleteDoc(workTypeDoc);
  } catch (e) {
    console.error("Error deleting document (work type): ", e);
    throw e;
  }
};

// Approval Request Service
export const addApprovalRequestToFirestore = async (
  requestData: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status' | 'processedAt' | 'adminNotes' | 'processedByUserId' | 'pinCode' | 'pinExpiresAt' >
): Promise<ApprovalRequest> => {
  try {
    const docRef = await addDoc(approvalRequestsCollectionRef, {
      ...requestData,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    const newDocSnap = await getDoc(docRef); 
    if (newDocSnap.exists()) {
      const data = newDocSnap.data();
      return {
        id: newDocSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as ApprovalRequest;
    }
    // Fallback, should ideally not be reached
    return { 
      ...requestData, 
      id: docRef.id, 
      status: 'pending', 
      createdAt: new Date().toISOString() 
    } as ApprovalRequest;
  } catch (e) {
    console.error("Error adding approval request document: ", e);
    throw e;
  }
};

export const getApprovalRequestsFromFirestore = async (status?: ApprovalRequestStatus): Promise<ApprovalRequest[]> => {
  try {
    let q = query(approvalRequestsCollectionRef, orderBy("createdAt", "desc"));
    if (status) {
      q = query(approvalRequestsCollectionRef, where("status", "==", status), orderBy("createdAt", "desc"));
    }
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const reqData = docSnap.data();
      return {
        ...reqData,
        id: docSnap.id,
        createdAt: reqData.createdAt instanceof Timestamp ? reqData.createdAt.toDate().toISOString() : new Date().toISOString(),
        processedAt: reqData.processedAt instanceof Timestamp ? reqData.processedAt.toDate().toISOString() : undefined,
        pinExpiresAt: reqData.pinExpiresAt ? (reqData.pinExpiresAt instanceof Timestamp ? reqData.pinExpiresAt.toDate().toISOString() : reqData.pinExpiresAt) : undefined,
      } as ApprovalRequest;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch approval requests. Check rules for 'approvalRequests' collection.", e);
    } else {
      console.error("Error getting documents (approval requests): ", e);
    }
    return [];
  }
};

export const updateApprovalRequestStatusInFirestore = async (
  requestId: string, 
  newStatus: ApprovalRequestStatus, 
  adminNotes?: string,
  processedByUserId?: string,
  pinCode?: string,
  pinExpiresAt?: Date 
): Promise<void> => {
  const requestDoc = doc(db, "approvalRequests", requestId);
  try {
    const updateData: any = { 
      status: newStatus, 
      processedAt: serverTimestamp(), 
      processedByUserId: processedByUserId,
    };
    if (adminNotes !== undefined) { 
      updateData.adminNotes = adminNotes;
    }
    if (pinCode !== undefined) {
      updateData.pinCode = pinCode;
    } else if (newStatus !== 'pin_issued' && newStatus !== 'pending') { // Remove pin if not issuing or pending
        updateData.pinCode = deleteField();
    }

    if (pinExpiresAt !== undefined) {
      updateData.pinExpiresAt = Timestamp.fromDate(pinExpiresAt); 
    } else if (newStatus !== 'pin_issued' && newStatus !== 'pending') {
        updateData.pinExpiresAt = deleteField();
    }
    await updateDoc(requestDoc, updateData);
  } catch (e) {
    console.error("Error updating document (approval request status): ", e);
    throw e;
  }
};

export const getPinIssuedRequestForEntity = async (
  entityType: ApprovalRequestEntityType,
  entityId: string,
  actionType: ApprovalRequestActionType
): Promise<ApprovalRequest | null> => {
  const q = query(
    approvalRequestsCollectionRef,
    where("entityType", "==", entityType),
    where("entityId", "==", entityId),
    where("actionType", "==", actionType),
    where("status", "==", "pin_issued")
  );

  try {
    const querySnapshot = await getDocs(q);
    for (const docSnap of querySnapshot.docs) {
      const requestData = docSnap.data();
      const request = {
        id: docSnap.id,
        ...requestData,
        createdAt: requestData.createdAt instanceof Timestamp ? requestData.createdAt.toDate().toISOString() : new Date().toISOString(),
        processedAt: requestData.processedAt instanceof Timestamp ? requestData.processedAt.toDate().toISOString() : undefined,
        pinExpiresAt: requestData.pinExpiresAt instanceof Timestamp ? requestData.pinExpiresAt.toDate().toISOString() : requestData.pinExpiresAt,
      } as ApprovalRequest;

      if (request.pinCode && request.pinExpiresAt && new Date() < new Date(request.pinExpiresAt)) {
        return request; // Return the first valid, non-expired PIN_issued request
      }
    }
    return null;
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch PIN request for ${entityType} ${entityId}. Check rules for 'approvalRequests' collection.`, e);
    } else {
      console.error(`Error getting PIN request document for ${entityType} ${entityId}: `, e);
    }
    return null;
  }
};

export const completeApprovalRequestWithPin = async (requestId: string): Promise<void> => {
  const requestDoc = doc(db, "approvalRequests", requestId);
  try {
    await updateDoc(requestDoc, {
      status: 'completed',
      pinCode: deleteField(), 
      pinExpiresAt: deleteField(),
      processedAt: serverTimestamp() 
    });
  } catch (e) {
    console.error(`Error completing approval request ${requestId} with PIN: `, e);
    throw e;
  }
};


// Mock Chat & Todo (kept for now, could be migrated to Firestore too)
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

export const getEmployeeNameFromMock = (employeeId?: string): string => {
    if (!employeeId) return 'N/A';
    const mockUser = MOCK_USERS.find(u => u.id === employeeId);
    if (mockUser) return mockUser.name;
    
    
    if (employeeId.length > 10 && !employeeId.startsWith('user-')) { 
        return `Utilisateur (${employeeId.substring(0,6)}...)`;
    }
    return 'Utilisateur Inconnu'; 
};
