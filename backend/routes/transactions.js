

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

const VALID_TYPES = ['income', 'expense'];

// ฟังก์ชันช่วยตรวจสอบข้อมูล transaction ที่ส่งเข้ามา
function validateTransactionInput({ type, amount, category, transaction_date }) {
  if (!VALID_TYPES.includes(type)) {
    return 'type ต้องเป็น income หรือ expense เท่านั้น';
  }
  if (amount === undefined || isNaN(amount) || Number(amount) <= 0) {
    return 'amount ต้องเป็นตัวเลขที่มากกว่า 0';
  }
  if (!category || category.trim() === '') {
    return 'กรุณาระบุหมวดหมู่';
  }
  if (!transaction_date || isNaN(Date.parse(transaction_date))) {
    return 'รูปแบบวันที่ไม่ถูกต้อง';
  }
  return null;
}

// GET /api/transactions - ดึงรายการทั้งหมด รองรับ query filter
// query params ที่รองรับ: type, category, start_date, end_date
router.get('/', async (req, res) => {
  try {
    const { type, category, start_date, end_date } = req.query;
    const userId = req.user.id;

    let sql = 'SELECT * FROM transactions WHERE user_id = ?';
    const params = [userId];

    if (type && VALID_TYPES.includes(type)) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (start_date) {
      sql += ' AND transaction_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND transaction_date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY transaction_date DESC, id DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการได้' });
  }
});

// GET /api/transactions/summary - สรุปยอดรวมรายรับ/รายจ่าย/คงเหลือ + แยกตามหมวดหมู่
// รองรับ filter วันที่แบบเดียวกับ GET /
router.get('/summary', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    let dateFilter = '';
    const params = [userId];
    if (start_date) {
      dateFilter += ' AND transaction_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND transaction_date <= ?';
      params.push(end_date);
    }

    // ยอดรวมรายรับ-รายจ่าย
    const [totals] = await pool.query(
      `SELECT type, SUM(amount) AS total FROM transactions
       WHERE user_id = ? ${dateFilter} GROUP BY type`,
      params
    );

    let totalIncome = 0;
    let totalExpense = 0;
    totals.forEach((row) => {
      if (row.type === 'income') totalIncome = Number(row.total);
      if (row.type === 'expense') totalExpense = Number(row.total);
    });

    // ยอดรายจ่ายแยกตามหมวดหมู่ (สำหรับกราฟ)
    const [byCategory] = await pool.query(
      `SELECT category, type, SUM(amount) AS total FROM transactions
       WHERE user_id = ? ${dateFilter} GROUP BY category, type
       ORDER BY total DESC`,
      params
    );

    res.json({
      total_income: totalIncome,
      total_expense: totalExpense,
      balance: totalIncome - totalExpense,
      by_category: byCategory,
    });
  } catch (err) {
    console.error('Get summary error:', err);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลสรุปได้' });
  }
});

// POST /api/transactions - เพิ่มรายการใหม่
router.post('/', async (req, res) => {
  try {
    const { type, amount, category, transaction_date, note } = req.body;
    const userId = req.user.id;

    const error = validateTransactionInput({ type, amount, category, transaction_date });
    if (error) {
      return res.status(400).json({ message: error });
    }

    const [result] = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, category, transaction_date, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, amount, category.trim(), transaction_date, note || null]
    );

    const [newRow] = await pool.query('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ message: 'ไม่สามารถเพิ่มรายการได้' });
  }
});

// PUT /api/transactions/:id - แก้ไขรายการ
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, category, transaction_date, note } = req.body;
    const userId = req.user.id;

    const error = validateTransactionInput({ type, amount, category, transaction_date });
    if (error) {
      return res.status(400).json({ message: error });
    }

    // ตรวจสอบว่ารายการนี้เป็นของ user ที่ login อยู่จริงหรือไม่ (กันแก้ข้อมูลคนอื่น)
    const [existing] = await pool.query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการที่ต้องการแก้ไข' });
    }

    await pool.query(
      `UPDATE transactions SET type = ?, amount = ?, category = ?, transaction_date = ?, note = ?
       WHERE id = ? AND user_id = ?`,
      [type, amount, category.trim(), transaction_date, note || null, id, userId]
    );

    const [updatedRow] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id]);
    res.json(updatedRow[0]);
  } catch (err) {
    console.error('Update transaction error:', err);
    res.status(500).json({ message: 'ไม่สามารถแก้ไขรายการได้' });
  }
});

// DELETE /api/transactions/:id - ลบรายการ
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการที่ต้องการลบ' });
    }

    res.json({ message: 'ลบรายการสำเร็จ' });
  } catch (err) {
    console.error('Delete transaction error:', err);
    res.status(500).json({ message: 'ไม่สามารถลบรายการได้' });
  }
});

module.exports = router;
