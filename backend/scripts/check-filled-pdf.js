const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

async function check() {
  const buf = new Uint8Array(fs.readFileSync(path.resolve(__dirname, '../assets/test_output_filled_v2.pdf')));
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  
  const textItems = content.items
    .filter(it => it.str && it.str.trim())
    .map(it => ({
      str: it.str.trim(),
      x: Math.round(it.transform[4] * 10) / 10,
      y: Math.round(it.transform[5] * 10) / 10
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  console.log('=== FILLED ITEMS FOUND IN GENERATED PDF ===');
  textItems.filter(it => 
    it.str.includes('รัสมี') || 
    it.str.includes('ศูนย์การแพทย์') ||
    it.str.includes('34705') ||
    it.str.includes('000090700') ||
    it.str.includes('Z480') ||
    it.str.includes('557') ||
    it.str.includes('ห้าร้อย') ||
    it.str.includes('ก้น') ||
    it.str.includes('2569') ||
    it.str.includes('ธีรภัทร')
  ).forEach(it => {
    console.log(`y: ${it.y.toFixed(1).padStart(5)}, x: ${it.x.toFixed(1).padStart(5)} | "${it.str}"`);
  });
}

check();
