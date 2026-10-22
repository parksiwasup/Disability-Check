const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { PDFDocument } = require('pdf-lib');

async function inspect() {
  const excelPath = path.resolve(__dirname, '../../ทดสอบทุพพลภาพ.xlsx');
  const pdfPath = path.resolve(__dirname, '../../สปส2-19.pdf');

  console.log('=== INSPECTING EXCEL ===');
  if (fs.existsSync(excelPath)) {
    const workbook = xlsx.readFile(excelPath);
    console.log('Sheet Names:', workbook.SheetNames);
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`\nSheet: [${sheetName}], total rows: ${data.length}`);
      console.log('Row 0 (Header):', JSON.stringify(data[0], null, 2));
      if (data.length > 1) {
        console.log('Row 1 (Sample 1):', JSON.stringify(data[1], null, 2));
      }
      if (data.length > 2) {
        console.log('Row 2 (Sample 2):', JSON.stringify(data[2], null, 2));
      }
    }
  } else {
    console.log('Excel not found at', excelPath);
  }

  console.log('\n=== INSPECTING PDF ===');
  if (fs.existsSync(pdfPath)) {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    console.log(`PDF Pages count: ${pages.length}`);
    pages.forEach((page, idx) => {
      const { width, height } = page.getSize();
      console.log(`Page ${idx + 1}: Width = ${width}, Height = ${height}`);
    });
    // Check if form fields exist
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      console.log(`PDF AcroForm Fields count: ${fields.length}`);
      fields.forEach(f => {
        console.log(` - Field name: "${f.getName()}", type: ${f.constructor.name}`);
      });
    } catch (err) {
      console.log('No AcroForm in PDF (it is a standard scanned/flattened vector PDF)');
    }
  } else {
    console.log('PDF not found at', pdfPath);
  }
}

inspect().catch(console.error);
