import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { patientController } from './controllers/patientController';
import { pdfController } from './controllers/pdfController';
import { checkDbConnection } from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for Excel & Medical Record PDF uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB per file
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets if needed
app.use('/assets', express.static(path.resolve(__dirname, '../assets')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Hospital Disability Assessment & SSO 2-19 PDF Auto-Filler',
    timestamp: new Date().toISOString()
  });
});

// Patient endpoints
app.get('/api/patients', patientController.getPatients);
app.get('/api/patients/:id', patientController.getPatientById);
app.put('/api/patients/:id', patientController.updatePatient);
app.post('/api/patients', patientController.createPatient);
app.delete('/api/patients/:id', patientController.deletePatient);
app.post('/api/patients/:id/medical-records', upload.array('files', 10), patientController.uploadMedicalRecords);
app.get('/api/patients/:id/medical-records/:recordId', patientController.getMedicalRecordFile);
app.delete('/api/patients/:id/medical-records/:recordId', patientController.deleteMedicalRecord);
app.get('/api/stats', patientController.getStats);
app.post('/api/upload-excel', upload.single('file'), patientController.uploadExcel);
app.get('/api/db-status', patientController.getDbStatus);

// PDF endpoints
app.get('/api/pdf/mappings', pdfController.getMappings);
app.put('/api/pdf/mappings', pdfController.updateMappings);
app.get('/api/pdf/preview/:id', pdfController.previewPdf);
app.get('/api/pdf/download/:id', pdfController.downloadPdf);
app.get('/api/pdf/template', pdfController.getTemplatePdf);

app.listen(PORT, async () => {
  console.log(`===================================================`);
  console.log(`🏥 Hospital Disability Assessment API Server Running`);
  console.log(`🚀 Port: http://localhost:${PORT}`);
  console.log(`===================================================`);
  
  // Test MySQL DB connection
  const dbStatus = await checkDbConnection();
  console.log(`Database Status: ${dbStatus.connected ? '🟢' : '🟡'} ${dbStatus.message}`);
});
