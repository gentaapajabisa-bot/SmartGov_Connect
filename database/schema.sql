-- =====================================================================
-- SmartGov Connect - skema database (TiDB / MySQL-compatible)
-- Jalankan di SQL Editor TiDB Cloud, atau dengan: npm run db:init
--
-- Privasi & Anonimitas Warga:
--  - Warga tidak memiliki akun di tabel users (role hanya 'petugas' dan 'admin').
--  - Laporan tidak menyimpan nama, NIK, email, atau nomor HP pelapor.
--  - Pelacakan & penilaian warga menggunakan ticket_no + device_token_hash.
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id                BIGINT       NOT NULL AUTO_INCREMENT,
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(150) NOT NULL,
  phone             VARCHAR(20)  NULL,
  password_hash     VARCHAR(100) NOT NULL,
  role              ENUM('petugas','admin') NOT NULL DEFAULT 'petugas',
  is_active         TINYINT(1)   NOT NULL DEFAULT 1,
  email_verified_at TIMESTAMP    NULL,
  consent_at        TIMESTAMP    NULL,
  notify_email      TINYINT(1)   NOT NULL DEFAULT 1,
  notify_wa         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
);

CREATE TABLE IF NOT EXISTS categories (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,
  description VARCHAR(255) NULL,
  sla_hours   INT          NOT NULL DEFAULT 168,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
);

CREATE TABLE IF NOT EXISTS reports (
  id                BIGINT        NOT NULL AUTO_INCREMENT,
  ticket_no         VARCHAR(30)   NOT NULL,
  device_token_hash CHAR(64)      NOT NULL,
  user_id           BIGINT        NULL,
  category_id       BIGINT        NOT NULL,
  title             VARCHAR(150)  NOT NULL,
  description       TEXT          NOT NULL,
  location_text     VARCHAR(255)  NOT NULL,
  latitude          DECIMAL(9,6)  NULL,
  longitude         DECIMAL(9,6)  NULL,
  photo_url         VARCHAR(500)  NULL,
  is_anonymous      TINYINT(1)    NOT NULL DEFAULT 1,
  status            ENUM('baru','diverifikasi','diproses','selesai','ditolak') NOT NULL DEFAULT 'baru',
  officer_note      TEXT          NULL,
  handled_by        BIGINT        NULL,
  assigned_to       BIGINT        NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reports_ticket (ticket_no),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_category (category_id),
  KEY idx_reports_assigned (assigned_to, status)
);

CREATE TABLE IF NOT EXISTS report_status_history (
  id         BIGINT        NOT NULL AUTO_INCREMENT,
  report_id  BIGINT        NOT NULL,
  status     ENUM('baru','diverifikasi','diproses','selesai','ditolak') NOT NULL,
  note       VARCHAR(1000) NULL,
  changed_by BIGINT        NULL,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_report (report_id, created_at)
);

CREATE TABLE IF NOT EXISTS report_photos (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  report_id  BIGINT      NOT NULL,
  kind       VARCHAR(10) NOT NULL DEFAULT 'report',
  mime       VARCHAR(30) NOT NULL DEFAULT 'image/jpeg',
  size_bytes INT         NOT NULL,
  data       MEDIUMBLOB  NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_photos_report (report_id)
);

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

CREATE TABLE IF NOT EXISTS rate_limits (
  k        CHAR(64)  NOT NULL,
  hits     INT       NOT NULL DEFAULT 0,
  reset_at TIMESTAMP NOT NULL,
  PRIMARY KEY (k)
);

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

CREATE TABLE IF NOT EXISTS report_votes (
  report_id  BIGINT      NOT NULL,
  voter_key  VARCHAR(64) NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id, voter_key)
);

CREATE TABLE IF NOT EXISTS report_ratings (
  report_id  BIGINT       NOT NULL,
  stars      TINYINT      NOT NULL,
  comment    VARCHAR(500) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id)
);

INSERT IGNORE INTO categories (name, description, sla_hours) VALUES
  ('Jalan & Infrastruktur', 'Jalan berlubang, trotoar rusak, jembatan, drainase', 168),
  ('Kebersihan & Sampah',   'Tumpukan sampah, TPS penuh, saluran tersumbat', 72),
  ('Penerangan Jalan',      'Lampu jalan mati atau rusak', 72),
  ('Keamanan & Ketertiban', 'Gangguan keamanan lingkungan', 24),
  ('Pelayanan Administrasi','Keluhan layanan KTP, KK, surat pengantar', 72),
  ('Lainnya',               'Pengaduan di luar kategori di atas', 168);
