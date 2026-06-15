CREATE TABLE IF NOT EXISTS gps_snapshots (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  bus_id      VARCHAR(10) NOT NULL,
  lat         DECIMAL(10,6),
  lng         DECIMAL(10,6),
  speed       FLOAT DEFAULT 0,
  bearing     FLOAT DEFAULT 0,
  soc         FLOAT DEFAULT 0,
  bv          FLOAT DEFAULT 0,
  be          FLOAT DEFAULT 0,
  odo         INT DEFAULT 0,
  acc         TINYINT(1) DEFAULT 0,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recorded (recorded_at),
  INDEX idx_bus_recorded (bus_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
