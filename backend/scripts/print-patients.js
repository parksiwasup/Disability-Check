const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.resolve(__dirname, '../assets/data.xlsx');
const wb = xlsx.readFile(excelPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log('Total patient records in Excel:', rows.length);
rows.forEach((r, i) => {
  console.log({
    index: i + 1,
    hn: r['HN'],
    vn: r['VN'],
    idCard: r['เลขบัตรประชาชน'],
    name: r['ชื่อ-สกุล'],
    phone: r['เบอร์มือถือ'] || r['เบอร์บ้าน'],
    dept: r['แผนก'],
    diagPrimary: r['ผลวินิจฉัยหลัก'],
    diagSecondary: r['ผลวินิจฉัยอื่น'],
    chiefComplaint: r['อาการสำคัญ'],
    date: r['วันที่รักษา'],
    status: r['สถานะหลังตรวจ']
  });
});
