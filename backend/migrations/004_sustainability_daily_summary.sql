CREATE TABLE IF NOT EXISTS sustainability_daily_summary (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  stat_date    DATE NOT NULL,
  co2_saved_kg FLOAT NOT NULL DEFAULT 0,
  kwh_used     FLOAT NOT NULL DEFAULT 0,
  km_total     FLOAT NOT NULL DEFAULT 0,
  buses_active INT NOT NULL DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
