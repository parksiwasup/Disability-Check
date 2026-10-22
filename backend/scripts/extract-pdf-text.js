const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function run() {
  const pdfPath = path.resolve(__dirname, '../../สปส2-19.pdf');
  const dataBuffer = fs.readFileSync(pdfPath);
  
  const data = await pdfParse(dataBuffer);
  console.log('Total pages:', data.numpages);
  console.log('PDF Info:', data.info);
  console.log('\n=== EXTRACTED TEXT ===\n');
  console.log(data.text);
}

run().catch(console.error);
