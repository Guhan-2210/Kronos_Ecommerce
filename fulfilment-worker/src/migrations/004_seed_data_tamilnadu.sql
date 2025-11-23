-- Seed Data for Tamil Nadu, India
-- Warehouses, Inventory, Delivery Zones, and Delivery Modes

-- =====================================================
-- WAREHOUSES IN TAMIL NADU
-- =====================================================

-- Chennai Warehouse (Capital city - Major hub)
INSERT INTO warehouses (id, name, address_data, latitude, longitude, is_active, created_at)
VALUES (
  'wh-chennai-001',
  'Chennai Distribution Center',
  '{"street":"123 Anna Salai","city":"Chennai","state":"Tamil Nadu","zipcode":"600002","country":"India"}',
  13.0827,
  80.2707,
  1,
  unixepoch()
);

-- Coimbatore Warehouse (Second largest city)
INSERT INTO warehouses (id, name, address_data, latitude, longitude, is_active, created_at)
VALUES (
  'wh-coimbatore-001',
  'Coimbatore Fulfillment Hub',
  '{"street":"456 Avinashi Road","city":"Coimbatore","state":"Tamil Nadu","zipcode":"641001","country":"India"}',
  11.0168,
  76.9558,
  1,
  unixepoch()
);

-- Madurai Warehouse (Central Tamil Nadu)
INSERT INTO warehouses (id, name, address_data, latitude, longitude, is_active, created_at)
VALUES (
  'wh-madurai-001',
  'Madurai Regional Warehouse',
  '{"street":"789 Melur Road","city":"Madurai","state":"Tamil Nadu","zipcode":"625001","country":"India"}',
  9.9252,
  78.1198,
  1,
  unixepoch()
);

-- Trichy Warehouse (Central location)
INSERT INTO warehouses (id, name, address_data, latitude, longitude, is_active, created_at)
VALUES (
  'wh-trichy-001',
  'Tiruchirappalli Distribution Point',
  '{"street":"321 Big Bazaar Street","city":"Tiruchirappalli","state":"Tamil Nadu","zipcode":"620001","country":"India"}',
  10.7905,
  78.7047,
  1,
  unixepoch()
);

-- Salem Warehouse
INSERT INTO warehouses (id, name, address_data, latitude, longitude, is_active, created_at)
VALUES (
  'wh-salem-001',
  'Salem Logistics Center',
  '{"street":"567 Cherry Road","city":"Salem","state":"Tamil Nadu","zipcode":"636001","country":"India"}',
  11.6643,
  78.1460,
  1,
  unixepoch()
);

-- =====================================================
-- SAMPLE INVENTORY (Watches) - Using Actual Product IDs
-- =====================================================

-- Chennai Warehouse Inventory (Largest warehouse - all 20 products)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-chennai-001', 'mi19e2kg-l8f5f010ac', 'wh-chennai-001', 50, 0, unixepoch(), unixepoch()),
  ('inv-chennai-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-chennai-001', 45, 0, unixepoch(), unixepoch()),
  ('inv-chennai-003', 'mi1ao87k-vk53wzk7sjs', 'wh-chennai-001', 40, 0, unixepoch(), unixepoch()),
  ('inv-chennai-004', 'mi1apb45-92zyuusmuw', 'wh-chennai-001', 35, 0, unixepoch(), unixepoch()),
  ('inv-chennai-005', 'mi1aqnt2-w61umaxx2ub', 'wh-chennai-001', 30, 0, unixepoch(), unixepoch()),
  ('inv-chennai-006', 'mi1arz5p-3ejcbua7a3q', 'wh-chennai-001', 25, 0, unixepoch(), unixepoch()),
  ('inv-chennai-007', 'mi1erryc-7bf7cjb9w8p', 'wh-chennai-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-chennai-008', 'mi1esygb-wxe9j9vdq3q', 'wh-chennai-001', 18, 0, unixepoch(), unixepoch()),
  ('inv-chennai-009', 'mi1eurow-luw8dwn4k1', 'wh-chennai-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-chennai-010', 'mi1exf6r-9bz61sbezep', 'wh-chennai-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-chennai-011', 'mi1f14h4-szj2zb0u0t', 'wh-chennai-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-chennai-012', 'mi1f4bsx-ofe5w8t5du', 'wh-chennai-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-chennai-013', 'mi1f5xo7-fcb7eg3peb', 'wh-chennai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-chennai-014', 'mi1f7y0b-8q7bqvdqzm', 'wh-chennai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-chennai-015', 'mi1fa3t9-il2d0cdcj2', 'wh-chennai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-chennai-016', 'mi1fbx4v-1q8ca234y3e', 'wh-chennai-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-chennai-017', 'mi1fdfef-9z6e3cq1kz', 'wh-chennai-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-chennai-018', 'mi1ffk2b-bg3sz3k88z', 'wh-chennai-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-chennai-019', 'mi1fhxi6-utk02h5flq', 'wh-chennai-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-chennai-020', 'mi1fk8uw-9w0s1wh34q', 'wh-chennai-001', 5, 0, unixepoch(), unixepoch());

