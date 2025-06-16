
import type { Client, BillOfLading, Expense, User, WorkType, ChatMessage, TodoItem, UserProfile, ApprovalRequest, ApprovalRequestStatus, ApprovalRequestEntityType, ApprovalRequestActionType, SessionAuditEvent, CompanyProfile, Container, Truck, Driver, DriverStatus, TruckStatus, Transport, TransportStatus, SecretaryDocument, AccountingEntry, SecretaryDocumentType, SecretaryDocumentStatus, AccountingEntryType, AccountingEntryStatus } from './types';
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
  writeBatch,
} from "firebase/firestore";
import { formatISO, parseISO, addHours } from 'date-fns';


export const MOCK_USERS: User[] = [
  { id: 'user-1-mock', name: 'Alice Employee (Mock)', role: 'employee', jobTitle: 'Agent Opérationnel' },
  { id: 'user-2-mock', name: 'Bob Admin (Mock)', role: 'admin', jobTitle: 'Manager' },
  { id: 'user-3-mock', name: 'Charlie Collaborator (Mock)', role: 'employee', jobTitle: 'Secrétaire' },
  { id: 'user-4-mock', name: 'Diana Accountant (Mock)', role: 'employee', jobTitle: 'Comptable' },
];


const usersCollectionRef = collection(db, "users");
const clientsCollectionRef = collection(db, "clients");
const blsCollectionRef = collection(db, "billsOfLading");
const expensesCollectionRef = collection(db, "expenses");
const workTypesCollectionRef = collection(db, "workTypes");
const containersCollectionRef = collection(db, "containers");
const trucksCollectionRef = collection(db, "trucks");
const driversCollectionRef = collection(db, "drivers");
const transportsCollectionRef = collection(db, "transports");
const approvalRequestsCollectionRef = collection(db, "approvalRequests");
const chatMessagesCollectionRef = collection(db, "chatMessages");
const todoItemsCollectionRef = collection(db, "todoItems");
const auditLogSessionsCollectionRef = collection(db, "auditLogSessions");
const companySettingsDocRef = doc(db, "companySettings", "main");
const secretaryDocumentsCollectionRef = collection(db, "secretaryDocuments");
const accountingEntriesCollectionRef = collection(db, "accountingEntries");


