const express = require('express');
const fs = require('fs'); // إضافة مكتبة قراءة الملفات لدوكر سيكرتس
const { Pool } = require('pg');

const app = express();
app.use(express.json());

/**
 * دالة مساعدة لقراءة كلمة المرور بأمان من الـ Docker Secrets.
 * إذا وجد مسار للملف وقام بقراءته بنجاح سيعتمد عليه،
 * وإلا سيعود لقراءة كلمة المرور العادية من متغيرات البيئة كخيار احتياطي.
 */
function readSecretPassword() {
  const filePath = process.env.DB_PASSWORD_FILE;
  
  if (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').trim();
      }
    } catch (error) {
      console.error(`[حماية] خطأ أثناء قراءة ملف كلمة المرور:`, error.message);
    }
  }
  // خيار احتياطي في حال عدم استخدام الـ Secrets
  return process.env.DB_PASSWORD; 
}

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: readSecretPassword(), // تم التعديل هنا لقراءة القيمة الآمنة المستخرجة
  database: process.env.DB_NAME,
  port: 5432,
});

// تحديث بنية الجدول لتشمل الحقول الجديدة
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        age INT,
        address TEXT,
        phone TEXT,
        enrollment_date DATE,
        tasks_dates JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database table 'students' initialized.");
  } catch (err) {
    console.error("Error initializing table:", err);
  }
};
setTimeout(initDb, 5000);

// 1. Healthcheck
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'healthy' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// 2. جلب كل الطلاب (Read)
app.get('/api/students', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM students ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. إضافة طالب جديد (Create)
app.post('/api/students', async (req, res) => {
  try {
    const { name, age, address, phone, enrollment_date, tasks_dates } = req.body;
    const result = await pool.query(
      `INSERT INTO students (name, age, address, phone, enrollment_date, tasks_dates)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, age, address, phone, enrollment_date, JSON.stringify(tasks_dates || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. تعديل بيانات طالب (Update)
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, address, phone, enrollment_date, tasks_dates } = req.body;
    const result = await pool.query(
      `UPDATE students
       SET name=$1, age=$2, address=$3, phone=$4, enrollment_date=$5, tasks_dates=$6
       WHERE id=$7 RETURNING *`,
      [name, age, address, phone, enrollment_date, JSON.stringify(tasks_dates || {}), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. حذف طالب (Delete)
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted successfully", deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Backend running on port 5000'));
