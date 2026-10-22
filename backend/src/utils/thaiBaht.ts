export function thaiBahtText(num: number): string {
  if (isNaN(num) || num === 0) return 'ศูนย์บาทถ้วน';
  
  const textNum = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const textUnit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  const intPart = Math.floor(Math.abs(num));
  const s = String(intPart);
  const len = s.length;
  let res = '';
  
  for (let i = 0; i < len; i++) {
    const digit = Number(s[i]);
    const pos = len - i - 1;
    if (digit !== 0) {
      if (pos % 6 === 1 && digit === 1) {
        res += '';
      } else if (pos % 6 === 1 && digit === 2) {
        res += 'ยี่';
      } else if (pos % 6 === 0 && digit === 1 && len > 1 && i === len - 1) {
        res += 'เอ็ด';
      } else {
        res += textNum[digit];
      }
      res += textUnit[pos % 6];
    }
  }
  
  return `${res}บาทถ้วน`;
}