// User Profile CRUD with Firestore
export const createUserProfile = async (
  uid: string,
  email: string | null,
  displayName: string | null,
  role: 'admin' | 'employee' = 'employee',
  jobTitle: UserProfile['jobTitle'] = 'Agent Opérationnel', // Default jobTitle
): Promise<void> => {
  const userProfileDocRef = doc(db, "users", uid);
  try {
    await setDoc(userProfileDocRef, {
      uid,
      email,
      displayName: displayName || email,
      role,
      jobTitle,
      createdAt: serverTimestamp(),
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
        jobTitle: data.jobTitle || 'Agent Opérationnel', // Default if not set
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as UserProfile;
    } else {
      console.log("No such user profile for UID:", uid);
      return null;
    }
  } catch (e: any) {
    if (e.code === 'permission-denied') {
        console.warn(`Firestore permission denied while trying to fetch user profile for UID: ${uid}. This might be expected for non-admins or if rules are restrictive. Error: ${e.message}`);
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
        jobTitle: data.jobTitle || 'Agent Opérationnel', // Default if not set
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


export const updateUserProfileInFirestore = async (uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'role' | 'email' | 'jobTitle' >>): Promise<void> => {
  const userProfileDocRef = doc(db, "users", uid);
  try {
    const updateData: any = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;


    if (Object.keys(updateData).length > 0) {
        await updateDoc(userProfileDocRef, updateData);
    }
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
      createdAt: serverTimestamp(),
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
        e,
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
                await deleteBLFromFirestore(blId); // Use existing function that handles BL and its sub-collections
            }
        }
    }
    batch.delete(clientDoc);
    await batch.commit();
  } catch (e) {
    console.error("Error deleting document (client and associated BLs/expenses/containers): ", e);
    throw e;
  }
};

// BL CRUD with Firestore
export const addBLToFirestore = async (blData: Omit<BillOfLading, 'id' | 'createdAt' | 'containerIds'> & { createdByUserName?: string }) => {
  try {
    const docRef = await addDoc(blsCollectionRef, {
      ...blData,
      containerIds: [], // Initialize with empty array
      createdAt: serverTimestamp(),
      createdByUserName: blData.createdByUserName || 'Utilisateur Inconnu', // Store creator's name
    });
    if (blData.clientId) {
        const clientDocRef = doc(db, "clients", blData.clientId);
        await updateDoc(clientDocRef, {
            blIds: arrayUnion(docRef.id),
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
        containerIds: blData.containerIds || [],
        createdAt: blData.createdAt instanceof Timestamp ? blData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as BillOfLading;
    });
  } catch (e: any) {
     if (e.code === 'permission-denied') {
      console.error(
        "Firestore permission denied while trying to fetch Bills of Lading. " +
        "Please check your Firestore security rules for the 'billsOfLading' collection.",
        e,
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
        containerIds: blData.containerIds || [],
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
        containerIds: blData.containerIds || [],
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
        const blData = blSnap.data() as BillOfLading;
        if (blData && blData.clientId) {
            const clientDocRef = doc(db, "clients", blData.clientId);
            batch.update(clientDocRef, { blIds: arrayRemove(blId) });
        }
        // Delete associated expenses
        const expensesQuery = query(expensesCollectionRef, where("blId", "==", blId));
        const expensesSnapshot = await getDocs(expensesQuery);
        expensesSnapshot.forEach(expenseDoc => batch.delete(expenseDoc.ref));

        // Delete associated containers
        if (blData.containerIds && blData.containerIds.length > 0) {
            for (const containerId of blData.containerIds) {
                const containerDocRef = doc(db, "containers", containerId);
                batch.delete(containerDocRef);
            }
        }
         // Delete associated transports
        const transportsQuery = query(transportsCollectionRef, where("blId", "==", blId));
        const transportsSnapshot = await getDocs(transportsQuery);
        transportsSnapshot.forEach(transportDoc => batch.delete(transportDoc.ref)); // Note: This is a simple delete. Complex scenarios might need more logic.
    }
    batch.delete(blDocRef);
    await batch.commit();
  } catch (e) {
    console.error("Error deleting document (BL and associated data): ", e);
    throw e;
  }
};

// Expense CRUD with Firestore
export const addExpenseToFirestore = async (expenseData: Omit<Expense, 'id' | 'date'> & { date?: string }) => {
  try {
    const dataToSave: any = {
      ...expenseData,
      date: expenseData.date ? Timestamp.fromDate(parseISO(expenseData.date)) : serverTimestamp(),
    };

    const docRef = await addDoc(expensesCollectionRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
      const newExpenseData = newDocSnap.data();
      return {
        ...newExpenseData,
        id: newDocSnap.id,
        date: newExpenseData.date instanceof Timestamp ? newExpenseData.date.toDate().toISOString() : new Date().toISOString(),
      } as Expense;
    }
    // Fallback
    return { ...expenseData, id: docRef.id, date: expenseData.date || new Date().toISOString() } as Expense;
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
      date: expenseData.date instanceof Timestamp ? expenseData.date.toDate().toISOString() : new Date().toISOString(),
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
      if (typeof updatedData.date === 'string') {
        dataToUpdate.date = Timestamp.fromDate(parseISO(updatedData.date));
      } else {
        dataToUpdate.date = updatedData.date;
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
      createdAt: serverTimestamp(),
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

// Container CRUD with Firestore
export const addContainerToFirestore = async (
  containerData: Omit<Container, 'id' | 'createdAt'> & { createdByUserId: string }
): Promise<Container> => {
  const batch = writeBatch(db);
  try {
    const dataToSave: any = { ...containerData, createdAt: serverTimestamp() };
    if (containerData.shippingDate) dataToSave.shippingDate = Timestamp.fromDate(parseISO(containerData.shippingDate));
    if (containerData.dischargeDate) dataToSave.dischargeDate = Timestamp.fromDate(parseISO(containerData.dischargeDate));
    if (containerData.truckLoadingDate) dataToSave.truckLoadingDate = Timestamp.fromDate(parseISO(containerData.truckLoadingDate));
    if (containerData.destinationArrivalDate) dataToSave.destinationArrivalDate = Timestamp.fromDate(parseISO(containerData.destinationArrivalDate));

    const containerDocRef = doc(collection(db, "containers"));
    batch.set(containerDocRef, dataToSave);

    const blDocRef = doc(db, "billsOfLading", containerData.blId);
    batch.update(blDocRef, { containerIds: arrayUnion(containerDocRef.id) });

    await batch.commit();

    const newDocSnap = await getDoc(containerDocRef);
    if (newDocSnap.exists()) {
      const savedData = newDocSnap.data();
      return {
        ...savedData,
        id: newDocSnap.id,
        createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate().toISOString() : new Date().toISOString(),
        shippingDate: savedData.shippingDate instanceof Timestamp ? savedData.shippingDate.toDate().toISOString() : undefined,
        dischargeDate: savedData.dischargeDate instanceof Timestamp ? savedData.dischargeDate.toDate().toISOString() : undefined,
        truckLoadingDate: savedData.truckLoadingDate instanceof Timestamp ? savedData.truckLoadingDate.toDate().toISOString() : undefined,
        destinationArrivalDate: savedData.destinationArrivalDate instanceof Timestamp ? savedData.destinationArrivalDate.toDate().toISOString() : undefined,
      } as Container;
    }
    throw new Error("Failed to retrieve saved container data.");
  } catch (e) {
    console.error("Error adding document (container) and updating BL: ", e);
    throw e;
  }
};

export const getContainersFromFirestore = async (): Promise<Container[]> => {
  try {
    const q = query(containersCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    const containersWithBlNumber = await Promise.all(data.docs.map(async (docSnap) => {
      const containerData = docSnap.data() as Omit<Container, 'blNumber'>;
      let blNumber: string | undefined = undefined;
      if (containerData.blId) {
        const bl = await getBLByIdFromFirestore(containerData.blId);
        blNumber = bl?.blNumber;
      }
      return {
        ...containerData,
        id: docSnap.id,
        blNumber: blNumber,
        createdAt: containerData.createdAt instanceof Timestamp ? containerData.createdAt.toDate().toISOString() : new Date().toISOString(),
        shippingDate: containerData.shippingDate ? (containerData.shippingDate as unknown as Timestamp).toDate().toISOString() : undefined,
        dischargeDate: containerData.dischargeDate ? (containerData.dischargeDate as unknown as Timestamp).toDate().toISOString() : undefined,
        truckLoadingDate: containerData.truckLoadingDate ? (containerData.truckLoadingDate as unknown as Timestamp).toDate().toISOString() : undefined,
        destinationArrivalDate: containerData.destinationArrivalDate ? (containerData.destinationArrivalDate as unknown as Timestamp).toDate().toISOString() : undefined,
      } as Container;
    }));
    return containersWithBlNumber;
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch containers. Check rules.", e);
    } else {
      console.error("Error getting documents (containers): ", e);
    }
    return [];
  }
};


export const getContainerByIdFromFirestore = async (containerId: string): Promise<Container | null> => {
  try {
    const containerDocRef = doc(db, "containers", containerId);
    const containerSnap = await getDoc(containerDocRef);
    if (containerSnap.exists()) {
      const data = containerSnap.data();
      let blNumber: string | undefined = undefined;
      if (data.blId) {
        const bl = await getBLByIdFromFirestore(data.blId);
        blNumber = bl?.blNumber;
      }
      return {
        ...data,
        id: containerSnap.id,
        blNumber: blNumber,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        shippingDate: data.shippingDate instanceof Timestamp ? data.shippingDate.toDate().toISOString() : undefined,
        dischargeDate: data.dischargeDate instanceof Timestamp ? data.dischargeDate.toDate().toISOString() : undefined,
        truckLoadingDate: data.truckLoadingDate instanceof Timestamp ? data.truckLoadingDate.toDate().toISOString() : undefined,
        destinationArrivalDate: data.destinationArrivalDate instanceof Timestamp ? data.destinationArrivalDate.toDate().toISOString() : undefined,
      } as Container;
    } else {
      console.log("No such document for container ID:", containerId);
      return null;
    }
  } catch (e: any) {
     if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch container ${containerId}. Check rules.`, e);
    } else {
      console.error(`Error getting document (container ${containerId}): `, e);
    }
    return null;
  }
};


export const getContainersByBlIdFromFirestore = async (blId: string): Promise<Container[]> => {
  const q = query(containersCollectionRef, where("blId", "==", blId), orderBy("createdAt", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        shippingDate: data.shippingDate instanceof Timestamp ? data.shippingDate.toDate().toISOString() : undefined,
        dischargeDate: data.dischargeDate instanceof Timestamp ? data.dischargeDate.toDate().toISOString() : undefined,
        truckLoadingDate: data.truckLoadingDate instanceof Timestamp ? data.truckLoadingDate.toDate().toISOString() : undefined,
        destinationArrivalDate: data.destinationArrivalDate instanceof Timestamp ? data.destinationArrivalDate.toDate().toISOString() : undefined,
      } as Container;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch containers for BL ID: ${blId}. Check rules.`, e);
    } else {
      console.error(`Error getting documents (containers for BL ${blId}): `, e);
    }
    return [];
  }
};

export const updateContainerInFirestore = async (
  containerId: string,
  updatedData: Partial<Omit<Container, 'id' | 'createdAt' | 'blId' | 'createdByUserId'>>
): Promise<void> => {
  const containerDoc = doc(db, "containers", containerId);
  try {
    const dataToUpdate: any = { ...updatedData };
    if (updatedData.shippingDate) dataToUpdate.shippingDate = updatedData.shippingDate ? Timestamp.fromDate(parseISO(updatedData.shippingDate)) : deleteField();
    else if (updatedData.shippingDate === null || updatedData.shippingDate === '') dataToUpdate.shippingDate = deleteField();

    if (updatedData.dischargeDate) dataToUpdate.dischargeDate = updatedData.dischargeDate ? Timestamp.fromDate(parseISO(updatedData.dischargeDate)) : deleteField();
    else if (updatedData.dischargeDate === null || updatedData.dischargeDate === '') dataToUpdate.dischargeDate = deleteField();

    if (updatedData.truckLoadingDate) dataToUpdate.truckLoadingDate = updatedData.truckLoadingDate ? Timestamp.fromDate(parseISO(updatedData.truckLoadingDate)) : deleteField();
    else if (updatedData.truckLoadingDate === null || updatedData.truckLoadingDate === '') dataToUpdate.truckLoadingDate = deleteField();

    if (updatedData.destinationArrivalDate) dataToUpdate.destinationArrivalDate = updatedData.destinationArrivalDate ? Timestamp.fromDate(parseISO(updatedData.destinationArrivalDate)) : deleteField();
    else if (updatedData.destinationArrivalDate === null || updatedData.destinationArrivalDate === '') dataToUpdate.destinationArrivalDate = deleteField();

    await updateDoc(containerDoc, dataToUpdate);
  } catch (e) {
    console.error("Error updating document (container): ", e);
    throw e;
  }
};

export const deleteContainerFromFirestore = async (containerId: string, blId: string): Promise<void> => {
  const batch = writeBatch(db);
  try {
    const containerDocRef = doc(db, "containers", containerId);
    batch.delete(containerDocRef);

    const blDocRef = doc(db, "billsOfLading", blId);
    batch.update(blDocRef, { containerIds: arrayRemove(containerId) });

    await batch.commit();
  } catch (e) {
    console.error("Error deleting document (container) and updating BL: ", e);
    throw e;
  }
};


// Truck CRUD with Firestore
export const addTruckToFirestore = async (truckData: Omit<Truck, 'id' | 'createdAt'> & { createdByUserId: string }): Promise<Truck> => {
  try {
    const dataToSave: any = {
      ...truckData,
      currentDriverId: truckData.currentDriverId || null,
      currentDriverName: truckData.currentDriverName || null,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(trucksCollectionRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
      const savedData = newDocSnap.data();
      return {
        ...savedData,
        id: newDocSnap.id,
        createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Truck;
    }
    throw new Error("Failed to retrieve saved truck data.");
  } catch (e) {
    console.error("Error adding document (truck): ", e);
    throw e;
  }
};

export const getTrucksFromFirestore = async (): Promise<Truck[]> => {
  try {
    const q = query(trucksCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const truckData = docSnap.data();
      return {
        ...truckData,
        id: docSnap.id,
        createdAt: truckData.createdAt instanceof Timestamp ? truckData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Truck;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch trucks. Check rules for 'trucks' collection.", e);
    } else {
      console.error("Error getting documents (trucks): ", e);
    }
    return [];
  }
};

export const getTruckByIdFromFirestore = async (truckId: string): Promise<Truck | null> => {
  try {
    const truckDocRef = doc(db, "trucks", truckId);
    const truckSnap = await getDoc(truckDocRef);
    if (truckSnap.exists()) {
      const truckData = truckSnap.data();
      return {
        ...truckData,
        id: truckSnap.id,
        createdAt: truckData.createdAt instanceof Timestamp ? truckData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Truck;
    } else {
      console.log("No such document for truck ID:", truckId);
      return null;
    }
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch truck with ID: ${truckId}. Check rules for 'trucks' collection.`, e);
    } else {
      console.error(`Error getting document (truck ${truckId}): `, e);
    }
    return null;
  }
};

export const updateTruckInFirestore = async (truckId: string, updatedData: Partial<Omit<Truck, 'id' | 'createdAt' | 'createdByUserId'>>): Promise<void> => {
  const truckDoc = doc(db, "trucks", truckId);
  try {
    const dataToUpdate: any = { ...updatedData };
    // Ensure null is used if undefined or explicitly set to null for currentDriverId/Name
    if (updatedData.currentDriverId === undefined || updatedData.currentDriverId === null) {
        dataToUpdate.currentDriverId = null;
    }
    if (updatedData.currentDriverName === undefined || updatedData.currentDriverName === null) {
        dataToUpdate.currentDriverName = null;
    }
    await updateDoc(truckDoc, dataToUpdate);
  } catch (e) {
    console.error("Error updating document (truck): ", e);
    throw e;
  }
};

export const deleteTruckFromFirestore = async (truckId: string): Promise<void> => {
  const truckDoc = doc(db, "trucks", truckId);
  try {
    const truckSnap = await getDoc(truckDoc);
    if (truckSnap.exists()) {
        const truckData = truckSnap.data() as Truck;
        if (truckData.currentDriverId) {
            const driverDocRef = doc(db, "drivers", truckData.currentDriverId);
            await updateDoc(driverDocRef, {
                currentTruckId: null,
                currentTruckReg: null,
                status: 'available' as DriverStatus
            });
        }
    }
    await deleteDoc(truckDoc);
  } catch (e) {
    console.error("Error deleting document (truck): ", e);
    throw e;
  }
};

// Driver CRUD with Firestore
export const addDriverToFirestore = async (driverData: Omit<Driver, 'id' | 'createdAt'> & { createdByUserId: string }): Promise<Driver> => {
  try {
    const dataToSave: any = {
      ...driverData,
      currentTruckId: driverData.currentTruckId || null,
      currentTruckReg: driverData.currentTruckReg || null,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(driversCollectionRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
      const savedData = newDocSnap.data();
      return {
        ...savedData,
        id: newDocSnap.id,
        createdAt: savedData.createdAt instanceof Timestamp ? savedData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Driver;
    }
    throw new Error("Failed to retrieve saved driver data.");
  } catch (e) {
    console.error("Error adding document (driver): ", e);
    throw e;
  }
};

export const getDriversFromFirestore = async (): Promise<Driver[]> => {
  try {
    const q = query(driversCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const driverData = docSnap.data();
      return {
        ...driverData,
        id: docSnap.id,
        createdAt: driverData.createdAt instanceof Timestamp ? driverData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Driver;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch drivers. Check rules for 'drivers' collection.", e);
    } else {
      console.error("Error getting documents (drivers): ", e);
    }
    return [];
  }
};

export const getDriverByIdFromFirestore = async (driverId: string): Promise<Driver | null> => {
  try {
    const driverDocRef = doc(db, "drivers", driverId);
    const driverSnap = await getDoc(driverDocRef);
    if (driverSnap.exists()) {
      const driverData = driverSnap.data();
      return {
        ...driverData,
        id: driverSnap.id,
        createdAt: driverData.createdAt instanceof Timestamp ? driverData.createdAt.toDate().toISOString() : new Date().toISOString(),
      } as Driver;
    } else {
      console.log("No such document for driver ID:", driverId);
      return null;
    }
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error(`Firestore permission denied while trying to fetch driver with ID: ${driverId}. Check rules for 'drivers' collection.`, e);
    } else {
      console.error(`Error getting document (driver ${driverId}): `, e);
    }
    return null;
  }
};

export const updateDriverInFirestore = async (driverId: string, updatedData: Partial<Omit<Driver, 'id' | 'createdAt' | 'createdByUserId'>>): Promise<void> => {
  const driverDoc = doc(db, "drivers", driverId);
  try {
    const dataToUpdate: any = { ...updatedData };
     if (updatedData.currentTruckId === undefined || updatedData.currentTruckId === null) {
        dataToUpdate.currentTruckId = null;
    }
    if (updatedData.currentTruckReg === undefined || updatedData.currentTruckReg === null) {
        dataToUpdate.currentTruckReg = null;
    }
    await updateDoc(driverDoc, dataToUpdate);
  } catch (e) {
    console.error("Error updating document (driver): ", e);
    throw e;
  }
};

export const deleteDriverFromFirestore = async (driverId: string): Promise<void> => {
  const driverDocRef = doc(db, "drivers", driverId);
  try {
    const driverSnap = await getDoc(driverDocRef);
    if (driverSnap.exists()) {
        const driverData = driverSnap.data() as Driver;
        if (driverData.currentTruckId) {
            const truckDocRef = doc(db, "trucks", driverData.currentTruckId);
            await updateDoc(truckDocRef, {
                currentDriverId: null,
                currentDriverName: null,
                status: 'available' as TruckStatus,
            });
        }
    }
    await deleteDoc(driverDocRef);
  } catch (e) {
    console.error("Error deleting document (driver): ", e);
    throw e;
  }
};

// Transport CRUD with Firestore
export const addTransportToFirestore = async (
  transportData: Omit<Transport, 'id' | 'createdAt' | 'updatedAt' | 'truckRegistrationNumber' | 'driverName'>
): Promise<Transport> => {
  const batch = writeBatch(db);
  try {
    const newTransportDocRef = doc(collection(db, "transports"));

    const truck = transportData.truckId ? await getTruckByIdFromFirestore(transportData.truckId) : null;
    const driver = transportData.driverId ? await getDriverByIdFromFirestore(transportData.driverId) : null;

    const dataToSave: any = {
      ...transportData,
      truckRegistrationNumber: truck?.registrationNumber || null,
      driverName: driver?.name || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      plannedDepartureDate: Timestamp.fromDate(parseISO(transportData.plannedDepartureDate)),
      plannedArrivalDate: Timestamp.fromDate(parseISO(transportData.plannedArrivalDate)),
      actualDepartureDate: transportData.actualDepartureDate ? Timestamp.fromDate(parseISO(transportData.actualDepartureDate)) : null,
      actualArrivalDate: transportData.actualArrivalDate ? Timestamp.fromDate(parseISO(transportData.actualArrivalDate)) : null,
    };
    batch.set(newTransportDocRef, dataToSave);

    // Update Truck status
    if (truck && transportData.status === 'in_progress') {
      const truckDocRef = doc(db, "trucks", truck.id);
      batch.update(truckDocRef, { status: 'in_transit' as TruckStatus });
    }
    // Update Driver status
    if (driver && transportData.status === 'in_progress') {
      const driverDocRef = doc(db, "drivers", driver.id);
      batch.update(driverDocRef, { status: 'on_trip' as DriverStatus });
    }

    await batch.commit();
    const newDocSnap = await getDoc(newTransportDocRef);
    if (newDocSnap.exists()) {
        const savedData = newDocSnap.data();
        return {
            ...savedData,
            id: newDocSnap.id,
            createdAt: savedData.createdAt.toDate().toISOString(),
            updatedAt: savedData.updatedAt.toDate().toISOString(),
            plannedDepartureDate: savedData.plannedDepartureDate.toDate().toISOString(),
            plannedArrivalDate: savedData.plannedArrivalDate.toDate().toISOString(),
            actualDepartureDate: savedData.actualDepartureDate ? savedData.actualDepartureDate.toDate().toISOString() : null,
            actualArrivalDate: savedData.actualArrivalDate ? savedData.actualArrivalDate.toDate().toISOString() : null,
        } as Transport;
    }
    throw new Error("Failed to retrieve saved transport data.");
  } catch (e) {
    console.error("Error adding document (transport): ", e);
    throw e;
  }
};

export const getTransportsFromFirestore = async (): Promise<Transport[]> => {
  try {
    const q = query(transportsCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const transportData = docSnap.data();
      return {
        ...transportData,
        id: docSnap.id,
        createdAt: transportData.createdAt.toDate().toISOString(),
        updatedAt: transportData.updatedAt ? transportData.updatedAt.toDate().toISOString() : undefined,
        plannedDepartureDate: transportData.plannedDepartureDate.toDate().toISOString(),
        plannedArrivalDate: transportData.plannedArrivalDate.toDate().toISOString(),
        actualDepartureDate: transportData.actualDepartureDate ? transportData.actualDepartureDate.toDate().toISOString() : null,
        actualArrivalDate: transportData.actualArrivalDate ? transportData.actualArrivalDate.toDate().toISOString() : null,
      } as Transport;
    });
  } catch (e: any) {
    if (e.code === 'permission-denied') {
      console.error("Firestore permission denied while trying to fetch transports. Check rules for 'transports' collection.", e);
    } else {
      console.error("Error getting documents (transports): ", e);
    }
    return [];
  }
};

export const getTransportByIdFromFirestore = async (transportId: string): Promise<Transport | null> => {
  try {
    const transportDocRef = doc(db, "transports", transportId);
    const transportSnap = await getDoc(transportDocRef);
    if (transportSnap.exists()) {
      const transportData = transportSnap.data();
      return {
        ...transportData,
        id: transportSnap.id,
        createdAt: transportData.createdAt.toDate().toISOString(),
        updatedAt: transportData.updatedAt ? transportData.updatedAt.toDate().toISOString() : undefined,
        plannedDepartureDate: transportData.plannedDepartureDate.toDate().toISOString(),
        plannedArrivalDate: transportData.plannedArrivalDate.toDate().toISOString(),
        actualDepartureDate: transportData.actualDepartureDate ? transportData.actualDepartureDate.toDate().toISOString() : null,
        actualArrivalDate: transportData.actualArrivalDate ? transportData.actualArrivalDate.toDate().toISOString() : null,
      } as Transport;
    } else {
      console.log("No such document for transport ID:", transportId);
      return null;
    }
  } catch (e: any) {
    console.error(`Error getting document (transport ${transportId}): `, e);
    return null;
  }
};

export const updateTransportInFirestore = async (
  transportId: string,
  updatedData: Partial<Omit<Transport, 'id' | 'createdAt' | 'createdByUserId' | 'truckRegistrationNumber' | 'driverName'>>
): Promise<void> => {
  const transportDocRef = doc(db, "transports", transportId);
  const batch = writeBatch(db);
  try {
    const currentTransportSnap = await getDoc(transportDocRef);
    if (!currentTransportSnap.exists()) throw new Error("Transport document not found");
    const currentTransportData = currentTransportSnap.data() as Transport;

    const dataToUpdate: any = { ...updatedData, updatedAt: serverTimestamp() };

    // Handle date conversions
    if (updatedData.plannedDepartureDate) dataToUpdate.plannedDepartureDate = Timestamp.fromDate(parseISO(updatedData.plannedDepartureDate));
    if (updatedData.plannedArrivalDate) dataToUpdate.plannedArrivalDate = Timestamp.fromDate(parseISO(updatedData.plannedArrivalDate));
    if (updatedData.actualDepartureDate) dataToUpdate.actualDepartureDate = Timestamp.fromDate(parseISO(updatedData.actualDepartureDate));
    else if (updatedData.actualDepartureDate === null) dataToUpdate.actualDepartureDate = null;
    if (updatedData.actualArrivalDate) dataToUpdate.actualArrivalDate = Timestamp.fromDate(parseISO(updatedData.actualArrivalDate));
    else if (updatedData.actualArrivalDate === null) dataToUpdate.actualArrivalDate = null;

    // Denormalize truck/driver info if IDs change
    if (updatedData.truckId !== undefined && updatedData.truckId !== currentTransportData.truckId) {
        const truck = updatedData.truckId ? await getTruckByIdFromFirestore(updatedData.truckId) : null;
        dataToUpdate.truckRegistrationNumber = truck?.registrationNumber || null;
    }
    if (updatedData.driverId !== undefined && updatedData.driverId !== currentTransportData.driverId) {
        const driver = updatedData.driverId ? await getDriverByIdFromFirestore(updatedData.driverId) : null;
        dataToUpdate.driverName = driver?.name || null;
    }

    batch.update(transportDocRef, dataToUpdate);

    // Logic to update truck/driver statuses based on new transport status
    const newStatus = updatedData.status || currentTransportData.status;
    const newTruckId = updatedData.truckId !== undefined ? updatedData.truckId : currentTransportData.truckId;
    const newDriverId = updatedData.driverId !== undefined ? updatedData.driverId : currentTransportData.driverId;

    // If old truck/driver is different from new one, make old one available
    if (currentTransportData.truckId && currentTransportData.truckId !== newTruckId) {
        const oldTruckDocRef = doc(db, "trucks", currentTransportData.truckId);
        batch.update(oldTruckDocRef, { status: 'available' as TruckStatus });
    }
    if (currentTransportData.driverId && currentTransportData.driverId !== newDriverId) {
        const oldDriverDocRef = doc(db, "drivers", currentTransportData.driverId);
        batch.update(oldDriverDocRef, { status: 'available' as DriverStatus });
    }
    
    // Update new truck/driver based on transport status
    if (newTruckId) {
        const truckDocRef = doc(db, "trucks", newTruckId);
        if (newStatus === 'in_progress') batch.update(truckDocRef, { status: 'in_transit' as TruckStatus });
        else if (newStatus === 'completed' || newStatus === 'cancelled') batch.update(truckDocRef, { status: 'available' as TruckStatus });
    }
    if (newDriverId) {
        const driverDocRef = doc(db, "drivers", newDriverId);
        if (newStatus === 'in_progress') batch.update(driverDocRef, { status: 'on_trip' as DriverStatus });
        else if (newStatus === 'completed' || newStatus === 'cancelled') batch.update(driverDocRef, { status: 'available' as DriverStatus });
    }

    await batch.commit();
  } catch (e) {
    console.error("Error updating document (transport): ", e);
    throw e;
  }
};

export const deleteTransportFromFirestore = async (transportId: string): Promise<void> => {
  const transportDocRef = doc(db, "transports", transportId);
  const batch = writeBatch(db);
  try {
    const transportSnap = await getDoc(transportDocRef);
    if (transportSnap.exists()) {
        const transportData = transportSnap.data() as Transport;
        // Make assigned truck/driver available if transport was in progress
        if ((transportData.status === 'in_progress' || transportData.status === 'planned') && transportData.truckId) {
            const truckDocRef = doc(db, "trucks", transportData.truckId);
            batch.update(truckDocRef, { status: 'available' as TruckStatus });
        }
        if ((transportData.status === 'in_progress' || transportData.status === 'planned') && transportData.driverId) {
            const driverDocRef = doc(db, "drivers", transportData.driverId);
            batch.update(driverDocRef, { status: 'available' as DriverStatus });
        }
    }
    batch.delete(transportDocRef);
    await batch.commit();
  } catch (e) {
    console.error("Error deleting document (transport): ", e);
    throw e;
  }
};


// Approval Request Service
export const addApprovalRequestToFirestore = async (
  requestData: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status' | 'processedAt' | 'adminNotes' | 'processedByUserId' | 'pinCode' | 'pinExpiresAt' >,
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
        status: 'pending',
      } as ApprovalRequest;
    }
    // Fallback in case getDoc fails immediately after addDoc (should be rare)
    return {
      ...requestData,
      id: docRef.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
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
        pinExpiresAt: reqData.pinExpiresAt ? (reqData.pinExpiresAt instanceof Timestamp ? reqData.pinExpiresAt.toDate().toISOString() : (typeof reqData.pinExpiresAt === 'string' ? reqData.pinExpiresAt : undefined)) : undefined,
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
      orderBy("createdAt", "desc"),
    );
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const reqData = docSnap.data();
      return {
        ...reqData,
        id: docSnap.id,
        createdAt: reqData.createdAt instanceof Timestamp ? reqData.createdAt.toDate().toISOString() : (typeof reqData.createdAt === 'string' ? reqData.createdAt : new Date().toISOString()),
        processedAt: reqData.processedAt instanceof Timestamp ? reqData.processedAt.toDate().toISOString() : (typeof reqData.processedAt === 'string' ? reqData.processedAt : undefined),
        pinExpiresAt: reqData.pinExpiresAt ? (reqData.pinExpiresAt instanceof Timestamp ? reqData.pinExpiresAt.toDate().toISOString() : (typeof reqData.pinExpiresAt === 'string' ? reqData.pinExpiresAt : undefined)) : undefined,
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
  pinExpiresAt?: Date | string | Timestamp,
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
    } else if (newStatus !== 'pending') {
      // Explicitly delete if notes are empty and status is not pending
      updateData.adminNotes = deleteField();
    }


    if (pinCode !== undefined) {
      updateData.pinCode = pinCode;
    } else if (newStatus !== 'pin_issued' && newStatus !== 'pending') {
        // Delete if status is not pin_issued or pending, and no new pinCode is provided
        updateData.pinCode = deleteField();
    }

    if (pinExpiresAt !== undefined) {
      if (pinExpiresAt instanceof Date) {
        updateData.pinExpiresAt = Timestamp.fromDate(pinExpiresAt);
      } else if (typeof pinExpiresAt === 'string') {
        updateData.pinExpiresAt = Timestamp.fromDate(parseISO(pinExpiresAt));
      } else {
        updateData.pinExpiresAt = pinExpiresAt; // Assume it's already a Timestamp
      }
    } else if (newStatus !== 'pin_issued' && newStatus !== 'pending') {
        // Delete if status is not pin_issued or pending, and no new expiry is provided
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
  actionType: ApprovalRequestActionType,
): Promise<ApprovalRequest | null> => {
  const q = query(
    approvalRequestsCollectionRef,
    where("entityType", "==", entityType),
    where("entityId", "==", entityId),
    where("actionType", "==", actionType),
    where("status", "==", "pin_issued"),
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
        pinExpiresAt: requestData.pinExpiresAt ? (requestData.pinExpiresAt instanceof Timestamp ? requestData.pinExpiresAt.toDate().toISOString() : (typeof requestData.pinExpiresAt === 'string' ? requestData.pinExpiresAt : undefined)) : undefined,
      } as ApprovalRequest;

      if (request.pinCode && request.pinExpiresAt && new Date() < parseISO(request.pinExpiresAt)) {
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
      processedAt: serverTimestamp(),
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
      timestamp: serverTimestamp(),
    });
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
        const data = newDocSnap.data();
        return {
            id: newDocSnap.id,
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
        } as ChatMessage;
    }
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
      createdAt: serverTimestamp(),
    });
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
        const data = newDocSnap.data();
        return {
            id: newDocSnap.id,
            ...data,
            completed: data.completed,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as TodoItem;
    }
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
    // This function currently uses MOCK_USERS. In a real app, you'd fetch from UserProfiles or use user.displayName.
    const mockUser = MOCK_USERS.find(u => u.id === employeeId);
    if (mockUser) return mockUser.name;

    if (employeeId.length > 10 && !employeeId.startsWith('user-')) {
        return `Utilisateur (${employeeId.substring(0,6)}...)`;
    }
    return 'Utilisateur Inconnu';
};

// Session Audit Log
export const logSessionEvent = async (
  userId: string,
  userDisplayName: string | null,
  userEmail: string | null,
  action: 'login' | 'logout',
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

// Company Profile Settings
export const getCompanyProfileFromFirestore = async (): Promise<CompanyProfile | null> => {
  try {
    const docSnap = await getDoc(companySettingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as CompanyProfile;
    }
    return null; // No profile set yet
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        console.warn("Firestore permission denied while trying to fetch company profile (companySettings/main). This might be expected for non-admins if rules are restrictive.");
    } else {
        console.error("Error fetching company profile:", error);
    }
    return null;
  }
};

export const updateCompanyProfileInFirestore = async (data: Partial<CompanyProfile>): Promise<void> => {
  try {
    await setDoc(companySettingsDocRef, data, { merge: true });
  } catch (error) {
    console.error("Error updating company profile:", error);
    throw error;
  }
};

// Secretary Documents CRUD
export const addSecretaryDocumentToFirestore = async (
  docData: Omit<SecretaryDocument, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SecretaryDocument> => {
  try {
    const dataToSave: any = {
      ...docData,
      relatedClientId: docData.relatedClientId || null,
      relatedBlId: docData.relatedBlId || null,
      recipientEmail: docData.recipientEmail || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(secretaryDocumentsCollectionRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
      const savedData = newDocSnap.data();
      return {
        id: newDocSnap.id,
        ...savedData,
        createdAt: (savedData.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (savedData.updatedAt as Timestamp).toDate().toISOString(),
      } as SecretaryDocument;
    }
    throw new Error("Failed to retrieve saved secretary document.");
  } catch (e) {
    console.error("Error adding secretary document: ", e);
    throw e;
  }
};

export const getSecretaryDocumentsFromFirestore = async (): Promise<SecretaryDocument[]> => {
  try {
    const q = query(secretaryDocumentsCollectionRef, orderBy("createdAt", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const docData = docSnap.data();
      return {
        id: docSnap.id,
        ...docData,
        createdAt: (docData.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: docData.updatedAt ? (docData.updatedAt as Timestamp).toDate().toISOString() : undefined,
      } as SecretaryDocument;
    });
  } catch (e: any) {
    console.error("Error getting secretary documents: ", e);
    return [];
  }
};

export const getSecretaryDocumentByIdFromFirestore = async (documentId: string): Promise<SecretaryDocument | null> => {
    const docRef = doc(db, "secretaryDocuments", documentId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
            } as SecretaryDocument;
        }
        return null;
    } catch (e) {
        console.error(`Error fetching secretary document ${documentId}:`, e);
        throw e;
    }
};

export const updateSecretaryDocumentInFirestore = async (
  documentId: string,
  updatedData: Partial<Omit<SecretaryDocument, 'id' | 'createdAt' | 'createdByUserId'>>
): Promise<void> => {
  const docRef = doc(db, "secretaryDocuments", documentId);
  try {
    const dataToUpdate: any = { ...updatedData, updatedAt: serverTimestamp() };
    // Handle optional fields that might be set to null
    if ('relatedClientId' in updatedData) dataToUpdate.relatedClientId = updatedData.relatedClientId || null;
    if ('relatedBlId' in updatedData) dataToUpdate.relatedBlId = updatedData.relatedBlId || null;
    if ('recipientEmail' in updatedData) dataToUpdate.recipientEmail = updatedData.recipientEmail || null;

    await updateDoc(docRef, dataToUpdate);
  } catch (e) {
    console.error(`Error updating secretary document ${documentId}:`, e);
    throw e;
  }
};

export const deleteSecretaryDocumentFromFirestore = async (documentId: string): Promise<void> => {
  const docRef = doc(db, "secretaryDocuments", documentId);
  try {
    await deleteDoc(docRef);
  } catch (e) {
    console.error(`Error deleting secretary document ${documentId}:`, e);
    throw e;
  }
};


// Accounting Entries CRUD
export const addAccountingEntryToFirestore = async (
  entryData: Omit<AccountingEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AccountingEntry> => {
  try {
    const dataToSave: any = {
      ...entryData,
      relatedClientId: entryData.relatedClientId || null,
      relatedBlId: entryData.relatedBlId || null,
      taxAmount: entryData.taxAmount || 0,
      description: entryData.description || "",
      notes: entryData.notes || "",
      issueDate: Timestamp.fromDate(parseISO(entryData.issueDate)),
      dueDate: entryData.dueDate ? Timestamp.fromDate(parseISO(entryData.dueDate)) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(accountingEntriesCollectionRef, dataToSave);
    const newDocSnap = await getDoc(docRef);
    if (newDocSnap.exists()) {
      const savedData = newDocSnap.data();
      return {
        id: newDocSnap.id,
        ...savedData,
        issueDate: (savedData.issueDate as Timestamp).toDate().toISOString(),
        dueDate: savedData.dueDate ? (savedData.dueDate as Timestamp).toDate().toISOString() : undefined,
        createdAt: (savedData.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (savedData.updatedAt as Timestamp).toDate().toISOString(),
      } as AccountingEntry;
    }
    throw new Error("Failed to retrieve saved accounting entry.");
  } catch (e) {
    console.error("Error adding accounting entry: ", e);
    throw e;
  }
};

export const getAccountingEntriesFromFirestore = async (): Promise<AccountingEntry[]> => {
  try {
    const q = query(accountingEntriesCollectionRef, orderBy("issueDate", "desc"));
    const data = await getDocs(q);
    return data.docs.map(docSnap => {
      const entryData = docSnap.data();
      return {
        id: docSnap.id,
        ...entryData,
        issueDate: (entryData.issueDate as Timestamp).toDate().toISOString(),
        dueDate: entryData.dueDate ? (entryData.dueDate as Timestamp).toDate().toISOString() : undefined,
        createdAt: (entryData.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: entryData.updatedAt ? (entryData.updatedAt as Timestamp).toDate().toISOString() : undefined,
      } as AccountingEntry;
    });
  } catch (e: any) {
    console.error("Error getting accounting entries: ", e);
    return [];
  }
};

export const getAccountingEntryByIdFromFirestore = async (entryId: string): Promise<AccountingEntry | null> => {
    const docRef = doc(db, "accountingEntries", entryId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                issueDate: (data.issueDate as Timestamp).toDate().toISOString(),
                dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate().toISOString() : undefined,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
                updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
            } as AccountingEntry;
        }
        return null;
    } catch (e) {
        console.error(`Error fetching accounting entry ${entryId}:`, e);
        throw e;
    }
};

export const updateAccountingEntryInFirestore = async (
  entryId: string,
  updatedData: Partial<Omit<AccountingEntry, 'id' | 'createdAt' | 'createdByUserId'>>
): Promise<void> => {
  const docRef = doc(db, "accountingEntries", entryId);
  try {
    const dataToUpdate: any = { ...updatedData, updatedAt: serverTimestamp() };
     if ('issueDate' in updatedData && updatedData.issueDate) {
      dataToUpdate.issueDate = Timestamp.fromDate(parseISO(updatedData.issueDate));
    }
    if ('dueDate' in updatedData) {
      dataToUpdate.dueDate = updatedData.dueDate ? Timestamp.fromDate(parseISO(updatedData.dueDate)) : null;
    }
    if ('relatedClientId' in updatedData) dataToUpdate.relatedClientId = updatedData.relatedClientId || null;
    if ('relatedBlId' in updatedData) dataToUpdate.relatedBlId = updatedData.relatedBlId || null;
    if ('taxAmount' in updatedData) dataToUpdate.taxAmount = updatedData.taxAmount || 0;
    if ('description' in updatedData) dataToUpdate.description = updatedData.description || "";
    if ('notes' in updatedData) dataToUpdate.notes = updatedData.notes || "";

    await updateDoc(docRef, dataToUpdate);
  } catch (e) {
    console.error(`Error updating accounting entry ${entryId}:`, e);
    throw e;
  }
};

export const deleteAccountingEntryFromFirestore = async (entryId: string): Promise<void> => {
  const docRef = doc(db, "accountingEntries", entryId);
  try {
    await deleteDoc(docRef);
  } catch (e) {
    console.error(`Error deleting accounting entry ${entryId}:`, e);
    throw e;
  }
};

