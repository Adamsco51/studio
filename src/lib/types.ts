
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
  containerIds: string[];
  status: BLStatus;
  createdAt: string; // ISO Date string
  createdByUserId?: string;
}

export interface Container {
  id: string;
  blId: string; // Foreign key to BillOfLading
  blNumber?: string; // Denormalized for display
  containerNumber: string;
  type: string; // e.g., '20ft Dry', '40ft HC', 'Reefer'
  sealNumber?: string;
  shippingDate?: string; // Date d'embarquement sur le navire (ISO string)
  dischargeDate?: string; // Date de déchargement du navire (ISO string)
  truckLoadingDate?: string; // Date d'embarquement sur le camion (ISO string)
  destinationArrivalDate?: string; // Date d'arrivée à destination (ISO string)
  status: string; // e.g., 'At Origin Port', 'On Vessel', 'At Destination Port', 'Loaded on Truck', 'Delivered'
  notes?: string;
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
  jobTitle?: 'Secrétaire' | 'Comptable' | 'Agent Opérationnel' | 'Manager' | string; // Added jobTitle
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: 'admin' | 'employee';
  jobTitle?: 'Secrétaire' | 'Comptable' | 'Agent Opérationnel' | 'Manager' | string; // Added jobTitle
}

export interface UserProfile {
  uid: string;
  email: string | null; // Email field is important here
  displayName: string | null;
  role: 'admin' | 'employee';
  jobTitle?: 'Secrétaire' | 'Comptable' | 'Agent Opérationnel' | 'Manager' | 'Autre'; // Refined jobTitle options
  createdAt: string;
}

export type TruckStatus = 'available' | 'in_transit' | 'maintenance' | 'out_of_service';

export interface Truck {
  id: string;
  registrationNumber: string;
  model?: string;
  capacity?: string; // e.g., "1x40ft or 2x20ft", "30 Tonnes"
  status: TruckStatus;
  currentDriverId?: string | null;
  currentDriverName?: string | null; // Denormalized for display
  notes?: string;
  createdAt: string; // ISO Date string
  createdByUserId?: string;
}

export type DriverStatus = 'available' | 'on_trip' | 'off_duty' | 'unavailable';

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  status: DriverStatus;
  currentTruckId?: string | null; // ID of the truck the driver is currently assigned to
  currentTruckReg?: string | null; // Registration number of the current truck (denormalized)
  notes?: string;
  createdAt: string; // ISO Date string
  createdByUserId?: string;
}

export type TransportStatus = 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';

export interface Transport {
  id: string;
  transportNumber: string; // Could be auto-generated or manual
  blId: string;
  containerIds: string[];
  truckId: string | null;
  truckRegistrationNumber?: string | null; // Denormalized
  driverId: string | null;
  driverName?: string | null; // Denormalized
  origin: string;
  destination: string;
  plannedDepartureDate: string; // ISO Date string
  actualDepartureDate?: string | null; // ISO Date string
  plannedArrivalDate: string; // ISO Date string
  actualArrivalDate?: string | null; // ISO Date string
  status: TransportStatus;
  notes?: string | null;
  totalCost?: number; // Simplified cost for now
  createdAt: string; // ISO Date string
  createdByUserId: string;
  updatedAt?: string; // ISO Date string
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

export type ApprovalRequestEntityType = 'bl' | 'client' | 'workType' | 'expense' | 'container' | 'truck' | 'driver' | 'transport' | 'secretaryDocument' | 'accountingEntry';
export type ApprovalRequestActionType = 'edit' | 'delete' | 'create'; // Added 'create' for completeness if needed
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
  createdAt: string; // ISO Date string
  processedAt?: string; // ISO Date string
  adminNotes?: string;
  processedByUserId?: string;
  pinCode?: string;
  pinExpiresAt?: string; // ISO Date string
}

export interface SessionAuditEvent {
  id?: string;
  userId: string;
  userDisplayName: string | null;
  userEmail: string | null;
  action: 'login' | 'logout';
  timestamp: string; // ISO Date string, Firestore will store as Timestamp
}

export interface CompanyProfile {
  appName?: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
}

// Types for Secretary and Accounting sections
export type SecretaryDocumentType = 'lettre' | 'note_interne' | 'rapport' | 'contrat' | 'presentation' | 'autre';
export const SECRETARY_DOCUMENT_TYPES: SecretaryDocumentType[] = ['lettre', 'note_interne', 'rapport', 'contrat', 'presentation', 'autre'];

export type SecretaryDocumentStatus = 'brouillon' | 'en_revision' | 'approuve' | 'envoye' | 'archive';
export const SECRETARY_DOCUMENT_STATUSES: SecretaryDocumentStatus[] = ['brouillon', 'en_revision', 'approuve', 'envoye', 'archive'];


export interface SecretaryDocument {
  id: string;
  title: string;
  documentType: SecretaryDocumentType;
  content: string; // Could be HTML from Quill or Markdown
  status: SecretaryDocumentStatus;
  version: number;
  relatedClientId?: string; // Optional link to a client
  relatedBlId?: string;   // Optional link to a BL
  recipientEmail?: string; // For sending
  createdAt: string; // ISO Date string
  createdByUserId: string;
  updatedAt?: string; // ISO Date string
}

export type AccountingEntryType = 'facture_client' | 'facture_fournisseur' | 'avoir_client' | 'avoir_fournisseur' | 'devis' | 'bon_de_commande' | 'note_de_frais' | 'paiement_recu' | 'paiement_effectue';
export const ACCOUNTING_ENTRY_TYPES: AccountingEntryType[] = ['facture_client', 'facture_fournisseur', 'avoir_client', 'avoir_fournisseur', 'devis', 'bon_de_commande', 'note_de_frais', 'paiement_recu', 'paiement_effectue'];

export type AccountingEntryStatus = 'brouillon' | 'en_attente' | 'approuvee' | 'envoyee' | 'payee' | 'partiellement_payee' | 'en_retard' | 'annulee';
export const ACCOUNTING_ENTRY_STATUSES: AccountingEntryStatus[] = ['brouillon', 'en_attente', 'approuvee', 'envoyee', 'payee', 'partiellement_payee', 'en_retard', 'annulee'];


export interface AccountingEntry {
  id: string;
  entryType: AccountingEntryType;
  referenceNumber: string; // e.g., INV-2024-001
  relatedBlId?: string;
  relatedClientId?: string;
  issueDate: string; // ISO Date string
  dueDate?: string; // ISO Date string
  amount: number;
  currency: string; // e.g., XOF, USD
  taxAmount?: number;
  totalAmount: number;
  status: AccountingEntryStatus;
  description?: string; // General description or line items in simple text
  notes?: string;
  createdAt: string; // ISO Date string
  createdByUserId: string;
  updatedAt?: string; // ISO Date string
}

