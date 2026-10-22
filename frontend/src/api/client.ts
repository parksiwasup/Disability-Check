import { PatientRecord, FieldConfig, StatsData, DbStatus } from '../types';

const API_BASE = '/api';

export const api = {
  async getPatients(filters?: { search?: string; department?: string; status?: string }): Promise<PatientRecord[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.department) params.set('department', filters.department);
    if (filters?.status) params.set('status', filters.status);

    const res = await fetch(`${API_BASE}/patients?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch patients');
    const json = await res.json();
    return json.data || [];
  },

  async getPatient(id: string): Promise<PatientRecord> {
    const res = await fetch(`${API_BASE}/patients/${id}`);
    if (!res.ok) throw new Error('Failed to fetch patient');
    const json = await res.json();
    return json.data;
  },

  async updatePatient(id: string, data: Partial<PatientRecord>): Promise<PatientRecord> {
    const res = await fetch(`${API_BASE}/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update patient');
    const json = await res.json();
    return json.data;
  },

  async getStats(): Promise<StatsData> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    const json = await res.json();
    return json.data;
  },

  async uploadExcel(file: File): Promise<{ count: number; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload-excel`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload Excel');
    return await res.json();
  },

  async getDbStatus(): Promise<DbStatus> {
    try {
      const res = await fetch(`${API_BASE}/db-status`);
      if (!res.ok) throw new Error('Db check failed');
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        mysqlConnected: false,
        message: err.message || 'Offline',
        timestamp: new Date().toISOString()
      };
    }
  },

  async getFieldMappings(): Promise<FieldConfig[]> {
    const res = await fetch(`${API_BASE}/pdf/mappings`);
    if (!res.ok) throw new Error('Failed to fetch mappings');
    const json = await res.json();
    return json.data;
  },

  async updateFieldMappings(mappings: FieldConfig[]): Promise<FieldConfig[]> {
    const res = await fetch(`${API_BASE}/pdf/mappings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings })
    });
    if (!res.ok) throw new Error('Failed to update mappings');
    const json = await res.json();
    return json.data;
  },

  getPdfPreviewUrl(patientId: string): string {
    return `${API_BASE}/pdf/preview/${patientId}?t=${Date.now()}`;
  },

  getPdfDownloadUrl(patientId: string): string {
    return `${API_BASE}/pdf/download/${patientId}`;
  },

  getTemplatePdfUrl(): string {
    return `${API_BASE}/pdf/template`;
  }
};
