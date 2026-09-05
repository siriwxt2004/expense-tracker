// middleware/auth.js
// ตรวจสอบว่า request มี JWT token ที่ถูกต้องหรือไม่
// ใช้ป้องกัน route ที่ต้อง login ก่อนถึงจะเข้าถึงได้

const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
  // token จะถูกส่งมาใน header แบบ: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }
    // เก็บข้อมูล user ที่ decode ได้ไว้ใน req เพื่อใช้ใน route ถัดไป
    req.user = decoded; // { id, username }
    next();
  });
}

module.exports = authenticateToken;
