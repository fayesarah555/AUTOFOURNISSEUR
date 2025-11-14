-- ===================================================================
-- AUTOFOURNISSEUR logistics schema (MariaDB 10.5+)
-- ===================================================================

CREATE DATABASE IF NOT EXISTS `autofournisseur`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `autofournisseur`;

-- -------------------------------------------------------------------
-- 1. Référentiels
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS equipment_types (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(64)  NOT NULL UNIQUE,
  label           VARCHAR(128) NOT NULL,
  category        ENUM('semi','porteur','manutention','light_vehicle','service','other')
                  NOT NULL DEFAULT 'other',
  active          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_types (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(64)  NOT NULL UNIQUE,
  label           VARCHAR(128) NOT NULL,
  description     TEXT,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departments (
  code            VARCHAR(8)   NOT NULL PRIMARY KEY,
  country_code    CHAR(2)      NOT NULL,
  name            VARCHAR(128) NOT NULL,
  region          VARCHAR(128),
  zone_cluster    VARCHAR(64),
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tariff_zones (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  label           VARCHAR(128) NOT NULL UNIQUE,
  description     TEXT,
  zone_type       ENUM('department_group','country','international','custom')
                  NOT NULL DEFAULT 'custom',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS zone_departments (
  zone_id         BIGINT UNSIGNED NOT NULL,
  department_code VARCHAR(8)      NOT NULL,
  PRIMARY KEY (zone_id, department_code),
  CONSTRAINT fk_zone_departments_zone
    FOREIGN KEY (zone_id) REFERENCES tariff_zones(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_zone_departments_department
    FOREIGN KEY (department_code) REFERENCES departments(code)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- 2. Fournisseurs
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  external_ref    VARCHAR(64),
  source_sheet    ENUM('TPS_National','TPS_Espagnols','CUSTOM') DEFAULT 'TPS_National',
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  legal_name      VARCHAR(255),
  siret           VARCHAR(14),
  address         TEXT,
  postal_code     VARCHAR(16),
  city            VARCHAR(128),
  department_code VARCHAR(8),
  country_code    CHAR(2)      NOT NULL DEFAULT 'FR',
  website         VARCHAR(255),
  tariff_document_url VARCHAR(255),
  status          ENUM('active','inactive','prospect')
                  NOT NULL DEFAULT 'active',
  coverage        ENUM('domestic','regional','europe','global')
                  NOT NULL DEFAULT 'domestic',
  contract_flexibility ENUM('spot','monthly','quarterly','annual')
                  NOT NULL DEFAULT 'spot',
  lead_time_days  INT UNSIGNED NOT NULL DEFAULT 3,
  on_time_rate    DECIMAL(5,4) NOT NULL DEFAULT 0.9200,
  price_per_km    DECIMAL(10,2) NOT NULL DEFAULT 1.20,
  base_handling_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_shipment_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  co2_grams_per_tonne_km DECIMAL(10,2) NOT NULL DEFAULT 180.00,
  customer_satisfaction DECIMAL(3,2) NOT NULL DEFAULT 4.20,
  modes_json      JSON,
  regions_json    JSON,
  certifications_json JSON,
  unreachable     TINYINT(1)   NOT NULL DEFAULT 0,
  profile_notes   TEXT,
  notes           TEXT,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_suppliers_siret (siret),
  CONSTRAINT fk_suppliers_department
    FOREIGN KEY (department_code) REFERENCES departments(code)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supplier_tariff_documents (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  filename        VARCHAR(255) NOT NULL,
  original_name   VARCHAR(255),
  mime_type       VARCHAR(128),
  format          ENUM('pdf','excel') NOT NULL DEFAULT 'pdf',
  size_bytes      BIGINT UNSIGNED,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tariff_documents_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS supplier_contacts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  contact_role    VARCHAR(32)  NOT NULL DEFAULT 'primary',
  full_name       VARCHAR(255),
  email           VARCHAR(255),
  phone           VARCHAR(64),
  mobile          VARCHAR(64),
  availability    TEXT,
  is_primary      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_supplier_contacts_supplier (supplier_id),
  CONSTRAINT fk_supplier_contacts_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- 3. Capacités matériel & services
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS supplier_equipment (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  equipment_id    BIGINT UNSIGNED NOT NULL,
  capability_status ENUM('yes','no','unknown')
                   NOT NULL DEFAULT 'unknown',
  quantity        INT UNSIGNED,
  comment         TEXT,
  last_verified_at DATETIME,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supplier_equipment (supplier_id, equipment_id),
  KEY idx_supplier_equipment_supplier (supplier_id),
  CONSTRAINT fk_supplier_equipment_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_supplier_equipment_equipment
    FOREIGN KEY (equipment_id) REFERENCES equipment_types(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_capabilities (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  service_id      BIGINT UNSIGNED NOT NULL,
  status          ENUM('yes','no','unknown')
                  NOT NULL DEFAULT 'unknown',
  comment         TEXT,
  last_verified_at DATETIME,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_capabilities (supplier_id, service_id),
  KEY idx_service_capabilities_supplier (supplier_id),
  CONSTRAINT fk_service_capabilities_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_service_capabilities_service
    FOREIGN KEY (service_id) REFERENCES service_types(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- 4. Zones de couverture
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS coverage_zones (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  department_code VARCHAR(8)    NOT NULL,
  coverage_type   ENUM('delivery','loading') NOT NULL,
  frequency       VARCHAR(64),
  comment         TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_coverage_zones (supplier_id, department_code, coverage_type),
  KEY idx_coverage_zones_department (department_code, coverage_type),
  KEY idx_coverage_zones_supplier (supplier_id, coverage_type),
  CONSTRAINT fk_coverage_zones_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_coverage_zones_department
    FOREIGN KEY (department_code) REFERENCES departments(code)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- 5. Tarifs & surcharges
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tariff_catalogs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id     BIGINT UNSIGNED NOT NULL,
  label           VARCHAR(128) NOT NULL,
  currency        CHAR(3)      NOT NULL DEFAULT 'EUR',
  incoterm        VARCHAR(8),
  valid_from      DATE         NOT NULL DEFAULT CURRENT_DATE,
  valid_to        DATE,
  comment         TEXT,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tariff_catalogs_supplier_label (supplier_id, label),
  KEY idx_tariff_catalogs_supplier (supplier_id),
  CONSTRAINT fk_tariff_catalogs_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tariff_lines (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tariff_catalog_id       BIGINT UNSIGNED NOT NULL,
  origin_zone_id          BIGINT UNSIGNED,
  destination_zone_id     BIGINT UNSIGNED,
  origin_department       VARCHAR(8),
  destination_department  VARCHAR(8),
  vehicle_type_id         BIGINT UNSIGNED,
  service_id              BIGINT UNSIGNED,
  min_volume              DECIMAL(10,2),
  max_volume              DECIMAL(10,2),
  base_price              DECIMAL(12,2),
  price_per_km            DECIMAL(10,4),
  min_price               DECIMAL(12,2),
  surcharge_type          VARCHAR(32),
  surcharge_value         DECIMAL(10,4),
  notes                   TEXT,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tariff_lines_catalog (tariff_catalog_id),
  KEY idx_tariff_lines_destination (destination_zone_id, destination_department),
  CONSTRAINT fk_tariff_lines_catalog
    FOREIGN KEY (tariff_catalog_id) REFERENCES tariff_catalogs(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_tariff_lines_origin_zone
    FOREIGN KEY (origin_zone_id) REFERENCES tariff_zones(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_tariff_lines_destination_zone
    FOREIGN KEY (destination_zone_id) REFERENCES tariff_zones(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_tariff_lines_origin_department
    FOREIGN KEY (origin_department) REFERENCES departments(code)
    ON DELETE SET NULL,
  CONSTRAINT fk_tariff_lines_destination_department
    FOREIGN KEY (destination_department) REFERENCES departments(code)
    ON DELETE SET NULL,
  CONSTRAINT fk_tariff_lines_vehicle
    FOREIGN KEY (vehicle_type_id) REFERENCES equipment_types(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_tariff_lines_service
    FOREIGN KEY (service_id) REFERENCES service_types(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tariff_surcharges (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tariff_catalog_id   BIGINT UNSIGNED NOT NULL,
  surcharge_type      VARCHAR(32) NOT NULL,
  rule_expression     TEXT,
  amount              DECIMAL(12,2),
  percentage          DECIMAL(6,3),
  applies_to_service  BIGINT UNSIGNED,
  applies_to_vehicle  BIGINT UNSIGNED,
  notes               TEXT,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tariff_surcharges_catalog (tariff_catalog_id),
  CONSTRAINT fk_tariff_surcharges_catalog
    FOREIGN KEY (tariff_catalog_id) REFERENCES tariff_catalogs(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_tariff_surcharges_service
    FOREIGN KEY (applies_to_service) REFERENCES service_types(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_tariff_surcharges_vehicle
    FOREIGN KEY (applies_to_vehicle) REFERENCES equipment_types(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- Idempotent alterations to keep schema in sync on redeploy
-- -------------------------------------------------------------------

ALTER TABLE suppliers
  MODIFY COLUMN source_sheet ENUM('TPS_National','TPS_Espagnols','CUSTOM') DEFAULT 'TPS_National',
  ADD COLUMN IF NOT EXISTS tariff_document_url VARCHAR(255) AFTER website,
  ADD COLUMN IF NOT EXISTS description TEXT AFTER name,
  ADD COLUMN IF NOT EXISTS coverage ENUM('domestic','regional','europe','global') NOT NULL DEFAULT 'domestic' AFTER status,
  ADD COLUMN IF NOT EXISTS contract_flexibility ENUM('spot','monthly','quarterly','annual') NOT NULL DEFAULT 'spot' AFTER coverage,
  ADD COLUMN IF NOT EXISTS lead_time_days INT UNSIGNED NOT NULL DEFAULT 3 AFTER contract_flexibility,
  ADD COLUMN IF NOT EXISTS on_time_rate DECIMAL(5,4) NOT NULL DEFAULT 0.9200 AFTER lead_time_days,
  ADD COLUMN IF NOT EXISTS price_per_km DECIMAL(10,2) NOT NULL DEFAULT 1.20 AFTER on_time_rate,
  ADD COLUMN IF NOT EXISTS base_handling_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER price_per_km,
  ADD COLUMN IF NOT EXISTS min_shipment_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER base_handling_fee,
  ADD COLUMN IF NOT EXISTS co2_grams_per_tonne_km DECIMAL(10,2) NOT NULL DEFAULT 180.00 AFTER min_shipment_kg,
  ADD COLUMN IF NOT EXISTS customer_satisfaction DECIMAL(3,2) NOT NULL DEFAULT 4.20 AFTER co2_grams_per_tonne_km,
  ADD COLUMN IF NOT EXISTS modes_json JSON AFTER customer_satisfaction,
  ADD COLUMN IF NOT EXISTS regions_json JSON AFTER modes_json,
  ADD COLUMN IF NOT EXISTS certifications_json JSON AFTER regions_json,
  ADD COLUMN IF NOT EXISTS unreachable TINYINT(1) NOT NULL DEFAULT 0 AFTER certifications_json,
  ADD COLUMN IF NOT EXISTS profile_notes TEXT AFTER unreachable,
  ADD COLUMN IF NOT EXISTS notes TEXT AFTER profile_notes;

-- -------------------------------------------------------------------
-- 6. Palettisation & documents tarifaires (nouveaux modules)
-- -------------------------------------------------------------------

-- Formats palette standardisés (ex: 80x120, 100x120)
CREATE TABLE IF NOT EXISTS pallet_formats (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code               VARCHAR(32)  NOT NULL UNIQUE,
  label              VARCHAR(64)  NOT NULL,
  length_mm          INT UNSIGNED,
  width_mm           INT UNSIGNED,
  height_mm          INT UNSIGNED NULL,
  base_linear_meter  DECIMAL(8,3) NULL,
  default_weight_kg  DECIMAL(10,2) NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Options par format: n palettes -> mètres linéaires / tonnage
CREATE TABLE IF NOT EXISTS pallet_format_options (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pallet_format_id   BIGINT UNSIGNED NOT NULL,
  pallet_count       SMALLINT UNSIGNED NOT NULL,
  linear_meters      DECIMAL(8,3) NOT NULL,
  max_weight_kg      DECIMAL(10,2) NULL,
  UNIQUE KEY uq_pallet_format_count (pallet_format_id, pallet_count),
  CONSTRAINT fk_pallet_option_format
    FOREIGN KEY (pallet_format_id) REFERENCES pallet_formats(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Association (optionnelle) des formats gérés par fournisseur
CREATE TABLE IF NOT EXISTS supplier_pallet_formats (
  supplier_id        BIGINT UNSIGNED NOT NULL,
  pallet_format_id   BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (supplier_id, pallet_format_id),
  CONSTRAINT fk_spf_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_spf_format
    FOREIGN KEY (pallet_format_id) REFERENCES pallet_formats(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Historisation des documents tarifaires (PDF/Excel)
CREATE TABLE IF NOT EXISTS tariff_documents (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id        BIGINT UNSIGNED NOT NULL,
  storage_type       ENUM('local','remote') NOT NULL DEFAULT 'local',
  filename           VARCHAR(255),
  url                VARCHAR(512),
  format             ENUM('pdf','excel') NOT NULL DEFAULT 'pdf',
  uploaded_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes              TEXT,
  KEY idx_td_supplier (supplier_id),
  CONSTRAINT fk_td_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Etendre les lignes de tarifs pour coller aux modèles Excel (distance & palettes)
ALTER TABLE tariff_lines
  ADD COLUMN IF NOT EXISTS pallet_format_id     BIGINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS pallet_count         SMALLINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS pallet_linear_meters DECIMAL(8,3) NULL,
  ADD COLUMN IF NOT EXISTS min_distance_km      DECIMAL(10,1) NULL,
  ADD COLUMN IF NOT EXISTS max_distance_km      DECIMAL(10,1) NULL,
  ADD KEY IF NOT EXISTS idx_tariff_lines_lookup (tariff_catalog_id, destination_department, min_distance_km, max_distance_km, pallet_count),
  ADD KEY IF NOT EXISTS idx_tariff_lines_pallet_format (pallet_format_id),
  ADD CONSTRAINT fk_tariff_lines_pallet_format
    FOREIGN KEY (pallet_format_id) REFERENCES pallet_formats(id)
    ON DELETE SET NULL;
