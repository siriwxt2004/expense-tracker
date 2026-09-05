// config/db.js
// สร้าง connection pool สำหรับเชื่อมต่อ MySQL
// การใช้ pool แทนการเปิด connection เดี่ยวๆ ช่วยให้รองรับหลาย request พร้อมกันได้ดีกว่า

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = { rejectUnauthorized: true };
}

const pool = mysql.createPool(dbConfig);

// ทดสอบการเชื่อมต่อตอนเริ่มแอป
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('เชื่อมต่อฐานข้อมูล MySQL สำเร็จ');
    connection.release();
  } catch (err) {
    console.error('เชื่อมต่อฐานข้อมูลไม่สำเร็จ:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
