import { Request, Response } from 'express';
import fs from 'fs';
import { patientRepository } from '../services/patientRepository';
import { checkDbConnection } from '../config/db';

export const patientController = {
  getPatients(req: Request, res: Response) {
    try {
      const { search, department, status } = req.query;
      const data = patientRepository.getAll({
        search: search as string,
        department: department as string,
        status: status as string
      });
      res.json({ success: true, count: data.length, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getPatientById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const patient = patientRepository.getById(id);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ป่วย' });
      }
      res.json({ success: true, data: patient });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updatePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = patientRepository.update(id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเพื่อแก้ไข' });
      }
      res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จ', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  createPatient(req: Request, res: Response) {
    try {
      const newRec = patientRepository.create(req.body);
      res.status(201).json({ success: true, message: 'สร้างเวชระเบียนใหม่สำเร็จ', data: newRec });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deletePatient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = patientRepository.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลเพื่อลบ' });
      }
      res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getStats(req: Request, res: Response) {
    try {
      const stats = patientRepository.getStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  uploadExcel(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'กรุณาแนบไฟล์ Excel (.xlsx หรือ .xls)' });
      }
      const added = patientRepository.importBuffer(req.file.buffer);
      res.json({ 
        success: true, 
        message: `นำเข้าข้อมูลเรียบร้อยแล้ว เพิ่มใหม่/อัปเดต ${added} รายการ`,
        total: patientRepository.getAll().length
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async uploadMedicalRecords(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const uploadedFiles = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ PDF เวชระเบียนอย่างน้อย 1 ไฟล์' });
      }

      const invalid = uploadedFiles.find(
        f => !f.originalname.toLowerCase().endsWith('.pdf') && f.mimetype !== 'application/pdf'
      );
      if (invalid) {
        return res.status(400).json({ success: false, message: 'รองรับเฉพาะไฟล์นามสกุล .pdf เท่านั้น' });
      }

      const rawCategory = (req.body?.category || req.query?.category || 'medical_record') as any;
      const updated = await patientRepository.addMedicalRecords(id, uploadedFiles, rawCategory);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ป่วย' });
      }

      const categoryLabel =
        rawCategory === 'prescription'
          ? 'ใบสั่งยา'
          : rawCategory === 'medical_certificate'
            ? 'ใบรับรองแพทย์'
            : rawCategory === 'sso_document'
              ? 'เอกสารปกส.'
              : rawCategory === 'treatment_record'
                ? 'ใบบันทึกการรับรักษา'
                : 'เวชระเบียน';

      res.json({
        success: true,
        message: `แนบไฟล์ PDF ${categoryLabel}สำเร็จ (${uploadedFiles.length} ไฟล์)`,
        data: updated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getMedicalRecordFile(req: Request, res: Response) {
    try {
      const { id, recordId } = req.params;
      const result = patientRepository.getMedicalRecordFile(id, recordId);
      if (!result) {
        return res.status(404).json({ success: false, message: 'ไม่พบไฟล์เวชระเบียนที่ระบุ' });
      }

      const isDownload = req.query.download === '1' || req.query.download === 'true';
      const patient = patientRepository.getById(id);
      const cat = result.attachment.category || 'medical_record';
      const categoryLabel =
        cat === 'prescription'
          ? 'ใบสั่งยา'
          : cat === 'medical_certificate'
            ? 'ใบรับรองแพทย์'
            : cat === 'sso_document'
              ? 'เอกสารปกส'
              : cat === 'treatment_record'
                ? 'ใบบันทึกการรับรักษา'
                : 'เวชระเบียน';

      const downloadFileName =
        isDownload && patient
          ? `${categoryLabel}_${patient.fullName}.pdf`
          : result.attachment.originalName || result.attachment.fileName;

      const safeName = encodeURIComponent(downloadFileName);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `${isDownload ? 'attachment' : 'inline'}; filename="${safeName}"; filename*=UTF-8''${safeName}`
      );
      fs.createReadStream(result.fullPath).pipe(res);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deleteMedicalRecord(req: Request, res: Response) {
    try {
      const { id, recordId } = req.params;
      const updated = patientRepository.deleteMedicalRecord(id, recordId);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ป่วย' });
      }

      res.json({
        success: true,
        message: 'ลบไฟล์ PDF เวชระเบียนเรียบร้อยแล้ว',
        data: updated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getDbStatus(req: Request, res: Response) {
    try {
      const status = await checkDbConnection();
      res.json({
        success: true,
        mysqlConnected: status.connected,
        message: status.message,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.json({
        success: true,
        mysqlConnected: false,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};
