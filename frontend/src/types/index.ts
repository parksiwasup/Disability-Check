export type MedicalDocumentCategory = 'medical_record' | 'prescription' | 'medical_certificate' | 'sso_document' | 'treatment_record';

export interface MedicalRecordAttachment {
  id: string;
  category?: MedicalDocumentCategory;
  isPermanent?: boolean;
  patientHn?: string;
  patientIdCard?: string;
  patientName?: string;
  fileName: string;
  originalName: string;
  size: number;
  pageCount?: number;
  uploadedAt: string;
  url: string;
}

export interface PatientRecord {
  id: string;
  orderNo: number;
  hn: string;
  vn: string;
  idCard: string;
  fullName: string;
  phone: string;
  nationality: string;
  treatmentDate: string;
  treatmentTime: string;
  visitType: string;
  department: string;
  clinicRoom: string;
  chiefComplaint: string;
  diagPrimary: string;
  diagPrimaryName: string;
  diagSecondary: string;
  diagSecondaryName: string;
  hospRight: string;
  status: string;
  cost: number;
  costText: string;
  impairmentRate: number;
  disabilityType: string;
  assessmentNote: string;
  doctorName: string;
  doctorLicense: string;
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
  medicalRecords?: MedicalRecordAttachment[];
}

export interface FieldConfig {
  id: string;
  label: string;
  section?: string;
  key: string;
  page: number;
  x: number;
  y: number;
  fontSize: number;
  fontFamily?: string; // 'THSarabunNew' | 'Tahoma' | 'Cordia'
  isBold?: boolean;
  color?: string; // Hex color
  customText?: string;
  prefix?: string;
  suffix?: string;
  format?: (val: any, patient: any) => string;
}

export interface StatsData {
  total: number;
  evaluated: number;
  pending: number;
  avgImpairment: number;
  departments: Record<string, number>;
  diagnoses: Record<string, number>;
}

export interface DbStatus {
  success: boolean;
  mysqlConnected: boolean;
  message: string;
  timestamp: string;
}
