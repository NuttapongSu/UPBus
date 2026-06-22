const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const db      = require('../db');
const { sendLineNotify } = require('../services/lineNotify');

// POST /api/line/webhook — รับ event จาก LINE Platform
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // ตอบ 200 ทันทีก่อน (LINE ต้องการ response ภายใน 1 วินาที)
  res.status(200).send('OK');

  let body;
  try { body = JSON.parse(req.body); } catch { return; }

  for (const event of (body.events || [])) {
    if (event.type === 'follow' || event.type === 'message') {
      const userId  = event.source?.userId;
      const replyToken = event.replyToken;
      if (userId) console.log(`📲 LINE user interacted: ${userId}`);
      // เก็บ userId ของ admin ไว้ log (ดูใน console เพื่อนำไปใส่ .env)
    }
  }
});

// GET /api/line/test — ทดสอบส่ง LINE message ไปยัง admin
router.get('/test', async (req, res) => {
  try {
    await sendLineNotify('🧪 ทดสอบระบบ UPBus LINE Notify — หากได้รับข้อความนี้แสดงว่าตั้งค่าถูกต้องแล้ว ✅');
    res.json({ success: true, message: 'ส่ง LINE message สำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
