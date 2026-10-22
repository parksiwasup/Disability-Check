import { Request, Response } from 'express';
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