-- Coimbatore Warehouse Inventory (15 products - popular models)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-coimbatore-001', 'mi19e2kg-l8f5f010ac', 'wh-coimbatore-001', 40, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-coimbatore-001', 35, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-003', 'mi1ao87k-vk53wzk7sjs', 'wh-coimbatore-001', 30, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-004', 'mi1apb45-92zyuusmuw', 'wh-coimbatore-001', 25, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-005', 'mi1aqnt2-w61umaxx2ub', 'wh-coimbatore-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-006', 'mi1arz5p-3ejcbua7a3q', 'wh-coimbatore-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-007', 'mi1erryc-7bf7cjb9w8p', 'wh-coimbatore-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-008', 'mi1esygb-wxe9j9vdq3q', 'wh-coimbatore-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-009', 'mi1eurow-luw8dwn4k1', 'wh-coimbatore-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-010', 'mi1exf6r-9bz61sbezep', 'wh-coimbatore-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-011', 'mi1f14h4-szj2zb0u0t', 'wh-coimbatore-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-012', 'mi1f4bsx-ofe5w8t5du', 'wh-coimbatore-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-013', 'mi1f5xo7-fcb7eg3peb', 'wh-coimbatore-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-014', 'mi1f7y0b-8q7bqvdqzm', 'wh-coimbatore-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-015', 'mi1fa3t9-il2d0cdcj2', 'wh-coimbatore-001', 5, 0, unixepoch(), unixepoch());

-- Madurai Warehouse Inventory (12 products)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-madurai-001', 'mi19e2kg-l8f5f010ac', 'wh-madurai-001', 30, 0, unixepoch(), unixepoch()),
  ('inv-madurai-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-madurai-001', 25, 0, unixepoch(), unixepoch()),
  ('inv-madurai-003', 'mi1ao87k-vk53wzk7sjs', 'wh-madurai-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-madurai-004', 'mi1apb45-92zyuusmuw', 'wh-madurai-001', 18, 0, unixepoch(), unixepoch()),
  ('inv-madurai-005', 'mi1aqnt2-w61umaxx2ub', 'wh-madurai-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-madurai-006', 'mi1arz5p-3ejcbua7a3q', 'wh-madurai-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-madurai-007', 'mi1erryc-7bf7cjb9w8p', 'wh-madurai-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-madurai-008', 'mi1esygb-wxe9j9vdq3q', 'wh-madurai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-madurai-009', 'mi1eurow-luw8dwn4k1', 'wh-madurai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-madurai-010', 'mi1exf6r-9bz61sbezep', 'wh-madurai-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-madurai-011', 'mi1f14h4-szj2zb0u0t', 'wh-madurai-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-madurai-012', 'mi1f4bsx-ofe5w8t5du', 'wh-madurai-001', 5, 0, unixepoch(), unixepoch());

-- Trichy Warehouse Inventory (10 products - best sellers)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-trichy-001', 'mi19e2kg-l8f5f010ac', 'wh-trichy-001', 25, 0, unixepoch(), unixepoch()),
  ('inv-trichy-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-trichy-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-trichy-003', 'mi1ao87k-vk53wzk7sjs', 'wh-trichy-001', 18, 0, unixepoch(), unixepoch()),
  ('inv-trichy-004', 'mi1apb45-92zyuusmuw', 'wh-trichy-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-trichy-005', 'mi1aqnt2-w61umaxx2ub', 'wh-trichy-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-trichy-006', 'mi1arz5p-3ejcbua7a3q', 'wh-trichy-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-trichy-007', 'mi1erryc-7bf7cjb9w8p', 'wh-trichy-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-trichy-008', 'mi1esygb-wxe9j9vdq3q', 'wh-trichy-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-trichy-009', 'mi1eurow-luw8dwn4k1', 'wh-trichy-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-trichy-010', 'mi1exf6r-9bz61sbezep', 'wh-trichy-001', 5, 0, unixepoch(), unixepoch());

-- Salem Warehouse Inventory (8 products - top sellers)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-salem-001', 'mi19e2kg-l8f5f010ac', 'wh-salem-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-salem-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-salem-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-salem-003', 'mi1ao87k-vk53wzk7sjs', 'wh-salem-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-salem-004', 'mi1apb45-92zyuusmuw', 'wh-salem-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-salem-005', 'mi1aqnt2-w61umaxx2ub', 'wh-salem-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-salem-006', 'mi1arz5p-3ejcbua7a3q', 'wh-salem-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-salem-007', 'mi1erryc-7bf7cjb9w8p', 'wh-salem-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-salem-008', 'mi1esygb-wxe9j9vdq3q', 'wh-salem-001', 5, 0, unixepoch(), unixepoch());

