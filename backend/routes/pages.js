const express = require('express');
const router = express.Router();
const db = require('../db');

function requireSession(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/login');
}

// GET /login
router.get('/login', (req, res) => {
  if (req.session && req.session.admin) return res.redirect('/admin/dashboard');
  res.render('login', { error: null });
});

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await db.query(
      'SELECT id, username FROM admins WHERE username = ? AND password = ?',
      [username, password]
    );
    if (users.length === 0) {
      return res.render('login', { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    req.session.admin = { id: users[0].id, username: users[0].username };
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// GET /admin → redirect to dashboard
router.get('/admin', requireSession, (req, res) => {
  res.redirect('/admin/dashboard');
});

// GET /admin/dashboard
router.get('/admin/dashboard', requireSession, async (req, res) => {
  try {
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM complaints');

    const [pieRows] = await db.query(`
      SELECT topic, COUNT(*) as cnt FROM complaints GROUP BY topic
    `);
    const pieMap = { 'driver-service': 0, 'bus-condition': 0, 'system-wrong': 0 };
    pieRows.forEach(r => { if (pieMap[r.topic] !== undefined) pieMap[r.topic] = r.cnt; });
    const pieData = [pieMap['driver-service'], pieMap['bus-condition'], pieMap['system-wrong']];

    const [lineRows] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        SUM(topic = 'driver-service') as behavior,
        SUM(topic = 'bus-condition') as cond,
        SUM(topic = 'system-wrong') as sys
      FROM complaints
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);
    const lineData = {
      labels: lineRows.map(r => r.month),
      behavior: lineRows.map(r => r.behavior),
      condition: lineRows.map(r => r.cond),
      system: lineRows.map(r => r.sys),
    };

    const [[appStats]] = await db.query(`
      SELECT AVG(service_score) as s, AVG(status_score) as st, AVG(efficiency_score) as e, COUNT(*) as total
      FROM evaluations_app
    `);
    const [[travelStats]] = await db.query(`
      SELECT AVG(comfort_score) as c, AVG(time_score) as t, AVG(safety_score) as sa, COUNT(*) as total
      FROM evaluations_travel
    `);

    const evalData = {
      totalApp:    appStats.total    || 0,
      totalTravel: travelStats.total || 0,
      app:    [+Number(appStats.s||0).toFixed(2), +Number(appStats.st||0).toFixed(2), +Number(appStats.e||0).toFixed(2)],
      travel: [+Number(travelStats.c||0).toFixed(2), +Number(travelStats.t||0).toFixed(2), +Number(travelStats.sa||0).toFixed(2)],
    };

    // Pass complaints/pagination so the (HTML-commented-out) EJS block doesn't crash
    res.render('admin_bus', {
      totalItems: total,
      complaints: [],
      currentPage: 1,
      totalPages: 1,
      limit: 10,
      pieData,
      lineData,
      evalData,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('Dashboard error: ' + err.message);
  }
});

// GET /admin/complaints
router.get('/admin/complaints', requireSession, async (req, res) => {
  try {
    const limit = 10;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM complaints');
    const [complaints] = await db.query(
      'SELECT * FROM complaints ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.render('admin_complaints', {
      complaints,
      totalItems: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (err) {
    console.error('Complaints page error:', err);
    res.status(500).send('Server error');
  }
});

// POST /admin/update-status
router.post('/admin/update-status', requireSession, async (req, res) => {
  const { id, status } = req.body;
  try {
    await db.query('UPDATE complaints SET status = ? WHERE id = ?', [status, id]);
    res.redirect('/admin/complaints');
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).send('Server error');
  }
});

// GET /admin/evaluations
router.get('/admin/evaluations', requireSession, async (req, res) => {
  try {
    const limit = 10;
    const pageApp    = Math.max(1, parseInt(req.query.pageApp)    || 1);
    const pageTravel = Math.max(1, parseInt(req.query.pageTravel) || 1);

    const [[appStats]] = await db.query(`
      SELECT AVG(service_score) as avg_service, AVG(status_score) as avg_status,
             AVG(efficiency_score) as avg_efficiency, COUNT(*) as total
      FROM evaluations_app
    `);
    const [[travelStats]] = await db.query(`
      SELECT AVG(comfort_score) as avg_comfort, AVG(time_score) as avg_time,
             AVG(safety_score) as avg_safety, COUNT(*) as total
      FROM evaluations_travel
    `);

    const [evaluationsApp] = await db.query(
      'SELECT * FROM evaluations_app ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, (pageApp - 1) * limit]
    );
    const [evaluationsTravel] = await db.query(
      'SELECT * FROM evaluations_travel ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, (pageTravel - 1) * limit]
    );

    const avgApp    = (Number(appStats.avg_service||0) + Number(appStats.avg_status||0) + Number(appStats.avg_efficiency||0)) / 3;
    const avgTravel = (Number(travelStats.avg_comfort||0) + Number(travelStats.avg_time||0) + Number(travelStats.avg_safety||0)) / 3;

    res.render('admin_evaluations', {
      avgAppScore:    avgApp.toFixed(2),
      avgTravelScore: avgTravel.toFixed(2),
      totalApp:    appStats.total    || 0,
      totalTravel: travelStats.total || 0,
      appEvals: evaluationsApp,
      travelEvals: evaluationsTravel,
      pagination: {
        pageApp,    totalPageApp:    Math.max(1, Math.ceil((appStats.total    || 0) / limit)),
        pageTravel, totalPageTravel: Math.max(1, Math.ceil((travelStats.total || 0) / limit)),
      },
    });
  } catch (err) {
    console.error('Evaluations page error:', err);
    res.status(500).send('Server error');
  }
});

// รายชื่อหน่วยงานภายในมหาวิทยาลัยพะเยา
const DEPARTMENTS = [
  // ── ส่วนงานวิชาการ : คณะ ──────────────────────────────────────
  'คณะวิทยาศาสตร์',
  'คณะวิศวกรรมศาสตร์',
  'คณะเทคโนโลยีสารสนเทศและการสื่อสาร',
  'คณะแพทยศาสตร์',
  'คณะทันตแพทยศาสตร์',
  'คณะพยาบาลศาสตร์',
  'คณะเภสัชศาสตร์',
  'คณะสาธารณสุขศาสตร์และเวชศาสตร์ชุมชน',
  'คณะสหเวชศาสตร์',
  'คณะศิลปศาสตร์',
  'คณะนิติศาสตร์',
  'คณะรัฐศาสตร์และสังคมศาสตร์',
  'คณะบริหารธุรกิจและนิเทศศาสตร์',
  'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ',
  'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์',
  // ── ส่วนงานวิชาการ : วิทยาลัย ────────────────────────────────
  'วิทยาลัยการศึกษา',
  'วิทยาลัยการจัดการ',
  'วิทยาลัยพลังงานและสิ่งแวดล้อม',
  // ── ส่วนงานวิชาการ : สถาบัน / โรงเรียน ──────────────────────
  'สถาบันนวัตกรรมการเรียนรู้',
  'โรงเรียนสาธิตมหาวิทยาลัยพะเยา',
  // ── วิทยาเขต ──────────────────────────────────────────────────
  'วิทยาเขตเชียงราย',
  // ── ส่วนงานบริหาร : สำนักงาน ─────────────────────────────────
  'สำนักงานอธิการบดี',
  'สำนักงานสภามหาวิทยาลัยพะเยา',
  'สำนักงานตรวจสอบภายใน',
  'สำนักงานประกันคุณภาพการศึกษา',
  // ── ส่วนงานบริหาร : กอง ──────────────────────────────────────
  'กองกลาง',
  'กองบริการการศึกษา',
  'กองการเจ้าหน้าที่',
  'กองแผนงาน',
  'กองคลัง',
  'กองอาคารสถานที่',
  'กองกิจการนิสิต',
  'กองบริหารงานวิจัย',
  'กองบริหารงานวิจัยและนวัตกรรม',
  // ── ศูนย์ ──────────────────────────────────────────────────────
  'ศูนย์บริการวิชาการ',
  'ศูนย์การแพทย์และโรงพยาบาลมหาวิทยาลัยพะเยา',
  'ศูนย์บริการเทคโนโลยีสารสนเทศและการสื่อสาร',
  'ศูนย์สิ่งแวดล้อมนวัตกรรม',
  'ศูนย์ความเป็นเลิศด้านพลังงาน',
  // ── หน่วยงานอื่น ───────────────────────────────────────────────
  'โรงพยาบาลทันตกรรม มหาวิทยาลัยพะเยา',
  'งานวิเทศสัมพันธ์',
  'สภานิสิต มหาวิทยาลัยพะเยา',
  'องค์การนิสิต มหาวิทยาลัยพะเยา',
];

// GET /admin/reservations
router.get('/admin/reservations', requireSession, async (req, res) => {
  try {
    const [reservations] = await db.query(
      `SELECT id, bus_number, department, reserved_date, note,
              requester_name, requester_phone, document_path, status, admin_note,
              created_by, created_at
       FROM bus_reservations
       ORDER BY
         FIELD(status,'pending','approved','rejected'),
         reserved_date DESC, bus_number ASC
       LIMIT 200`
    );
    const busList = Array.from({ length: 30 }, (_, i) => 'TC' + String(i + 1).padStart(3, '0'));
    res.render('admin_reservations', {
      reservations, departments: DEPARTMENTS, busList,
      success: req.query.success, error: req.query.error,
    });
  } catch (err) {
    console.error('Reservations page error:', err);
    res.status(500).send('Server error');
  }
});

// POST /admin/reservations — admin เพิ่มการจองตรง (ไม่ต้องอนุมัติ)
router.post('/admin/reservations', requireSession, async (req, res) => {
  const { bus_number, department, reserved_date, note } = req.body;
  if (!bus_number || !department || !reserved_date) {
    return res.redirect('/admin/reservations?error=กรุณากรอกข้อมูลให้ครบ');
  }
  try {
    await db.query(
      `INSERT INTO bus_reservations (bus_number, department, reserved_date, note, created_by, status)
       VALUES (?, ?, ?, ?, ?, 'approved')
       ON DUPLICATE KEY UPDATE
         department=VALUES(department), note=VALUES(note),
         created_by=VALUES(created_by), status='approved'`,
      [bus_number, department, reserved_date, note || null, req.session.admin.username]
    );
    res.redirect('/admin/reservations?success=บันทึกสำเร็จ');
  } catch (err) {
    console.error('Add reservation error:', err.message);
    res.redirect('/admin/reservations?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/reservations/approve — อนุมัติคำขอ
router.post('/admin/reservations/approve', requireSession, async (req, res) => {
  const { id, admin_note } = req.body;
  try {
    await db.query(
      `UPDATE bus_reservations SET status='approved', admin_note=?, created_by=? WHERE id=?`,
      [admin_note || null, req.session.admin.username, id]
    );
    res.redirect('/admin/reservations?success=อนุมัติแล้ว');
  } catch (err) {
    console.error('Approve error:', err.message);
    res.redirect('/admin/reservations?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/reservations/reject — ปฏิเสธคำขอ
router.post('/admin/reservations/reject', requireSession, async (req, res) => {
  const { id, admin_note } = req.body;
  try {
    await db.query(
      `UPDATE bus_reservations SET status='rejected', admin_note=?, created_by=? WHERE id=?`,
      [admin_note || null, req.session.admin.username, id]
    );
    res.redirect('/admin/reservations?success=ปฏิเสธแล้ว');
  } catch (err) {
    console.error('Reject error:', err.message);
    res.redirect('/admin/reservations?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/reservations/delete — ลบการจองรถ
router.post('/admin/reservations/delete', requireSession, async (req, res) => {
  const { id } = req.body;
  try {
    await db.query('DELETE FROM bus_reservations WHERE id = ?', [id]);
    res.redirect('/admin/reservations?success=ลบสำเร็จ');
  } catch (err) {
    console.error('Delete reservation error:', err.message);
    res.redirect('/admin/reservations?error=เกิดข้อผิดพลาด');
  }
});

// ─── DRIVERS ────────────────────────────────────────────────────────────────

// GET /admin/drivers
router.get('/admin/drivers', requireSession, async (req, res) => {
  try {
    const [drivers] = await db.query(`
      SELECT d.id, d.full_name, d.line_user_id,
             b.bus_number
      FROM drivers d
      LEFT JOIN buses b ON b.current_driver_id = d.id
      ORDER BY d.id ASC
    `);
    const [buses] = await db.query(`
      SELECT b.bus_number, b.status_color, b.current_driver_id,
             d.full_name AS driver_name, d.id AS driver_id
      FROM buses b
      LEFT JOIN drivers d ON d.id = b.current_driver_id
      WHERE b.bus_number BETWEEN 1 AND 30
      ORDER BY b.bus_number ASC
    `);
    res.render('admin_drivers', {
      drivers,
      buses,
      success: req.query.success || null,
      error:   req.query.error   || null,
    });
  } catch (err) {
    console.error('Drivers page error:', err);
    res.status(500).send('Drivers error: ' + err.message);
  }
});

// POST /admin/drivers — เพิ่มคนขับ
router.post('/admin/drivers', requireSession, async (req, res) => {
  const { full_name, line_user_id } = req.body;
  if (!full_name) return res.redirect('/admin/drivers?error=กรุณากรอกชื่อ');
  try {
    await db.query(
      'INSERT INTO drivers (full_name, line_user_id) VALUES (?, ?)',
      [full_name.trim(), line_user_id?.trim() || null]
    );
    res.redirect('/admin/drivers?success=เพิ่มคนขับสำเร็จ');
  } catch (err) {
    console.error('Add driver error:', err);
    res.redirect('/admin/drivers?error=เกิดข้อผิดพลาด: ' + err.message);
  }
});

// POST /admin/drivers/edit — แก้ไขคนขับ
router.post('/admin/drivers/edit', requireSession, async (req, res) => {
  const { id, full_name, line_user_id } = req.body;
  if (!full_name) return res.redirect('/admin/drivers?error=กรุณากรอกชื่อ');
  try {
    await db.query(
      'UPDATE drivers SET full_name=?, line_user_id=? WHERE id=?',
      [full_name.trim(), line_user_id?.trim() || null, id]
    );
    res.redirect('/admin/drivers?success=แก้ไขสำเร็จ');
  } catch (err) {
    console.error('Edit driver error:', err);
    res.redirect('/admin/drivers?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/drivers/delete — ลบคนขับ
router.post('/admin/drivers/delete', requireSession, async (req, res) => {
  const { id } = req.body;
  try {
    await db.query('UPDATE buses SET current_driver_id=NULL WHERE current_driver_id=?', [id]);
    await db.query('DELETE FROM drivers WHERE id=?', [id]);
    res.redirect('/admin/drivers?success=ลบคนขับสำเร็จ');
  } catch (err) {
    console.error('Delete driver error:', err);
    res.redirect('/admin/drivers?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/drivers/clear-bus — เคลียร์คนขับออกจากรถโดย admin
router.post('/admin/drivers/clear-bus', requireSession, async (req, res) => {
  const { driver_id } = req.body;
  if (!driver_id) return res.redirect('/admin/drivers?error=ไม่พบ driver_id');
  try {
    await db.query(
      'UPDATE buses SET current_driver_id = NULL, status_color = "Purple" WHERE current_driver_id = ?',
      [driver_id]
    );
    res.redirect('/admin/drivers?success=เคลียร์รถสำเร็จ');
  } catch (err) {
    console.error('Clear bus error:', err);
    res.redirect('/admin/drivers?error=เกิดข้อผิดพลาด');
  }
});

// ─── ADMINS ─────────────────────────────────────────────────────────────────

// GET /admin/admins
router.get('/admin/admins', requireSession, async (req, res) => {
  try {
    const [admins] = await db.query('SELECT id, username, created_at FROM admins ORDER BY id ASC');
    res.render('admin_admins', {
      admins,
      currentAdminId: req.session.admin.id,
      success: req.query.success || null,
      error:   req.query.error   || null,
    });
  } catch (err) {
    console.error('Admins page error:', err);
    res.status(500).send('Admins error: ' + err.message);
  }
});

// POST /admin/admins — เพิ่ม admin
router.post('/admin/admins', requireSession, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.redirect('/admin/admins?error=กรุณากรอกข้อมูลให้ครบ');
  try {
    await db.query('INSERT INTO admins (username, password) VALUES (?, ?)', [username.trim(), password]);
    res.redirect('/admin/admins?success=เพิ่ม Admin สำเร็จ');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.redirect('/admin/admins?error=Username นี้มีอยู่แล้ว');
    res.redirect('/admin/admins?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/admins/reset-password — เปลี่ยนรหัสผ่าน
router.post('/admin/admins/reset-password', requireSession, async (req, res) => {
  const { id, password } = req.body;
  if (!password) return res.redirect('/admin/admins?error=กรุณากรอกรหัสผ่านใหม่');
  try {
    await db.query('UPDATE admins SET password=? WHERE id=?', [password, id]);
    res.redirect('/admin/admins?success=เปลี่ยนรหัสผ่านสำเร็จ');
  } catch (err) {
    res.redirect('/admin/admins?error=เกิดข้อผิดพลาด');
  }
});

// POST /admin/admins/delete — ลบ admin
router.post('/admin/admins/delete', requireSession, async (req, res) => {
  const { id } = req.body;
  if (parseInt(id) === req.session.admin.id) {
    return res.redirect('/admin/admins?error=ไม่สามารถลบบัญชีตัวเองได้');
  }
  try {
    await db.query('DELETE FROM admins WHERE id=?', [id]);
    res.redirect('/admin/admins?success=ลบ Admin สำเร็จ');
  } catch (err) {
    res.redirect('/admin/admins?error=เกิดข้อผิดพลาด');
  }
});

module.exports = router;
