

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');

const app = express();

// Middleware พื้นฐาน
app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// health check เผื่อไว้ทดสอบว่า server รันอยู่
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server กำลังทำงาน' });
});

// จัดการ error ที่ไม่คาดคิด ป้องกัน server ล่ม
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ message: 'เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ' });
});

const PORT = process.env.PORT || 5000;

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`Server กำลังรันที่ http://localhost:${PORT}`);
  });
});
