function convertIntegerToThaiWords(n: number): string {
  if (n === 0) return '';
  const textNum = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const textUnit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const s = String(n);
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
      } else if (pos % 6 === 0 && digit === 1 && len > 1 && s[i - 1] !== '0') {
        res += 'เอ็ด';
      } else {
        res += textNum[digit];
      }
      res += textUnit[pos % 6];
    } else if (pos > 0 && pos % 6 === 0) {
      res += 'ล้าน';
    }
  }

  return res;
}

export function thaiBahtText(num: number): string {
  const numericVal = Number(num);
  if (isNaN(numericVal) || numericVal === 0) return 'ศูนย์บาทถ้วน';

  const absVal = Math.abs(numericVal);
  // Round to 2 decimal places (satang) to avoid floating point precision issues
  const totalSatang = Math.round(absVal * 100);
  const bahtPart = Math.floor(totalSatang / 100);
  const satangPart = totalSatang % 100;

  let result = '';
  if (bahtPart > 0) {
    result += `${convertIntegerToThaiWords(bahtPart)}บาท`;
  }

  if (satangPart === 0) {
    result += 'ถ้วน';
  } else {
    result += `${convertIntegerToThaiWords(satangPart)}สตางค์`;
  }

  return result;
}

export function formatThaiCurrencyNumeric(num: any): string {
  const n = Number(num || 0);
  if (isNaN(n)) return String(num || '0');
  const hasDecimals = Math.round(n * 100) % 100 !== 0;
  return n.toLocaleString('th-TH', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}
