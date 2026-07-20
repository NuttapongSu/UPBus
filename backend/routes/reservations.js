const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const db      = require('../db');
const { sendLineNotify, sendLinePush } = require('../services/lineNotify');

const MAX_PER_DAY = 3;
const ALL_BUSES   = Array.from({ length: 30 }, (_, i) => 'TC' + String(i + 1).padStart(3, '0'));

// GET /api/reservations — today's APPROVED reservations (used by buses API)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT bus_number, department, note
       FROM bus_reservations
       WHERE reserved_date = CURDATE() AND status = 'approved'
       ORDER BY bus_number ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Reservations error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reservations/availability?date=YYYY-MM-DD
router.get('/availability', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const [[{ cnt }]] = await db.query(
      `SELECT COUNT(*) as cnt FROM bus_reservations
       WHERE reserved_date = ? AND status IN ('pending','approved')`,
      [date]
    );
    const used      = Number(cnt);
    const remaining = Math.max(0, MAX_PER_DAY - used);
    res.json({ date, used, max: MAX_PER_DAY, remaining });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/reservations/request
router.post('/request', async (req, res) => {
  const body = req.body || {};
  const {
    department, reserved_date,
    coordinator_name, coordinator_phone,
    note,
    start_time, end_time, all_day,
    bus_count,
  } = body;
  // ฟอร์มไม่มีช่องแยก "ผู้ขอ" ใช้ผู้ประสานงานแทนทั้ง requester และ coordinator
  const requester_name  = coordinator_name;
  const requester_phone = coordinator_phone;

  if (!department || !reserved_date) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  const count = Math.min(parseInt(bus_count) || 1, MAX_PER_DAY);

  try {
    // ตรวจโควต้าวันนั้น
    const [[{ cnt }]] = await db.query(
      `SELECT COUNT(*) as cnt FROM bus_reservations
       WHERE reserved_date = ? AND status IN ('pending','approved')`,
      [reserved_date]
    );
    const usedToday = Number(cnt);
    const canBook   = MAX_PER_DAY - usedToday;
    if (canBook <= 0) {
      return res.status(409).json({ error: `วันที่ ${reserved_date} จองรถเต็มแล้ว (สูงสุด ${MAX_PER_DAY} คันต่อวัน)` });
    }
    const actualCount = Math.min(count, canBook);

    // หารถที่ถูกจองในวันนั้นแล้ว
    const [booked] = await db.query(
      `SELECT bus_number FROM bus_reservations
       WHERE reserved_date = ? AND status != 'rejected'`,
      [reserved_date]
    );
    const bookedSet  = new Set(booked.map(r => r.bus_number));
    const available  = ALL_BUSES.filter(b => !bookedSet.has(b));

    if (available.length < actualCount) {
      return res.status(409).json({ error: `ไม่มีรถว่างเพียงพอในวันที่ ${reserved_date}` });
    }

    // Round-robin: เลือกรถที่เคยถูกจองน้อยที่สุดก่อน (ตลอดประวัติ) ถ้าเท่ากันเรียงตามเลขรถ
    const [totals] = await db.query(
      `SELECT bus_number, COUNT(*) as total FROM bus_reservations
       WHERE status != 'rejected' GROUP BY bus_number`
    );
    const totalMap = {};
    totals.forEach(r => { totalMap[r.bus_number] = Number(r.total); });

    available.sort((a, b) => {
      const diff = (totalMap[a] || 0) - (totalMap[b] || 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    });

    const assignedBuses = available.slice(0, actualCount);
    const groupId       = crypto.randomUUID();
    const isAllDay      = all_day === '1' || all_day === true;

    // Insert ทีละคัน
    for (const busNum of assignedBuses) {
      await db.query(
        `INSERT INTO bus_reservations
           (bus_number, department, reserved_date, note,
            requester_name, requester_phone,
            coordinator_name, coordinator_phone,
            start_time, end_time, all_day,
            reservation_group, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          busNum, department, reserved_date, note || null,
          requester_name, requester_phone || null,
          coordinator_name || null, coordinator_phone || null,
          isAllDay ? null : (start_time || null),
          isAllDay ? null : (end_time   || null),
          isAllDay ? 1 : 0,
          groupId,
        ]
      );

      // ส่งข้อความไปยังคนขับรถที่ถูกเลือก
      const busNo = parseInt(busNum.replace('TC', ''));
      const [[driver]] = await db.query(
        `SELECT d.line_user_id, d.full_name
         FROM buses b
         LEFT JOIN drivers d ON b.current_driver_id = d.id
         WHERE b.bus_number = ?`,
        [busNo]
      );
      if (driver?.line_user_id) {
        const timeStr = isAllDay
          ? 'ตลอดทั้งวัน'
          : `${start_time || '?'} – ${end_time || '?'}`;
        const dateStr = new Date(reserved_date).toLocaleDateString('th-TH', {
          year: 'numeric', month: 'long', day: 'numeric',
        });
        await sendLinePush(
          driver.line_user_id,
          `🚌 แจ้งเตือนจากระบบ UPBus\n` +
          `คุณ${driver.full_name} ได้รับมอบหมายให้วิ่งรถ ${busNum} นอกเส้นทาง\n\n` +
          `📅 วันที่: ${dateStr}\n` +
          `⏰ เวลา: ${timeStr}\n` +
          `🏢 หน่วยงาน: ${department}\n` +
          `👤 ผู้ขอ: ${requester_name}${requester_phone ? ` (${requester_phone})` : ''}\n` +
          (coordinator_name
            ? `📞 ผู้ประสานงาน: ${coordinator_name}${coordinator_phone ? ` (${coordinator_phone})` : ''}\n`
            : '') +
          `📝 หมายเหตุ: ${note || '-'}`
        );
      }
    }

    // LINE Notify แจ้ง admin
    const dateStr = new Date(reserved_date).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const timeStr = isAllDay ? 'ตลอดทั้งวัน' : `${start_time} – ${end_time}`;
    await sendLineNotify(
      `\n🚌 [UPBus] คำขอจองรถใหม่\n` +
      `📋 หน่วยงาน: ${department}\n` +
      `👤 ผู้ขอ: ${requester_name}${requester_phone ? ` (${requester_phone})` : ''}\n` +
      (coordinator_name
        ? `📞 ผู้ประสานงาน: ${coordinator_name}${coordinator_phone ? ` (${coordinator_phone})` : ''}\n`
        : '') +
      `🚍 รถที่จัดสรร: ${assignedBuses.join(', ')}\n` +
      `📅 วันที่: ${dateStr}\n` +
      `⏰ เวลา: ${timeStr}\n` +
      `📝 หมายเหตุ: ${note || '-'}\n` +
      `👉 http://localhost:5000/admin/reservations`
    );

    res.json({
      success: true,
      assigned_buses: assignedBuses,
      message: `ส่งคำขอจองรถเรียบร้อยแล้ว (รถที่จัดสรร: ${assignedBuses.join(', ')}) รอ admin อนุมัติ`,
    });
  } catch (err) {
    console.error('Reservation request error:', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
