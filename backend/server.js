const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

// إعداد الاتصال بقاعدة البيانات باستخدام المتغيرات البيئية اللي هنباصيها من الدوكر
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

// دالة لإنشاء الجدول أول ما الباك إند يقوم لو مش موجود
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database table initialized successfully.");
  } catch (err) {
    console.error("Error initializing database table:", err);
  }
};
setTimeout(initDb, 5000); // تأخير بسيط لضمان قيام الداتابيز أول مرة

// 1. نقطة فحص الحالة (Health Check)
app.get('/api/health', async (req, res) => {
  try {
    // نتأكد إن الباك إند قادر يتكلم مع الداتابيز فعلياً
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// 2. جلب البيانات من الداتابيز
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. كتابة بيانات جديدة في الداتابيز
app.notOk = app.post('/api/data', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });
    
    const result = await pool.query('INSERT INTO messages (text) VALUES ($1) RETURNING *', [text]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log('Backend server running on port 5000');
});
