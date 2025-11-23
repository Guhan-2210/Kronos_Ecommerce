-- Update inventory with correct product IDs
-- This replaces the old product IDs with the actual ones from catalog/prices

-- First, delete all existing inventory
DELETE FROM inventory;

-- =====================================================
-- CORRECT INVENTORY - Using Actual Product IDs
-- =====================================================

-- Chennai Warehouse Inventory (All 20 products)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-chennai-001', 'mi19e2kg-l8f5f010ac', 'wh-chennai-001', 50, 0, unixepoch(), unixepoch()),
  ('inv-chennai-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-chennai-001', 45, 0, unixepoch(), unixepoch()),
  ('inv-chennai-003', 'mi1ao87k-vk53wzk7sjs', 'wh-chennai-001', 40, 0, unixepoch(), unixepoch()),
  ('inv-chennai-004', 'mi1apb45-92zyuusmuw', 'wh-chennai-001', 35, 0, unixepoch(), unixepoch()),
  ('inv-chennai-005', 'mi1aqnt2-w61umaxx2ub', 'wh-chennai-001', 30, 0, unixepoch(), unixepoch()),
  ('inv-chennai-006', 'mi1arbib-71fbiljiwge', 'wh-chennai-001', 25, 0, unixepoch(), unixepoch()),
  ('inv-chennai-007', 'mi1arzfo-a8yf8jl3mz7', 'wh-chennai-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-chennai-008', 'mi1aspsj-bghns72fgts', 'wh-chennai-001', 18, 0, unixepoch(), unixepoch()),
  ('inv-chennai-009', 'mi1atje7-ebjfh53qod', 'wh-chennai-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-chennai-010', 'mi1au3pj-ica5an06ok', 'wh-chennai-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-chennai-011', 'mi1auojv-m141t7cimi', 'wh-chennai-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-chennai-012', 'mi1av7ee-lbww6shmc7r', 'wh-chennai-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-chennai-013', 'mi1avq3h-fdr3bdbz57h', 'wh-chennai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-chennai-014', 'mi1aw9vr-tvu3ezcknso', 'wh-chennai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-chennai-015', 'mi1awxc6-a80j4jhobmn', 'wh-chennai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-chennai-016', 'mi1axsfl-xeozp8kntbs', 'wh-chennai-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-chennai-017', 'mi1aype2-uvn67xam3ik', 'wh-chennai-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-chennai-018', 'mi1b0nsy-fsrboplvrjs', 'wh-chennai-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-chennai-019', 'mi1b17pz-fzbt7urii4', 'wh-chennai-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-chennai-020', 'mi1h1byz-zu48gh8ye1', 'wh-chennai-001', 5, 0, unixepoch(), unixepoch());

-- Coimbatore Warehouse Inventory (15 popular products)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-coimbatore-001', 'mi19e2kg-l8f5f010ac', 'wh-coimbatore-001', 40, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-coimbatore-001', 35, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-003', 'mi1ao87k-vk53wzk7sjs', 'wh-coimbatore-001', 30, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-004', 'mi1apb45-92zyuusmuw', 'wh-coimbatore-001', 25, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-005', 'mi1aqnt2-w61umaxx2ub', 'wh-coimbatore-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-006', 'mi1arbib-71fbiljiwge', 'wh-coimbatore-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-007', 'mi1arzfo-a8yf8jl3mz7', 'wh-coimbatore-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-008', 'mi1aspsj-bghns72fgts', 'wh-coimbatore-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-009', 'mi1atje7-ebjfh53qod', 'wh-coimbatore-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-010', 'mi1au3pj-ica5an06ok', 'wh-coimbatore-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-011', 'mi1auojv-m141t7cimi', 'wh-coimbatore-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-012', 'mi1av7ee-lbww6shmc7r', 'wh-coimbatore-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-013', 'mi1avq3h-fdr3bdbz57h', 'wh-coimbatore-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-014', 'mi1aw9vr-tvu3ezcknso', 'wh-coimbatore-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-coimbatore-015', 'mi1awxc6-a80j4jhobmn', 'wh-coimbatore-001', 5, 0, unixepoch(), unixepoch());