-- =====================================================
-- DELIVERY ZONES - TAMIL NADU PIN CODES
-- =====================================================

-- Chennai Metro Zone (600001-600127)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-chennai-metro',
  'Chennai Metropolitan Area',
  '600%',
  'wh-chennai-001',
  'local',
  unixepoch()
);

-- Coimbatore Zone (641001-641110)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-coimbatore',
  'Coimbatore Region',
  '641%',
  'wh-coimbatore-001',
  'local',
  unixepoch()
);

-- Madurai Zone (625001-625706)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-madurai',
  'Madurai Region',
  '625%',
  'wh-madurai-001',
  'regional',
  unixepoch()
);

-- Trichy Zone (620001-621804)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-trichy',
  'Tiruchirappalli Region',
  '620%',
  'wh-trichy-001',
  'regional',
  unixepoch()
);

-- Salem Zone (636001-637505)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-salem',
  'Salem Region',
  '636%',
  'wh-salem-001',
  'regional',
  unixepoch()
);

-- Tirunelveli Zone (627001-628952)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-tirunelveli',
  'Tirunelveli Region',
  '627%',
  'wh-chennai-001',
  'remote',
  unixepoch()
);

-- Vellore Zone (632001-635853)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-vellore',
  'Vellore Region',
  '632%',
  'wh-chennai-001',
  'regional',
  unixepoch()
);

-- Thanjavur Zone (613001-614804)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-thanjavur',
  'Thanjavur Region',
  '613%',
  'wh-trichy-001',
  'regional',
  unixepoch()
);

-- Erode Zone (638001-638811)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-erode',
  'Erode Region',
  '638%',
  'wh-coimbatore-001',
  'regional',
  unixepoch()
);

-- Tiruppur Zone (641601-641688)
INSERT INTO delivery_zones (id, zone_name, zipcode_pattern, primary_warehouse_id, zone_type, created_at)
VALUES (
  'zone-tiruppur',
  'Tiruppur Region',
  '6416%',
  'wh-coimbatore-001',
  'local',
  unixepoch()
);

-- =====================================================
-- DELIVERY MODES FOR EACH ZONE
-- =====================================================

-- Chennai Metro - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-chennai-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-chennai-metro',
    1,
    unixepoch()
  ),
  (
    'mode-chennai-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-chennai-metro',
    1,
    unixepoch()
  );

-- Coimbatore - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-coimbatore-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-coimbatore',
    1,
    unixepoch()
  ),
  (
    'mode-coimbatore-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-coimbatore',
    1,
    unixepoch()
  );

-- Madurai - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-madurai-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-madurai',
    1,
    unixepoch()
  ),
  (
    'mode-madurai-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-madurai',
    1,
    unixepoch()
  );

-- Trichy - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-trichy-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-trichy',
    1,
    unixepoch()
  ),
  (
    'mode-trichy-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-trichy',
    1,
    unixepoch()
  );

-- Salem - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-salem-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-salem',
    1,
    unixepoch()
  ),
  (
    'mode-salem-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-salem',
    1,
    unixepoch()
  );

-- Tirunelveli - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-tirunelveli-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-tirunelveli',
    1,
    unixepoch()
  ),
  (
    'mode-tirunelveli-exp',
    'express',
    '{"min_days":3,"max_days":4,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-tirunelveli',
    1,
    unixepoch()
  );

-- Vellore - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-vellore-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-vellore',
    1,
    unixepoch()
  ),
  (
    'mode-vellore-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-vellore',
    1,
    unixepoch()
  );

-- Thanjavur - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-thanjavur-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-thanjavur',
    1,
    unixepoch()
  ),
  (
    'mode-thanjavur-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-thanjavur',
    1,
    unixepoch()
  );

-- Erode - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-erode-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-erode',
    1,
    unixepoch()
  ),
  (
    'mode-erode-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-erode',
    1,
    unixepoch()
  );

-- Tiruppur - Standard & Express
INSERT INTO delivery_modes (id, mode_name, conditions, zone_id, is_active, created_at)
VALUES 
  (
    'mode-tiruppur-std',
    'standard',
    '{"min_days":5,"max_days":7,"base_cost":0,"cutoff_time":"17:00"}',
    'zone-tiruppur',
    1,
    unixepoch()
  ),
  (
    'mode-tiruppur-exp',
    'express',
    '{"min_days":2,"max_days":3,"base_cost":500,"cutoff_time":"12:00"}',
    'zone-tiruppur',
    1,
    unixepoch()
  );

