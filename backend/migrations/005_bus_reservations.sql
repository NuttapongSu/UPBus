CREATE TABLE IF NOT EXISTS bus_reservations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  bus_number    VARCHAR(10) NOT NULL,
  department    VARCHAR(150) NOT NULL,
  reserved_date DATE NOT NULL,
  note          TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by    VARCHAR(50),
  UNIQUE KEY uq_bus_date (bus_number, reserved_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
