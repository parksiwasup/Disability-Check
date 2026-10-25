import { Request, Response } from 'express';
import { patientRepository } from '../services/patientRepository';
import { pdfService } from '../services/pdfService';
import fs from 'fs';
import path from 'path';

export const pdfController = {
  getMappings(req: Request, res: Response) {
    try {
      const mappings = pdfService.getFieldMappings();
      res.json({ success: true, data: mappings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updateMappings(req: Request, res: Response) {
    try {
      const { mappings } = req.body;
      if (!Array.isArray(mappings)) {
        return res.status(400).json({ success: false, message: 'mappings must be an array' });
      }
      const updated = pdfService.updateFieldMappings(mappings);
      res.json({ success: true, message: 'บันทึกการตั้งค่าพิกัดฟอร์มสำเร็จ', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async previewPdf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const includeMedicalRecords = req.query.includeMedicalRecords === '1' || req.query.includeMedicalRecords === 'true';
      const patient = patientRepository.getById(id);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ป่วย' });
      }

      const pdfBytes = await pdfService.generatePdf(patient, undefined, { includeMedicalRecords });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="sps2-19-${patient.hn}.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (err: any) {
      console.error('Preview PDF error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async downloadPdf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const includeMedicalRecords = req.query.includeMedicalRecords === '1' || req.query.includeMedicalRecords === 'true';
      const patient = patientRepository.getById(id);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ป่วย' });
      }

      const pdfBytes = await pdfService.generatePdf(patient, undefined, { includeMedicalRecords });
      const suffix = includeMedicalRecords ? '_รวมเวชระเบียน' : '';
      const safeName = encodeURIComponent(`สปส2-19_${patient.fullName}${suffix}`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
      res.send(Buffer.from(pdfBytes));
    } catch (err: any) {
      console.error('Download PDF error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getTemplatePdf(req: Request, res: Response) {
    try {
      const templatePath = path.resolve(__dirname, '../../assets/template.pdf');
      const fallback = path.resolve(__dirname, '../../../สปส2-19.pdf');
      const target = fs.existsSync(templatePath) ? templatePath : fallback;

      if (!fs.existsSync(target)) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="sps2-19-template.pdf"');
      fs.createReadStream(target).pipe(res);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
