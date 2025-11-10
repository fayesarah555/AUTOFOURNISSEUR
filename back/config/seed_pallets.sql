-- Seed pallet formats and options generated from Excel equivalences
START TRANSACTION;
INSERT INTO pallet_formats (code, label, length_mm, width_mm, base_linear_meter)
VALUES ('100x100', '100x100', 100, 100, NULL)
ON DUPLICATE KEY UPDATE label=VALUES(label), length_mm=VALUES(length_mm), width_mm=VALUES(width_mm);
INSERT INTO pallet_formats (code, label, length_mm, width_mm, base_linear_meter)
VALUES ('100x120', '100x120', 100, 120, NULL)
ON DUPLICATE KEY UPDATE label=VALUES(label), length_mm=VALUES(length_mm), width_mm=VALUES(width_mm);
INSERT INTO pallet_formats (code, label, length_mm, width_mm, base_linear_meter)
VALUES ('100x160', '100x160', 100, 160, NULL)
ON DUPLICATE KEY UPDATE label=VALUES(label), length_mm=VALUES(length_mm), width_mm=VALUES(width_mm);
INSERT INTO pallet_formats (code, label, length_mm, width_mm, base_linear_meter)
VALUES ('120x120', '120x120', 120, 120, NULL)
ON DUPLICATE KEY UPDATE label=VALUES(label), length_mm=VALUES(length_mm), width_mm=VALUES(width_mm);
INSERT INTO pallet_formats (code, label, length_mm, width_mm, base_linear_meter)
VALUES ('60x80', '60x80', 60, 80, NULL)
ON DUPLICATE KEY UPDATE label=VALUES(label), length_mm=VALUES(length_mm), width_mm=VALUES(width_mm);
INSERT INTO pallet_formats (code, label, length_mm, width_mm, base_linear_meter)
VALUES ('80x120', '80x120', 80, 120, NULL)
ON DUPLICATE KEY UPDATE label=VALUES(label), length_mm=VALUES(length_mm), width_mm=VALUES(width_mm);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 1, 0.333, 0.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 2, 0.667, 1.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 3, 1.000, 1.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 4, 1.333, 2.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 5, 1.667, 2.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 6, 2.000, 3.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 7, 2.333, 3.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 8, 2.667, 4.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 9, 3.000, 4.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 10, 3.333, 5.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 11, 3.667, 5.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 12, 4.000, 6.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 13, 4.333, 6.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 14, 4.667, 7.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 15, 5.000, 7.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 16, 5.333, 8.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 17, 5.667, 8.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 18, 6.000, 9.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 19, 6.333, 9.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 20, 6.667, 10.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 21, 7.000, 10.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 22, 7.333, 11.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 23, 7.667, 11.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 24, 8.000, 12.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 25, 8.333, 12.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 26, 8.667, 13.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 27, 9.000, 13.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 28, 9.333, 14.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 29, 9.667, 14.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 30, 10.000, 15.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 31, 10.333, 15.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 32, 10.667, 16.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 11.000, 16.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 11.333, 17.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 11.667, 17.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 12.000, 18.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 12.333, 18.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 12.667, 19.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 13.000, 19.50 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 13.333, 20.00 FROM pallet_formats WHERE code='100x100'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 1, 0.500, 0.70 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 2, 1.000, 1.40 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 3, 1.500, 2.10 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 4, 2.000, 2.80 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 5, 2.500, 3.50 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 6, 3.000, 4.20 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 7, 3.500, 4.90 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 8, 4.000, 5.60 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 9, 4.500, 6.30 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 10, 5.000, 7.00 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 11, 5.500, 7.70 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 12, 6.000, 8.40 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 13, 6.500, 9.10 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 14, 7.000, 9.80 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 15, 7.500, 10.50 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 16, 8.000, 11.20 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 17, 8.500, 11.90 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 18, 9.000, 12.60 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 19, 9.500, 13.30 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 20, 10.000, 14.00 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 21, 10.500, 14.70 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 22, 11.000, 15.40 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 23, 11.500, 16.10 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 24, 12.000, 16.80 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 25, 12.500, 17.50 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 26, 13.000, 18.20 FROM pallet_formats WHERE code='100x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 1, 0.800, 0.90 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 2, 1.600, 1.80 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 3, 2.400, 2.70 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 4, 3.200, 3.60 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 5, 4.000, 4.50 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 6, 4.800, 5.40 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 7, 5.600, 6.30 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 8, 6.400, 7.20 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 9, 7.200, 8.10 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 10, 8.000, 9.00 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 11, 8.800, 9.90 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 12, 9.600, 10.80 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 13, 10.400, 11.70 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 14, 11.200, 12.60 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 15, 12.000, 13.50 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 16, 12.800, 14.40 FROM pallet_formats WHERE code='100x160'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 1, 0.600, 0.80 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 2, 1.200, 1.60 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 3, 1.800, 2.40 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 4, 2.400, 3.20 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 5, 3.000, 4.00 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 6, 3.600, 4.80 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 7, 4.200, 5.60 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 8, 4.800, 6.40 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 9, 5.400, 7.20 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 10, 6.000, 8.00 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 11, 6.600, 8.80 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 12, 7.200, 9.60 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 13, 7.800, 10.40 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 14, 8.400, 11.20 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 15, 9.000, 12.00 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 16, 9.600, 12.80 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 17, 10.200, 13.60 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 18, 10.800, 14.40 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 19, 11.400, 15.20 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 20, 12.000, 16.00 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 21, 12.600, 16.80 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 22, 13.200, 17.60 FROM pallet_formats WHERE code='120x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 1, 0.200, 0.30 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 2, 0.400, 0.60 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 3, 0.600, 0.90 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 4, 0.800, 1.20 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 5, 1.000, 1.50 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 6, 1.200, 1.80 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 7, 1.400, 2.10 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 8, 1.600, 2.40 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 9, 1.800, 2.70 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 10, 2.000, 3.00 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 11, 2.200, 3.30 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 12, 2.400, 3.60 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 13, 2.600, 3.90 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 14, 2.800, 4.20 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 15, 3.000, 4.50 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 16, 3.200, 4.80 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 17, 3.400, 5.10 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 18, 3.600, 5.40 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 19, 3.800, 5.70 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 20, 4.000, 6.00 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 21, 4.200, 6.30 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 22, 4.400, 6.60 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 23, 4.600, 6.90 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 24, 4.800, 7.20 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 25, 5.000, 7.50 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 26, 5.200, 7.80 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 27, 5.400, 8.10 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 28, 5.600, 8.40 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 29, 5.800, 8.70 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 30, 6.000, 9.00 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 31, 6.200, 9.30 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 32, 6.400, 9.60 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 6.600, 9.90 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 6.800, 10.20 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 7.000, 10.50 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 7.200, 10.80 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 7.400, 11.10 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 7.600, 11.40 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 7.800, 11.70 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 8.000, 12.00 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 8.200, 12.30 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 8.400, 12.60 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 8.600, 12.90 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 8.800, 13.20 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 9.000, 13.50 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 9.200, 13.80 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 9.400, 14.10 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 9.600, 14.40 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 9.800, 14.70 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 10.000, 15.00 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 10.200, 15.30 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 10.400, 15.60 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 10.600, 15.90 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 10.800, 16.20 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 11.000, 16.50 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 11.200, 16.80 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 11.400, 17.10 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 11.600, 17.40 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 11.800, 17.70 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 12.000, 18.00 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 12.200, 18.30 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 12.400, 18.60 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 12.600, 18.90 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 12.800, 19.20 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 13.000, 19.50 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 13.200, 19.80 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 13.400, 20.10 FROM pallet_formats WHERE code='60x80'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 1, 0.400, 0.60 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 2, 0.800, 1.20 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 3, 1.200, 1.80 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 4, 1.600, 2.40 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 5, 2.000, 3.00 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 6, 2.400, 3.60 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 7, 2.800, 4.20 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 8, 3.200, 4.80 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 9, 3.600, 5.40 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 10, 4.000, 6.00 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 11, 4.400, 6.60 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 12, 4.800, 7.20 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 13, 5.200, 7.80 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 14, 5.600, 8.40 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 15, 6.000, 9.00 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 16, 6.400, 9.60 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 17, 6.800, 10.20 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 18, 7.200, 10.80 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 19, 7.600, 11.40 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 20, 8.000, 12.00 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 21, 8.400, 12.60 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 22, 8.800, 13.20 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 23, 9.200, 13.80 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 24, 9.600, 14.40 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 25, 10.000, 15.00 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 26, 10.400, 15.60 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 27, 10.800, 16.20 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 28, 11.200, 16.80 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 29, 11.600, 17.40 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 30, 12.000, 18.00 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 31, 12.400, 18.60 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 32, 12.800, 19.20 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
INSERT INTO pallet_format_options (pallet_format_id, pallet_count, linear_meters, max_weight_kg)
SELECT id, 33, 13.200, 20.00 FROM pallet_formats WHERE code='80x120'
ON DUPLICATE KEY UPDATE linear_meters=VALUES(linear_meters), max_weight_kg=VALUES(max_weight_kg);
COMMIT;