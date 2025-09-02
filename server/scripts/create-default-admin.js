import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Creates default admin user for initial system access
 */
const createDefaultAdmin = async () => {
  try {
    logger.info('🔄 Creating default admin user...');

    // Check if admin user already exists
    const existingAdmin = await query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (existingAdmin.rows.length > 0) {
      logger.info('ℹ️ Default admin user already exists');
      return;
    }

    // Hash the default password
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Create default admin user
    await query(
      `INSERT INTO users (username, name, password_hash, role) 
       VALUES ($1, $2, $3, $4)`,
      ['admin', 'System Administrator', passwordHash, 'admin']
    );

    logger.info('✅ Default admin user created successfully');
    logger.info('📋 Login credentials:');
    logger.info('   Username: admin');
    logger.info('   Password: admin123');
    logger.info('⚠️ IMPORTANT: Change the default password after first login!');

  } catch (error) {
    logger.error('❌ Failed to create default admin user:', error);
    throw error;
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDefaultAdmin()
    .then(() => {
      logger.info('🎉 Default admin creation completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Default admin creation failed:', error);
      process.exit(1);
    });
}

export { createDefaultAdmin };