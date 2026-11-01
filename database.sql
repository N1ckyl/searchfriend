CREATE DATABASE IF NOT EXISTS searchfriend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE searchfriend;

CREATE TABLE IF NOT EXISTS estudiantes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono_whatsapp VARCHAR(20) DEFAULT NULL,
  activo TINYINT(1) DEFAULT 1,
  desbloqueado_admin TINYINT(1) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS entregas_regalos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id INT NOT NULL,
  codigo_secreto VARCHAR(10) NOT NULL UNIQUE,
  mensaje_anonimo TEXT DEFAULT NULL,
  fecha_entrega DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE
);

-- EXAMPLE SEED DATA — replace with your actual class list.
-- Add phone numbers via the Admin Panel (/admin) after setup,
-- so real numbers are never stored in version control.
INSERT INTO estudiantes (nombre, telefono_whatsapp) VALUES
('Student 1', NULL),
('Student 2', NULL),
('Student 3', NULL),
('Student 4', NULL),
('Student 5', NULL);
