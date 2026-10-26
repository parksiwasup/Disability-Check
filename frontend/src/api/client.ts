import { PatientRecord, FieldConfig, StatsData, DbStatus, MedicalDocumentCategory } from '../types';
import JSZip from 'jszip';

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

  getPdfPreviewUrl(patientId: string, includeMedicalRecords = false): string {
    return `${API_BASE}/pdf/preview/${patientId}?includeMedicalRecords=${includeMedicalRecords ? '1' : '0'}&t=${Date.now()}`;
  },

  getPdfDownloadUrl(patientId: string, includeMedicalRecords = false): string {
    return `${API_BASE}/pdf/download/${patientId}?includeMedicalRecords=${includeMedicalRecords ? '1' : '0'}`;
  },

  getTemplatePdfUrl(): string {
    return `${API_BASE}/pdf/template`;
  },

  async uploadMedicalRecords(
    patientId: string,
    files: FileList | File[],
    category: MedicalDocumentCategory = 'medical_record'
  ): Promise<PatientRecord> {
    const formData = new FormData();
    formData.append('category', category);
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    const res = await fetch(`${API_BASE}/patients/${encodeURIComponent(patientId)}/medical-records?category=${encodeURIComponent(category)}`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || 'ไม่สามารถอัปโหลดไฟล์ PDF ได้');
    }
    const json = await res.json();
    return json.data;
  },

  async deleteMedicalRecord(patientId: string, recordId: string): Promise<PatientRecord> {
    const res = await fetch(
      `${API_BASE}/patients/${encodeURIComponent(patientId)}/medical-records/${encodeURIComponent(recordId)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || 'ไม่สามารถลบไฟล์เวชระเบียนได้');
    }
    const json = await res.json();
    return json.data;
  },

  getMedicalRecordUrl(patientId: string, recordId: string, download = false): string {
    return `${API_BASE}/patients/${encodeURIComponent(patientId)}/medical-records/${encodeURIComponent(recordId)}${download ? '?download=1' : ''}`;
  },

  getCategoryThaiName(category?: MedicalDocumentCategory): string {
    switch (category) {
      case 'medical_record':
        return 'เวชระเบียน';
      case 'sso_document':
        return 'เอกสารปกส';
      case 'prescription':
        return 'ใบสั่งยา';
      case 'medical_certificate':
        return 'ใบรับรองแพทย์';
      case 'treatment_record':
        return 'ใบบันทึกการรับรักษา';
      default:
        return 'เวชระเบียน';
    }
  },

  async triggerBlobDownload(url: string, fileName: string): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ${fileName}`);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  },

  async downloadAllPatientPdfs(patient: PatientRecord): Promise<number> {
    const cleanName = patient.fullName.trim().replace(/[\\/:*?"<>|]/g, '_');
    const cleanHn = patient.hn.trim().replace(/[\\/:*?"<>|]/g, '_');

    const tasks: Array<{ url: string; fileName: string }> = [
      {
        url: this.getPdfDownloadUrl(patient.id, false),
        fileName: `สปส2-19_${cleanName}.pdf`
      }
    ];

    const categoryOrder: MedicalDocumentCategory[] = [
      'medical_record',
      'prescription',
      'medical_certificate',
      'treatment_record',
      'sso_document'
    ];

    const records = patient.medicalRecords || [];

    for (const cat of categoryOrder) {
      const catRecords = records.filter(r => (r.category || 'medical_record') === cat);
      const label = this.getCategoryThaiName(cat);
      catRecords.forEach((rec, idx) => {
        const suffix = catRecords.length > 1 ? `_${idx + 1}` : '';
        tasks.push({
          url: this.getMedicalRecordUrl(patient.id, rec.id, true),
          fileName: `${label}${suffix}_${cleanName}.pdf`
        });
      });
    }

    for (let i = 0; i < tasks.length; i++) {
      await this.triggerBlobDownload(tasks[i].url, tasks[i].fileName);
      if (i < tasks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    }

    return tasks.length;
  },

  async downloadPatientPdfsAsZip(patient: PatientRecord): Promise<void> {
    const cleanName = patient.fullName.trim().replace(/[\\/:*?"<>|]/g, '_');
    const zip = new JSZip();

    // 1. แบบฟอร์ม สปส. 2-19
    try {
      const spsRes = await fetch(this.getPdfDownloadUrl(patient.id, false));
      if (spsRes.ok) {
        const spsBlob = await spsRes.blob();
        zip.file(`สปส2-19_${cleanName}.pdf`, spsBlob);
      }
    } catch (err) {
      console.error('Failed to add SPS2-19 to zip:', err);
    }

    // 2. เอกสารแนบทั้ง 4 หมวด
    const categoryOrder: MedicalDocumentCategory[] = [
      'medical_record',
      'prescription',
      'medical_certificate',
      'treatment_record',
      'sso_document'
    ];
    const records = patient.medicalRecords || [];

    for (const cat of categoryOrder) {
      const catRecords = records.filter(r => (r.category || 'medical_record') === cat);
      const label = this.getCategoryThaiName(cat);
      for (let idx = 0; idx < catRecords.length; idx++) {
        const rec = catRecords[idx];
        const suffix = catRecords.length > 1 ? `_${idx + 1}` : '';
        try {
          const recRes = await fetch(this.getMedicalRecordUrl(patient.id, rec.id, true));
          if (recRes.ok) {
            const recBlob = await recRes.blob();
            zip.file(`${label}${suffix}_${cleanName}.pdf`, recBlob);
          }
        } catch (err) {
          console.error(`Failed to add ${rec.originalName} to zip:`, err);
        }
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = window.URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = zipUrl;
    a.download = `เอกสารครบชุด_${cleanName}.zip`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(zipUrl);
    }, 1000);
  },

  async downloadBatchPatientsZip(patients: PatientRecord[]): Promise<void> {
    const zip = new JSZip();

    for (const patient of patients) {
      const cleanName = patient.fullName.trim().replace(/[\\/:*?"<>|]/g, '_');
      const folderName = `${patient.hn}_${cleanName}`;
      const folder = zip.folder(folderName) || zip;

      // 1. สปส. 2-19
      try {
        const spsRes = await fetch(this.getPdfDownloadUrl(patient.id, false));
        if (spsRes.ok) {
          const spsBlob = await spsRes.blob();
          folder.file(`สปส2-19_${cleanName}.pdf`, spsBlob);
        }
      } catch (err) {
        console.error('Failed to add SPS2-19 to zip:', err);
      }

      // 2. เอกสารแนบ
      const categoryOrder: MedicalDocumentCategory[] = [
        'medical_record',
        'prescription',
        'medical_certificate',
        'treatment_record',
        'sso_document'
      ];
      const records = patient.medicalRecords || [];

      for (const cat of categoryOrder) {
        const catRecords = records.filter(r => (r.category || 'medical_record') === cat);
        const label = this.getCategoryThaiName(cat);
        for (let idx = 0; idx < catRecords.length; idx++) {
          const rec = catRecords[idx];
          const suffix = catRecords.length > 1 ? `_${idx + 1}` : '';
          try {
            const recRes = await fetch(this.getMedicalRecordUrl(patient.id, rec.id, true));
            if (recRes.ok) {
              const recBlob = await recRes.blob();
              folder.file(`${label}${suffix}_${cleanName}.pdf`, recBlob);
            }
          } catch (err) {
            console.error(`Failed to add ${rec.originalName} to zip:`, err);
          }
        }
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = window.URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = zipUrl;
    a.download = `เอกสารผู้ป่วยทั้งหมด_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(zipUrl);
    }, 1000);
  }
};
