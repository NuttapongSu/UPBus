ALTER TABLE bus_reservations
  ADD COLUMN coordinator_name  VARCHAR(100)  AFTER requester_phone,
  ADD COLUMN coordinator_phone VARCHAR(20)   AFTER coordinator_name,
  ADD COLUMN start_time        TIME          AFTER coordinator_phone,
  ADD COLUMN end_time          TIME          AFTER start_time,
  ADD COLUMN all_day           TINYINT(1)    NOT NULL DEFAULT 0 AFTER end_time,
  ADD COLUMN reservation_group CHAR(36)      AFTER all_day;
