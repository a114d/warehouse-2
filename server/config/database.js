import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Database configuration
let dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'invizio_wms',
  user: process.env.DB_USER || 'invizio_admin',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true' ? 
    { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true } : 
    false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Check if we have a connection string instead
if (process.env.DATABASE_URL) {
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true' ? 
      { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true } : 
      false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
pool.on('connect', () => {
  logger.info('🔗 Connected to PostgreSQL database');
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    logger.info('📁 Created logs directory');
  }
});

pool.on('error', (err) => {
  logger.error('💥 Unexpected error on idle client', err);
  process.exit(-1);
});

// Database query helper
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Executed query: ${text} | Duration: ${duration}ms | Rows: ${res.rowCount}`);
    return res;
  } catch (error) {
    logger.error(`Database query error: ${error.message}`);
    throw error;
  }
};

// Get a client from the pool
export const getClient = async () => {
  return await pool.connect();
};

// Close the pool
export const closePool = async () => {
  await pool.end();
  logger.info('🔌 Database pool closed');
};

export default pool;