-- =====================================================================
-- SmartGov Connect - skema database (TiDB / MySQL-compatible)
-- Jalankan di SQL Editor TiDB Cloud, atau dengan: npm run db:init
--
-- Catatan: relasi antar tabel dijaga di lapisan aplikasi dan indeks,
-- tanpa FOREIGN KEY, agar kompatibel di semua versi TiDB Cloud.
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('warga','petugas','admin') NOT NULL DEFAULT 'warga',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
);
git
CREATE TABLE IF NOT EXISTS categories (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,
  description VARCHAR(255) NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
);

CREATE TABLE IF NOT EXISTS reports (
  id            BIGINT        NOT NULL AUTO_INCREMENT,
  ticket_no     VARCHAR(30)   NOT NULL,
  user_id       BIGINT        NOT NULL,
  category_id   BIGINT        NOT NULL,
  title         VARCHAR(150)  NOT NULL,
  description   TEXT          NOT NULL,
  location_text VARCHAR(255)  NOT NULL,
  latitude      DECIMAL(9,6)  NULL,
  longitude     DECIMAL(9,6)  NULL,
  photo_url     VARCHAR(500)  NULL,  -- dicadangkan untuk fitur unggah foto (belum aktif)
  is_anonymous  TINYINT(1)    NOT NULL DEFAULT 0,
  status        ENUM('baru','diverifikasi','diproses','selesai','ditolak') NOT NULL DEFAULT 'baru',
  officer_note  TEXT          NULL,
  handled_by    BIGINT        NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reports_ticket (ticket_no),
  KEY idx_reports_user (user_id, created_at),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_category (category_id)
);

CREATE TABLE IF NOT EXISTS report_status_history (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  report_id  BIGINT       NOT NULL,
  status     ENUM('baru','diverifikasi','diproses','selesai','ditolak') NOT NULL,
  note       VARCHAR(1000) NULL,
  changed_by BIGINT       NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_report (report_id, created_at)
);

-- Kategori awal (aman dijalankan berulang)
INSERT IGNORE INTO categories (name, description) VALUES
  ('Jalan & Infrastruktur', 'Jalan berlubang, trotoar rusak, jembatan, drainase'),
  ('Kebersihan & Sampah',   'Tumpukan sampah, TPS penuh, saluran tersumbat'),
  ('Penerangan Jalan',      'Lampu jalan mati atau rusak'),
  ('Keamanan & Ketertiban', 'Gangguan keamanan lingkungan'),
  ('Pelayanan Administrasi','Keluhan layanan KTP, KK, surat pengantar'),
  ('Lainnya',               'Pengaduan di luar kategori di atas');
