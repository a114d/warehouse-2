import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createTables = async () => {
  try {
    logger.info('🔄 Starting database migration...');

    // Create shops table FIRST (referenced by users table)
    await query(`
      CREATE TABLE IF NOT EXISTS shops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        location VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create users table (references shops)
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'stock-worker', 'store-worker', 'screen')),
        shop_id UUID REFERENCES shops(id),
        shop_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create products table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('ice-cream', 'drinks', 'kitchen', 'non-kitchen')),
        category VARCHAR(50),
        production_date DATE NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create inventory table
    await query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('ice-cream', 'drinks', 'kitchen', 'non-kitchen')),
        flavor VARCHAR(50),
        quantity INTEGER NOT NULL DEFAULT 0,
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create QR codes table (references products)
    await query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_code VARCHAR(20) NOT NULL UNIQUE,
        qr_data TEXT NOT NULL,
        qr_image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_code) REFERENCES products(code) ON DELETE CASCADE
      );
    `);

    // Create stock_requests table (references shops)
    await query(`
      CREATE TABLE IF NOT EXISTS stock_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id),
        shop_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
        request_date DATE NOT NULL DEFAULT CURRENT_DATE,
        requested_by_id UUID NOT NULL,
        requested_by_name VARCHAR(100) NOT NULL,
        processed_by_id UUID,
        processed_by_name VARCHAR(100),
        processed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create stock_request_items table (references stock_requests)
    await query(`
      CREATE TABLE IF NOT EXISTS stock_request_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stock_request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(100) NOT NULL,
        product_code VARCHAR(20) NOT NULL,
        quantity INTEGER NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('ice-cream', 'drinks', 'kitchen', 'non-kitchen')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create shipment_requests table
    await query(`
      CREATE TABLE IF NOT EXISTS shipment_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ice-cream', 'drinks', 'kitchen', 'non-kitchen')),
        flavor VARCHAR(50),
        quantity INTEGER NOT NULL,
        destination VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled', 'shipped')),
        request_date DATE NOT NULL DEFAULT CURRENT_DATE,
        requested_by_id UUID NOT NULL,
        requested_by_name VARCHAR(100) NOT NULL,
        processed_by_id UUID,
        processed_by_name VARCHAR(100),
        processed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create shipments table
    await query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ice-cream', 'drinks', 'kitchen', 'non-kitchen')),
        flavor VARCHAR(50),
        quantity INTEGER NOT NULL,
        destination VARCHAR(100) NOT NULL,
        shipment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        admin_id UUID NOT NULL,
        admin_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create suppliers table
    await query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create supplier_deliveries table (references suppliers)
    await query(`
      CREATE TABLE IF NOT EXISTS supplier_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id UUID NOT NULL REFERENCES suppliers(id),
        supplier_name VARCHAR(100) NOT NULL,
        delivery_date DATE NOT NULL,
        received_by_id UUID NOT NULL,
        received_by_name VARCHAR(100) NOT NULL,
        total_amount DECIMAL(10,2),
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create supplier_delivery_items table (references supplier_deliveries)
    await query(`
      CREATE TABLE IF NOT EXISTS supplier_delivery_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_id UUID NOT NULL REFERENCES supplier_deliveries(id) ON DELETE CASCADE,
        code VARCHAR(20) NOT NULL,
        category VARCHAR(20) NOT NULL CHECK (category IN ('ice-cream', 'drinks', 'kitchen', 'non-kitchen')),
        quantity INTEGER NOT NULL,
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create daily_operations table
    await query(`
      CREATE TABLE IF NOT EXISTS daily_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id VARCHAR(50) NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ice-cream', 'drinks', 'kitchen', 'non-kitchen')),
        quantity INTEGER NOT NULL,
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out')),
        operation_date DATE NOT NULL DEFAULT CURRENT_DATE,
        admin_id UUID NOT NULL,
        admin_name VARCHAR(100) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create scan_logs table for tracking QR/barcode scans
    await query(`
      CREATE TABLE IF NOT EXISTS scan_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id VARCHAR(50) NOT NULL,
        item_code VARCHAR(20) NOT NULL,
        scan_type VARCHAR(20) NOT NULL,
        user_id UUID NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(code);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory(type);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_qr_codes_product_code ON qr_codes(product_code);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_data ON qr_codes(qr_data);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON stock_requests(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_stock_requests_date ON stock_requests(request_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_shipment_requests_status ON shipment_requests(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(shipment_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_daily_operations_date ON daily_operations(operation_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_daily_operations_type ON daily_operations(item_type);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_scan_logs_item_code ON scan_logs(item_code);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON scan_logs(created_at);`);

    logger.info('✅ Database migration completed successfully');
    
    // Run product seeding after migration
    try {
      const { seedProducts } = await import('./seed-products.js');
      await seedProducts();
      
      // Also seed QR codes
      try {
        const { seedQRCodes } = await import('./seed-qrcodes.js');
        await seedQRCodes();
      } catch (error) {
        logger.warn('⚠️ QR code seeding failed, but migration completed:', error.message);
      }
      
      // Create default admin user
      try {
        const { createDefaultAdmin } = await import('./create-default-admin.js');
        await createDefaultAdmin();
      } catch (error) {
        logger.warn('⚠️ Default admin creation failed, but migration completed:', error.message);
      }
    } catch (error) {
      logger.warn('⚠️ Product seeding failed, but migration completed:', error.message);
    }
  } catch (error) {
    logger.error('❌ Database migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables()
    .then(() => {
      logger.info('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { createTables };