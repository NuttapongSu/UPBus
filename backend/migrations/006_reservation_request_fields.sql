ALTER TABLE bus_reservations
  ADD COLUMN IF NOT EXISTS requester_name  VARCHAR(100)                              AFTER note,
  ADD COLUMN IF NOT EXISTS requester_phone VARCHAR(20)                               AFTER requester_name,
  ADD COLUMN IF NOT EXISTS document_path   VARCHAR(255)                              AFTER requester_phone,
  ADD COLUMN IF NOT EXISTS status          ENUM('pending','approved','rejected')
                                           NOT NULL DEFAULT 'pending'                AFTER document_path,
  ADD COLUMN IF NOT EXISTS admin_note      TEXT                                      AFTER status;
