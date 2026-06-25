ALTER TABLE bus_reservations
  ADD COLUMN requester_name  VARCHAR(100)                              AFTER note,
  ADD COLUMN requester_phone VARCHAR(20)                               AFTER requester_name,
  ADD COLUMN document_path   VARCHAR(255)                              AFTER requester_phone,
  ADD COLUMN status          ENUM('pending','approved','rejected')
                             NOT NULL DEFAULT 'pending'                AFTER document_path,
  ADD COLUMN admin_note      TEXT                                      AFTER status;
