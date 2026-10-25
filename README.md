# 🏥 ระบบประเมินทุพพลภาพและพิมพ์แบบฟอร์ม สปส. 2-19 (Hospital Disability Check System)

ระบบ Full-Stack สำหรับโรงพยาบาลในการประเมินการสูญเสียสมรรถภาพ และดึงข้อมูลจากไฟล์ Excel (HOSxP Export) มาเติมลงในช่องว่างของแบบฟอร์มทางการ **สปส. 2-19** (แบบคำขอรับค่าบริการทางการแพทย์ของผู้ประกันตนที่ทุพพลภาพ สำหรับสถานพยาบาล) ในรูปแบบ PDF โดยอัตโนมัติ

---

## 🛠️ Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js Express, TypeScript, Multer, xlsx
- **Database**: MySQL, Prisma ORM
- **PDF Engine**: pdf-lib, @pdf-lib/fontkit, Thai TrueType Fonts (TH Sarabun New, Tahoma, Cordia New)

---

## 🚀 วิธีการติดตั้งและรันระบบ (Quick Start)

### 1. ติดตั้ง Dependencies
```bash
# ติดตั้ง Backend
cd backend
npm install
npx prisma generate
npx prisma db push

# ติดตั้ง Frontend
cd ../frontend
npm install
```

### 2. รันระบบ (Local Development)
```bash
# รัน Backend (Port 5000)
cd backend
npm run dev

# รัน Frontend (Port 5173)
cd frontend
npm run dev
```

เปิดเว็บเบราว์เซอร์ที่: **http://localhost:5173/**

---

## 🌟 ฟังก์ชันหลัก (Key Features)
1. **Hospital Executive Dashboard**: สรุปสถิติผู้ป่วย, กราฟจำแนกแผนกตรวจ และกลุ่มรหัสโรค ICD-10
2. **Patient Registry**: ทะเบียนผู้ขอรับการประเมิน ค้นหาตาม HN, ชื่อ, เลขบัตรประชาชน และสถานะ
3. **Word Studio**: เครื่องมือจัดฟอนต์ Ribbon สไตล์ Microsoft Word ปรับขนาด (pt), ตัวหนา (Bold), สีหมึก, ปุ่มลูกศรขยับละเอียดระดับ 0.5pt, และหน้ากระดาษจำลองลากย้ายฟิลด์ได้เอง
4. **PDF Auto-Fill (สปส. 2-19)**:
   - หยอดเลขบัตรประชาชน 13 หลักลงกล่องสี่เหลี่ยมทีละช่อง
   - ติ๊กถูก [✓] ในช่องสี่เหลี่ยมอัตโนมัติ
   - วางชื่อ-สกุล, อาการสำคัญ, รหัสโรค, วันที่รักษา และแปลงค่าใช้จ่ายเป็นตัวหนังสือภาษาไทย
5. **Excel Importer**: รองรับไฟล์ส่งออกจากระบบ HOSxP (`ทดสอบทุพพลภาพ.xlsx`)
