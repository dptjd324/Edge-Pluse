CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  check_interval INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (check_interval > 0),
  CHECK (is_active IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites (slug);
CREATE INDEX IF NOT EXISTS idx_sites_is_active ON sites (is_active);
