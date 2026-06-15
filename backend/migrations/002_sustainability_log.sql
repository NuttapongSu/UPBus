CREATE TABLE IF NOT EXISTS sustainability_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  logged_at    DATETIME NOT NULL,
  co2_saved_kg FLOAT DEFAULT 0,
  kwh_used     FLOAT DEFAULT 0,
  km_total     FLOAT DEFAULT 0,
  passengers   INT DEFAULT 0,
  INDEX idx_logged (logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