-- Madurai Warehouse Inventory (12 products)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-madurai-001', 'mi19e2kg-l8f5f010ac', 'wh-madurai-001', 30, 0, unixepoch(), unixepoch()),
  ('inv-madurai-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-madurai-001', 25, 0, unixepoch(), unixepoch()),
  ('inv-madurai-003', 'mi1ao87k-vk53wzk7sjs', 'wh-madurai-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-madurai-004', 'mi1apb45-92zyuusmuw', 'wh-madurai-001', 18, 0, unixepoch(), unixepoch()),
  ('inv-madurai-005', 'mi1aqnt2-w61umaxx2ub', 'wh-madurai-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-madurai-006', 'mi1arbib-71fbiljiwge', 'wh-madurai-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-madurai-007', 'mi1arzfo-a8yf8jl3mz7', 'wh-madurai-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-madurai-008', 'mi1aspsj-bghns72fgts', 'wh-madurai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-madurai-009', 'mi1atje7-ebjfh53qod', 'wh-madurai-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-madurai-010', 'mi1au3pj-ica5an06ok', 'wh-madurai-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-madurai-011', 'mi1auojv-m141t7cimi', 'wh-madurai-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-madurai-012', 'mi1av7ee-lbww6shmc7r', 'wh-madurai-001', 5, 0, unixepoch(), unixepoch());

-- Trichy Warehouse Inventory (10 best sellers)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-trichy-001', 'mi19e2kg-l8f5f010ac', 'wh-trichy-001', 25, 0, unixepoch(), unixepoch()),
  ('inv-trichy-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-trichy-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-trichy-003', 'mi1ao87k-vk53wzk7sjs', 'wh-trichy-001', 18, 0, unixepoch(), unixepoch()),
  ('inv-trichy-004', 'mi1apb45-92zyuusmuw', 'wh-trichy-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-trichy-005', 'mi1aqnt2-w61umaxx2ub', 'wh-trichy-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-trichy-006', 'mi1arbib-71fbiljiwge', 'wh-trichy-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-trichy-007', 'mi1arzfo-a8yf8jl3mz7', 'wh-trichy-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-trichy-008', 'mi1aspsj-bghns72fgts', 'wh-trichy-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-trichy-009', 'mi1atje7-ebjfh53qod', 'wh-trichy-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-trichy-010', 'mi1au3pj-ica5an06ok', 'wh-trichy-001', 5, 0, unixepoch(), unixepoch());

-- Salem Warehouse Inventory (8 top sellers)
INSERT INTO inventory (id, product_id, warehouse_id, quantity, reserved_quantity, created_at, updated_at)
VALUES 
  ('inv-salem-001', 'mi19e2kg-l8f5f010ac', 'wh-salem-001', 20, 0, unixepoch(), unixepoch()),
  ('inv-salem-002', 'mi1ajuoz-7gle2ehs9ja', 'wh-salem-001', 15, 0, unixepoch(), unixepoch()),
  ('inv-salem-003', 'mi1ao87k-vk53wzk7sjs', 'wh-salem-001', 12, 0, unixepoch(), unixepoch()),
  ('inv-salem-004', 'mi1apb45-92zyuusmuw', 'wh-salem-001', 10, 0, unixepoch(), unixepoch()),
  ('inv-salem-005', 'mi1aqnt2-w61umaxx2ub', 'wh-salem-001', 8, 0, unixepoch(), unixepoch()),
  ('inv-salem-006', 'mi1arbib-71fbiljiwge', 'wh-salem-001', 6, 0, unixepoch(), unixepoch()),
  ('inv-salem-007', 'mi1arzfo-a8yf8jl3mz7', 'wh-salem-001', 5, 0, unixepoch(), unixepoch()),
  ('inv-salem-008', 'mi1aspsj-bghns72fgts', 'wh-salem-001', 5, 0, unixepoch(), unixepoch());

