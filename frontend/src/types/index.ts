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
