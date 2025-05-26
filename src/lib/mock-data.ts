
import type { Client, BillOfLading, Expense, User, WorkType, ChatMessage, TodoItem, UserProfile, ApprovalRequest, ApprovalRequestStatus, ApprovalRequestEntityType, ApprovalRequestActionType, SessionAuditEvent } from './types';
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
  deleteField,
  onSnapshot,
  limit,
  writeBatch
} from "firebase/firestore";
import { formatISO, parseISO } from 'date-fns';


export let MOCK_USERS: User[] = [
  { id: 'user-1-mock', name: 'Alice Employee (Mock)', role: 'employee' },
  { id: 'user-2-mock', name: 'Bob Admin (Mock)', role: 'admin' },
  { id: 'user-3-mock', name: 'Charlie Collaborator (Mock)', role: 'employee'},
];


const usersCollectionRef = collection(db, "users");
const clientsCollectionRef = collection(db, "clients");
const blsCollectionRef = collection(db, "billsOfLading");
const expensesCollectionRef = collection(db, "expenses");
const workTypesCollectionRef = collection(db, "workTypes");
const approvalRequestsCollectionRef = collection(db, "approvalRequests");
const chatMessagesCollectionRef = collection(db, "chatMessages");
const todoItemsCollectionRef = collection(db, "todoItems");
const auditLogSessionsCollectionRef = collection(db, "auditLogSessions");


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

export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    const querySnapshot = await getDocs(query(usersCollectionRef, orderBy("createdAt", "desc")));
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as UserProfile;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch all user profiles. Check rules for 'users' collection (admin access).", e);
    } else {
      console.error("Error getting all user profiles: ", e);
    }
    return [];
  }
};


