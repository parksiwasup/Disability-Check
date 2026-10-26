const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

async function run() {
  const pdfPath = path.resolve(__dirname, '../assets/template.pdf');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const items = content.items
    .filter(it => it.str && it.str.trim())
    .map(it => ({
      str: it.str.trim(),
      x: Math.round(it.transform[4] * 10) / 10,
      y: Math.round(it.transform[5] * 10) / 10,
      width: Math.round(it.width * 10) / 10
    }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  console.log(`=== ALL ITEMS ===`);
  items.forEach(it => {
    console.log(`y: ${it.y.toFixed(1).padStart(5)}, x: ${it.x.toFixed(1).padStart(5)}, w: ${it.width.toFixed(1).padStart(5)} | "${it.str}"`);
  });
}

run().catch(console.error);
