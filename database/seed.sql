-- CivicConnect Seed Data (Development)
-- Run after schema.sql

-- Sample budget items (Bengaluru BBMP, FY 2024-25)
INSERT INTO budget_items (fiscal_year, department, category, allocated_amount, spent_amount, description) VALUES
(2024, 'Roads & Infrastructure', 'Road Repair',         850000000, 623000000, 'Pothole filling, road resurfacing across all wards'),
(2024, 'Roads & Infrastructure', 'New Construction',    500000000, 201000000, 'New road connectivity projects'),
(2024, 'Water Supply',           'Pipeline Maintenance', 320000000, 289000000, 'Water pipeline repair and replacement'),
(2024, 'Water Supply',           'New Connections',      180000000, 145000000, 'New water connections for underserved areas'),
(2024, 'Solid Waste Management', 'Collection & Disposal',240000000, 219000000, 'Daily garbage collection and disposal operations'),
(2024, 'Solid Waste Management', 'Recycling Plants',    120000000,  67000000,  'Composting and recycling facility upgrades'),
(2024, 'Street Lighting',        'LED Replacement',      95000000,  88000000,  'Replacing sodium lamps with LED across wards'),
(2024, 'Street Lighting',        'New Installations',    55000000,  32000000,  'New streetlights in dark zones'),
(2024, 'Parks & Recreation',     'Park Development',    110000000,  76000000,  'New parks and playground equipment'),
(2024, 'Parks & Recreation',     'Maintenance',          60000000,  54000000,  'Park maintenance and beautification'),
(2024, 'Health & Sanitation',    'Public Toilets',       75000000,  68000000,  'Construction and maintenance of public toilets'),
(2024, 'Health & Sanitation',    'Health Centres',      140000000, 112000000,  'Primary health centre upgrades');

-- Sample alerts
INSERT INTO alerts (alert_type, title_en, title_kn, body_en, body_kn, severity, ward_numbers, expires_at) VALUES
('road_closure', 
 'Road Closure: MG Road', 
 'ರಸ್ತೆ ಮುಚ್ಚಿದೆ: ಎಂ.ಜಿ. ರಸ್ತೆ',
 'MG Road between Trinity Circle and Halasuru Gate is closed for metro rail work from April 18–25.',
 'ಏಪ್ರಿಲ್ 18–25ರ ತನಕ ಮೆಟ್ರೋ ಕೆಲಸಕ್ಕಾಗಿ ಟ್ರಿನಿಟಿ ಸರ್ಕಲ್ ಮತ್ತು ಹಲಸೂರು ಗೇಟ್ ನಡುವಿನ ಎಂ.ಜಿ. ರಸ್ತೆ ಮುಚ್ಚಲಾಗಿದೆ.',
 'warning', ARRAY[42, 43, 44], NOW() + INTERVAL '8 days'),
('weather',
 'Heavy Rain Advisory',
 'ಭಾರಿ ಮಳೆ ಎಚ್ಚರಿಕೆ',
 'IMD has issued a yellow alert for heavy rainfall in Bengaluru. Citizens are advised to avoid low-lying areas.',
 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭಾರಿ ಮಳೆಗಾಗಿ IMD ಹಳದಿ ಎಚ್ಚರಿಕೆ ನೀಡಿದೆ. ನಾಗರಿಕರು ತಗ್ಗು ಪ್ರದೇಶಗಳನ್ನು ತಪ್ಪಿಸಬೇಕು.',
 'warning', NULL, NOW() + INTERVAL '2 days');

-- Sample reports (Bengaluru locations)
INSERT INTO reports (category, title, description, location, address_text, status, priority, ward_number) VALUES
('pothole', 'Large pothole on Indiranagar 100ft Road',
 'Deep pothole causing accidents, especially for two-wheelers. Located near the signal.',
 ST_GeogFromText('SRID=4326;POINT(77.6408 12.9784)'),
 '100 Feet Road, Indiranagar, Bengaluru', 'IN_PROGRESS', 'HIGH', 73),
('streetlight', 'Streetlight not working near HSR Layout park',
 'Three consecutive streetlights are off since last week making the area unsafe at night.',
 ST_GeogFromText('SRID=4326;POINT(77.6472 12.9122)'),
 'Sector 7, HSR Layout, Bengaluru', 'SUBMITTED', 'MEDIUM', 151),
('garbage', 'Garbage overflowing near Koramangala market',
 'The garbage bin has not been collected for 4 days and is overflowing onto the road.',
 ST_GeogFromText('SRID=4326;POINT(77.6270 12.9352)'),
 '8th Block, Koramangala, Bengaluru', 'RESOLVED', 'MEDIUM', 68);

-- Status history for sample reports
INSERT INTO report_status_history (report_id, old_status, new_status, remark, changed_by_role)
SELECT id, NULL, status, 'Initial complaint submission', 'citizen' FROM reports;