export const updateUserProfileInFirestore = async (uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'role' >>): Promise<void> => {
  const userProfileDocRef = doc(db, "users", uid);
  try {
    await updateDoc(userProfileDocRef, data);
  } catch (e) {
    console.error(`Error updating user profile in Firestore for UID ${uid}: `, e);
    throw e;
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
    const q = query(clientsCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
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
  const batch = writeBatch(db);
  try {
    const clientSnapshot = await getDoc(clientDoc);
    if (clientSnapshot.exists()) {
        const clientData = clientSnapshot.data();
        if (clientData && clientData.blIds && clientData.blIds.length > 0) {
            for (const blId of clientData.blIds) {
                const blDocRef = doc(db, "billsOfLading", blId);
                batch.delete(blDocRef);
                // Also delete expenses associated with this BL
                const expensesQuery = query(expensesCollectionRef, where("blId", "==", blId));
                const expensesSnapshot = await getDocs(expensesQuery);
                expensesSnapshot.forEach(expenseDoc => {
                    batch.delete(expenseDoc.ref);
                });
            }
        }
    }
    batch.delete(clientDoc);
    await batch.commit();
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
    const q = query(blsCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const blData = docSnap.data();
      return {
        ...blData,
        id: docSnap.id,
        createdAt: blData.createdAt instanceof Timestamp ? blData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as BillOfLading;
    });
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
    const q = query(blsCollectionRef, where("clientId", "==", clientId), orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const blData = docSnap.data();
      return {
        ...blData,
        id: docSnap.id,
        createdAt: blData.createdAt instanceof Timestamp ? blData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as BillOfLading;
    });
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
  const batch = writeBatch(db);
  try {
    const blSnap = await getDoc(blDocRef);
    if (blSnap.exists()) {
        const blData = blSnap.data();
        if (blData && blData.clientId) {
            const clientDocRef = doc(db, "clients", blData.clientId);
            batch.update(clientDocRef, { blIds: arrayRemove(blId) });
        }
        const expensesQuery = query(expensesCollectionRef, where("blId", "==", blId));
        const expensesSnapshot = await getDocs(expensesQuery);
        expensesSnapshot.forEach(expenseDoc => batch.delete(expenseDoc.ref));
    }
    batch.delete(blDocRef);
    await batch.commit();
  } catch (e) {
    console.error("Error deleting document (BL and associated data): ", e);
    throw e;
  }
};

// Expense CRUD with Firestore
export const addExpenseToFirestore = async (expenseData: Omit<Expense, 'id' | 'date'> & { date?: string }) => { // Allow optional date string
  try {
    const dataToSave: any = {
      ...expenseData,
      date: expenseData.date ? Timestamp.fromDate(parseISO(expenseData.date)) : serverTimestamp()
    };
    // if (expenseData.date === undefined) delete dataToSave.date; // remove if truly meant to be serverTimestamp

    const docRef = await addDoc(expensesCollectionRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
      const newExpenseData = newDocSnap.data();
      return {
        ...newExpenseData,
        id: newDocSnap.id,
        date: newExpenseData.date instanceof Timestamp ? newExpenseData.date.toDate().toISOString() : new Date().toISOString()
      } as Expense;
    }
    // Fallback
    return { ...expenseData, id: docRef.id, date: new Date().toISOString() } as Expense;
  } catch (e) {
    console.error("Error adding document (expense): ", e);
    throw e;
  }
};

export const getExpensesFromFirestore = async (): Promise<Expense[]> => {
  try {
    const q = query(expensesCollectionRef, orderBy("date", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const expenseData = docSnap.data();
      return {
        ...expenseData,
        id: docSnap.id,
        date: expenseData.date instanceof Timestamp ? expenseData.date.toDate().toISOString() : new Date().toISOString(),
      } as Expense;
    });
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
  const q = query(expensesCollectionRef, where("blId", "==", blId), orderBy("date", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const expenseData = docSnap.data();
    return {
      ...expenseData,
      id: docSnap.id,
      date: expenseData.date instanceof Timestamp ? expenseData.date.toDate().toISOString() : new Date().toISOString()
    } as Expense;
  });
};


export const getExpenseByIdFromFirestore = async (expenseId: string): Promise<Expense | null> => {
  try {
    const expenseDocRef = doc(db, "expenses", expenseId);
    const expenseSnap = await getDoc(expenseDocRef);
    if (expenseSnap.exists()) {
      const expenseData = expenseSnap.data();
      return {
        ...expenseData,
        id: expenseSnap.id,
        date: expenseData.date instanceof Timestamp ? expenseData.date.toDate().toISOString() : new Date().toISOString(),
      } as Expense;
    } else {
      console.log("No such document for expense ID:", expenseId);
      return null;
    }
  } catch (e: any) {
    console.error(`Error getting document (expense ${expenseId}): `, e);
    return null;
  }
};

export const updateExpenseInFirestore = async (expenseId: string, updatedData: Partial<Omit<Expense, 'id'>>) => {
  const expenseDoc = doc(db, "expenses", expenseId);
  try {
    const dataToUpdate: any = { ...updatedData };
    if (updatedData.date) {
      // Ensure the date is correctly parsed if it's a string, or handled if it's already a Timestamp
      if (typeof updatedData.date === 'string') {
        dataToUpdate.date = Timestamp.fromDate(parseISO(updatedData.date));
      } else {
        dataToUpdate.date = updatedData.date; // Assume it's already a Timestamp or compatible
      }
    }
    await updateDoc(expenseDoc, dataToUpdate);
  } catch (e) {
    console.error("Error updating document (expense): ", e);
    throw e;
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
    const q = query(workTypesCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const workTypeData = docSnap.data();
      return {
        ...workTypeData,
        id: docSnap.id,
        createdAt: workTypeData.createdAt instanceof Timestamp ? workTypeData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as WorkType;
    });
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
        status: 'pending', // ensure status is set
      } as ApprovalRequest;
    }
    // Fallback
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
    let q;
    if (status) {
      q = query(approvalRequestsCollectionRef, where("status", "==", status), orderBy("createdAt", "desc"));
    } else {
      q = query(approvalRequestsCollectionRef, orderBy("createdAt", "desc"));
    }
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const reqData = docSnap.data();
      return {
        ...reqData,
        id: docSnap.id,
        createdAt: reqData.createdAt instanceof Timestamp ? reqData.createdAt.toDate().toISOString() : (typeof reqData.createdAt === 'string' ? reqData.createdAt : new Date().toISOString()),
        processedAt: reqData.processedAt instanceof Timestamp ? reqData.processedAt.toDate().toISOString() : (typeof reqData.processedAt === 'string' ? reqData.processedAt : undefined),
        pinExpiresAt: reqData.pinExpiresAt instanceof Timestamp ? reqData.pinExpiresAt.toDate().toISOString() : (typeof reqData.pinExpiresAt === 'string' ? reqData.pinExpiresAt : undefined),
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

export const getApprovalRequestsByUserIdFromFirestore = async (userId: string): Promise<ApprovalRequest[]> => {
  try {
    const q = query(
      approvalRequestsCollectionRef,
      where("requestedByUserId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const reqData = docSnap.data();
      return {
        ...reqData,
        id: docSnap.id,
        createdAt: reqData.createdAt instanceof Timestamp ? reqData.createdAt.toDate().toISOString() : (typeof reqData.createdAt === 'string' ? reqData.createdAt : new Date().toISOString()),
        processedAt: reqData.processedAt instanceof Timestamp ? reqData.processedAt.toDate().toISOString() : (typeof reqData.processedAt === 'string' ? reqData.processedAt : undefined),
        pinExpiresAt: reqData.pinExpiresAt instanceof Timestamp ? reqData.pinExpiresAt.toDate().toISOString() : (typeof reqData.pinExpiresAt === 'string' ? reqData.pinExpiresAt : undefined),
      } as ApprovalRequest;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch approval requests for user ${userId}. Check rules for 'approvalRequests' collection.`, e);
    } else {
      console.error(`Error getting documents (approval requests for user ${userId}): `, e);
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
    };
    if (processedByUserId) {
        updateData.processedByUserId = processedByUserId;
    }

    if (adminNotes !== undefined && adminNotes !== null && adminNotes.trim() !== "") {
      updateData.adminNotes = adminNotes;
    } else if (adminNotes === '' || adminNotes === null || adminNotes === undefined) { 
      updateData.adminNotes = deleteField();
    }


    if (pinCode !== undefined) {
      updateData.pinCode = pinCode;
    } else if (newStatus !== 'pin_issued' && newStatus !== 'pending') {
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
        processedAt: requestData.processedAt instanceof Timestamp ? requestData.processedAt.toDate().toISOString() : (typeof requestData.processedAt === 'string' ? requestData.processedAt : undefined),
        pinExpiresAt: requestData.pinExpiresAt instanceof Timestamp ? requestData.pinExpiresAt.toDate().toISOString() : (typeof requestData.pinExpiresAt === 'string' ? requestData.pinExpiresAt : undefined),
      } as ApprovalRequest;

      if (request.pinCode && request.pinExpiresAt && new Date() < new Date(request.pinExpiresAt)) {
        return request;
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


// Chat & Todo with Firestore
export const addChatMessageToFirestore = async (messageData: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> => {
  try {
    const docRef = await addDoc(chatMessagesCollectionRef, {
      ...messageData,
      timestamp: serverTimestamp()
    });
    const newDocSnap = await getDoc(docRef); // Fetch to get server timestamp
    if (newDocSnap.exists()) {
        const data = newDocSnap.data();
        return {
            id: newDocSnap.id,
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
        } as ChatMessage;
    }
    // Fallback, should ideally not happen
    return { ...messageData, id: docRef.id, timestamp: new Date().toISOString() } as ChatMessage;
  } catch (error) {
    console.error("Error adding chat message to Firestore: ", error);
    throw error;
  }
};

export const getChatMessagesFromFirestore = (callback: (messages: ChatMessage[]) => void): (() => void) => {
  const q = query(chatMessagesCollectionRef, orderBy("timestamp", "asc"), limit(50));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
      } as ChatMessage;
    });
    callback(messages);
  }, (error) => {
    console.error("Error listening to chat messages:", error);
  });
  return unsubscribe;
};


export const addTodoItemToFirestore = async (todoData: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>): Promise<TodoItem> => {
   try {
    const docRef = await addDoc(todoItemsCollectionRef, {
      ...todoData,
      completed: false,
      createdAt: serverTimestamp()
    });
    const newDocSnap = await getDoc(docRef); // Fetch to get server timestamp
    if (newDocSnap.exists()) {
        const data = newDocSnap.data();
        return {
            id: newDocSnap.id,
            ...data,
            completed: data.completed, // Should be false
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as TodoItem;
    }
    // Fallback
    return { ...todoData, id: docRef.id, createdAt: new Date().toISOString(), completed: false } as TodoItem;
  } catch (error) {
    console.error("Error adding todo item to Firestore: ", error);
    throw error;
  }
};

export const getTodoItemsFromFirestore = (callback: (todos: TodoItem[]) => void): (() => void) => {
  const q = query(todoItemsCollectionRef, orderBy("createdAt", "desc"));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const todos = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as TodoItem;
    });
    callback(todos);
  }, (error) => {
    console.error("Error listening to todo items:", error);
  });
  return unsubscribe;
};

export const updateTodoItemInFirestore = async (todoId: string, updates: Partial<Omit<TodoItem, 'id' | 'createdAt' | 'createdByUserId' | 'createdByName'>>): Promise<void> => {
  const todoDoc = doc(db, "todoItems", todoId);
  try {
    await updateDoc(todoDoc, updates);
  } catch (error) {
    console.error(`Error updating todo item ${todoId}: `, error);
    throw error;
  }
};

export const deleteTodoItemFromFirestore = async (todoId: string): Promise<void> => {
  const todoDoc = doc(db, "todoItems", todoId);
  try {
    await deleteDoc(todoDoc);
  } catch (error) {
    console.error(`Error deleting todo item ${todoId}: `, error);
    throw error;
  }
};


export const getEmployeeNameFromMock = (employeeId?: string): string => {
    if (!employeeId) return 'N/A';
    // In a real app, this would fetch from user profiles in Firestore
    const mockUser = MOCK_USERS.find(u => u.id === employeeId);
    if (mockUser) return mockUser.name;

    // Fallback for Firebase UIDs (if no mock user matches)
    if (employeeId.length > 10 && !employeeId.startsWith('user-')) { // Basic check for UID format
        return `Utilisateur (${employeeId.substring(0,6)}...)`;
    }
    return 'Utilisateur Inconnu';
};

// Session Audit Log
export const logSessionEvent = async (
  userId: string,
  userDisplayName: string | null,
  userEmail: string | null,
  action: 'login' | 'logout'
): Promise<void> => {
  try {
    await addDoc(auditLogSessionsCollectionRef, {
      userId,
      userDisplayName,
      userEmail,
      action,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error logging session event: ", e);
    // Silently fail for now, or implement more robust error handling
  }
};

export const getSessionAuditEvents = async (): Promise<SessionAuditEvent[]> => {
  try {
    const q = query(auditLogSessionsCollectionRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
      } as SessionAuditEvent;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch session audit events. Check admin rules for 'auditLogSessions'.", e);
    } else {
      console.error("Error getting session audit events: ", e);
    }
    return [];
  }
};
