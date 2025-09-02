import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Seeds the database with QR code information for products
 */
const seedQRCodes = async () => {
  try {
    logger.info('🔄 Starting QR code data seeding...');

    // First, check if the qr_codes table exists, if not create it
    await query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_code VARCHAR(20) NOT NULL UNIQUE REFERENCES products(code) ON DELETE CASCADE,
        qr_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get all product codes
    const productsResult = await query('SELECT code FROM products');
    const productCodes = productsResult.rows.map(row => row.code);

    // For each product code, create a QR code entry
    for (const code of productCodes) {
      // The QR data is simply the product code itself
      // In a real system, you might want to encode more information or use a specific format
      const qrData = code;
      
      // Map QR image URLs to product codes
      const qrImageUrl = `/qr-codes/${code}.png`;

      await query(`
        INSERT INTO qr_codes (product_code, qr_data, qr_image_url)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_code) DO UPDATE
        SET qr_data = $2, qr_image_url = $3
      `, [code, qrData, qrImageUrl]);
    }

    logger.info(`✅ QR code data seeding completed successfully for ${productCodes.length} products`);
  } catch (error) {
    logger.error('❌ QR code data seeding failed:', error);
    throw error;
  }
};

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQRCodes()
    .then(() => {
      logger.info('🎉 QR code seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 QR code seeding script failed:', error);
      process.exit(1);
    });
}

export { seedQRCodes };