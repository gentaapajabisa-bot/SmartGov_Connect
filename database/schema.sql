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
  email_verified_at TIMESTAMP NULL,
  consent_at    TIMESTAMP    NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
);

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
  assigned_to   BIGINT        NULL,  -- petugas yang ditugaskan menangani laporan
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reports_ticket (ticket_no),
  KEY idx_reports_user (user_id, created_at),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_category (category_id),
  KEY idx_reports_assigned (assigned_to, status)
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

-- Foto bukti laporan. Disimpan di database (sudah dikompres di sisi klien) dan hanya
-- disajikan lewat API yang memeriksa hak akses, jadi tidak ada URL publik.
CREATE TABLE IF NOT EXISTS report_photos (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  report_id  BIGINT      NOT NULL,
  mime       VARCHAR(30) NOT NULL DEFAULT 'image/jpeg',
  size_bytes INT         NOT NULL,
  data       MEDIUMBLOB  NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_photos_report (report_id)
);

-- Notifikasi di dalam aplikasi (perubahan status, penugasan).
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  user_id    BIGINT       NOT NULL,
  report_id  BIGINT       NULL,
  message    VARCHAR(255) NOT NULL,
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, is_read, created_at)
);

-- Token sekali pakai untuk reset kata sandi dan verifikasi email. Hanya hash-nya yang disimpan.
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  user_id    BIGINT      NOT NULL,
  kind       VARCHAR(20) NOT NULL,
  token_hash CHAR(64)    NOT NULL,
  expires_at TIMESTAMP   NOT NULL,
  used_at    TIMESTAMP   NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tokens_hash (token_hash),
  KEY idx_tokens_user (user_id, kind)
);

-- Penghitung pembatasan percobaan (login, daftar, lupa kata sandi).
CREATE TABLE IF NOT EXISTS rate_limits (
  k        CHAR(64)  NOT NULL,
  hits     INT       NOT NULL DEFAULT 0,
  reset_at TIMESTAMP NOT NULL,
  PRIMARY KEY (k)
);

-- Catatan audit tindakan admin.
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  actor_id    BIGINT       NOT NULL,
  action      VARCHAR(50)  NOT NULL,
  target_type VARCHAR(30)  NULL,
  target_id   BIGINT       NULL,
  detail      VARCHAR(500) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_created (created_at)
);

-- Kategori awal (aman dijalankan berulang)
INSERT IGNORE INTO categories (name, description) VALUES
  ('Jalan & Infrastruktur', 'Jalan berlubang, trotoar rusak, jembatan, drainase'),
  ('Kebersihan & Sampah',   'Tumpukan sampah, TPS penuh, saluran tersumbat'),
  ('Penerangan Jalan',      'Lampu jalan mati atau rusak'),
  ('Keamanan & Ketertiban', 'Gangguan keamanan lingkungan'),
  ('Pelayanan Administrasi','Keluhan layanan KTP, KK, surat pengantar'),
  ('Lainnya',               'Pengaduan di luar kategori di atas');
