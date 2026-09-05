# สมุดบัญชี — Income/Expense Tracker

เว็บแอปจัดการรายรับ-รายจ่าย สร้างด้วย HTML/CSS/JavaScript (vanilla) + Node.js/Express + MySQL

## โครงสร้างโปรเจกต์

```
expense-tracker/
├── backend/
│   ├── config/
│   │   └── db.js              # เชื่อมต่อ MySQL (connection pool)
│   ├── middleware/
│   │   └── auth.js            # ตรวจสอบ JWT token
│   ├── routes/
│   │   ├── auth.js            # register / login
│   │   └── transactions.js    # CRUD รายการ + สรุปยอด
│   ├── .env.example           # ตัวอย่างไฟล์ตั้งค่า
│   ├── package.json
│   ├── schema.sql             # SQL สร้างฐานข้อมูล
│   └── server.js              # จุดเริ่มต้นของ Express app
└── frontend/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── api.js              # ฟังก์ชันเรียก API กลาง
    │   ├── auth.js              # โลจิกหน้า login/register
    │   └── dashboard.js         # โลจิกหน้า dashboard
    ├── index.html               # หน้า login/register
    └── dashboard.html           # หน้าหลักหลัง login
```

## สิ่งที่ต้องมีก่อนเริ่ม

- [Node.js](https://nodejs.org/) เวอร์ชัน 18 ขึ้นไป
- [MySQL](https://dev.mysql.com/downloads/) เวอร์ชัน 8 ขึ้นไป (ติดตั้งและรันอยู่บนเครื่อง หรือใช้บริการ cloud ก็ได้)

ตรวจสอบเวอร์ชันที่ติดตั้งไว้:
```bash
node -v
mysql --version
```

## ขั้นตอนการติดตั้ง

### 1. สร้างฐานข้อมูล

เปิด terminal แล้วรันคำสั่ง (จะถูกถามรหัสผ่านของ MySQL root):

```bash
cd expense-tracker/backend
mysql -u root -p < schema.sql
```

คำสั่งนี้จะสร้างฐานข้อมูลชื่อ `expense_tracker` พร้อมตาราง `users` และ `transactions` ให้อัตโนมัติ

### 2. ตั้งค่า Backend

```bash
cd expense-tracker/backend
npm install
cp .env.example .env
```

จากนั้นเปิดไฟล์ `.env` แล้วแก้ค่าต่อไปนี้ให้ตรงกับเครื่องของคุณ:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=รหัสผ่าน_mysql_ของคุณ
DB_NAME=expense_tracker
DB_PORT=3306
JWT_SECRET=ตั้งข้อความยาวๆ_สุ่มๆ_ของคุณเอง
PORT=5000
```

> **สำคัญ:** อย่าใช้ค่า `JWT_SECRET` ตัวอย่าง ให้ตั้งเป็นข้อความสุ่มที่ยาวและคาดเดายาก เพื่อความปลอดภัยของระบบ login

### 3. รัน Backend

```bash
npm start
```

ถ้าเชื่อมต่อฐานข้อมูลสำเร็จ จะเห็นข้อความ:
```
เชื่อมต่อฐานข้อมูล MySQL สำเร็จ
Server กำลังรันที่ http://localhost:5000
```

(ถ้าอยากให้ server รีสตาร์ทอัตโนมัติเวลาแก้โค้ด ใช้ `npm run dev` แทน ซึ่งใช้ `nodemon`)

### 4. เปิดใช้งานเว็บแอป

Backend ได้ตั้งค่าให้เสิร์ฟไฟล์ frontend ให้อัตโนมัติแล้ว (ผ่าน `express.static`) ดังนั้นแค่เปิดเบราว์เซอร์ไปที่:

```
http://localhost:5000
```

ก็จะเจอหน้า login/register ทันที ไม่ต้องรัน frontend แยก

### 5. เริ่มใช้งาน

1. กดแท็บ "สมัครสมาชิก" กรอกชื่อผู้ใช้ อีเมล รหัสผ่าน แล้วกดสมัคร
2. กลับมาแท็บ "เข้าสู่ระบบ" แล้ว login ด้วยบัญชีที่สร้าง
3. เพิ่มรายการรายรับ/รายจ่ายในฟอร์มด้านซ้าย
4. ดูยอดสรุปด้านบน และกราฟวงกลมรายจ่ายแยกตามหมวดหมู่
5. ใช้ตัวกรองด้านล่างฟอร์มเพื่อดูรายการตามช่วงวันที่/ประเภท/หมวดหมู่
6. กดปุ่ม "แก้ไข" หรือ "ลบ" ในตารางเพื่อจัดการรายการที่มีอยู่

## หมายเหตุด้านความปลอดภัย

- รหัสผ่านถูกเข้ารหัสด้วย `bcrypt` ก่อนบันทึกลงฐานข้อมูลเสมอ ไม่มีการเก็บ plain text
- ทุก request ที่เกี่ยวกับรายการ (เพิ่ม/แก้ไข/ลบ/ดู) ต้องแนบ JWT token ที่ได้จากการ login
- ผู้ใช้แต่ละคนจะเห็นและแก้ไขได้เฉพาะรายการของตัวเองเท่านั้น (ตรวจสอบด้วย `user_id` ทุกครั้งฝั่ง backend)

## แนวทางต่อยอด (ถ้าต้องการ)

- เพิ่มระบบ export ข้อมูลเป็น Excel/CSV
- เพิ่ม pagination ในตารางเมื่อมีรายการจำนวนมาก
- แยก deploy backend ขึ้น Railway/Render และฐานข้อมูลขึ้น PlanetScale หรือ Railway MySQL
- เพิ่มการแจ้งเตือนเมื่อรายจ่ายเกินงบที่ตั้งไว้ในแต่ละเดือน
