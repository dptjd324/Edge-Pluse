CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  status_code INTEGER,
  response_time INTEGER,
  error_message TEXT,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites (id) ON DELETE CASCADE,
  CHECK (status IN ('up', 'down')),
  CHECK (response_time IS NULL OR response_time >= 0)
);

CREATE INDEX IF NOT EXISTS idx_checks_site_id ON checks (site_id);
CREATE INDEX IF NOT EXISTS idx_checks_site_checked_at ON checks (site_id, checked_at DESC);
