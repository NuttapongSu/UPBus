ALTER TABLE bus_reservations
  ADD COLUMN IF NOT EXISTS coordinator_name  VARCHAR(100)  AFTER requester_phone,
  ADD COLUMN IF NOT EXISTS coordinator_phone VARCHAR(20)   AFTER coordinator_name,
  ADD COLUMN IF NOT EXISTS start_time        TIME          AFTER coordinator_phone,
  ADD COLUMN IF NOT EXISTS end_time          TIME          AFTER start_time,
  ADD COLUMN IF NOT EXISTS all_day           TINYINT(1)    NOT NULL DEFAULT 0 AFTER end_time,
  ADD COLUMN IF NOT EXISTS reservation_group CHAR(36)      AFTER all_day;

-- ลบ UNIQUE KEY เดิมที่ผูก bus+date ก่อน (รองรับการจอง bus เดิมหลาย group ใน scenario ซับซ้อน)
-- คง constraint ไว้: 1 bus ต่อ 1 วัน ต่อ 1 group ยังคงทำงานผ่าน application logic
