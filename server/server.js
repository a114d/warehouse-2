import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import inventoryRoutes from './routes/inventory.js';
import productsRoutes from './routes/products.js';
import stockRequestsRoutes from './routes/stockRequests.js';
import shipmentRoutes from './routes/shipments.js';
import supplierRoutes from './routes/suppliers.js';
import shopsRoutes from './routes/shops.js';
import usersRoutes from './routes/users.js';
import reportsRoutes from './routes/reports.js';
import operationsRoutes from './routes/operations.js';
import scannerRoutes from './routes/scanner.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import pool from './config/database.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Compression and logging
app.use(compression());
app.use(morgan('combined', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  },
  skip: (req, res) => req.url === '/api/health'
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/products', authenticateToken, productsRoutes);
app.use('/api/stock-requests', authenticateToken, stockRequestsRoutes);
app.use('/api/shipments', authenticateToken, shipmentRoutes);
app.use('/api/suppliers', authenticateToken, supplierRoutes);
app.use('/api/shops', authenticateToken, shopsRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);
app.use('/api/operations', authenticateToken, operationsRoutes);
app.use('/api/scanner', authenticateToken, scannerRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  pool.query('SELECT 1')
    .then(() => {
      res.json({
        status: 'OK',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      });
    })
    .catch(err => {
      logger.error('Database health check failed:', err);
      res.status(500).json({
        status: 'ERROR',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      });
    });
});

// Server info endpoint
app.get('/api/server-info', (req, res) => {
  res.json({
    name: 'Invizio WMS',
    company: 'DigiProTech',
    version: '1.0.0',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  pool.end(() => {
    logger.info('Database pool closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Invizio WMS Server running on port ${PORT}`);
  logger.info(`🌐 Server URL: http://localhost:${PORT}`);
  logger.info(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`💾 Database: PostgreSQL at ${process.env.DB_HOST || 'localhost'}`);
  logger.info(`📱 QR/Barcode Scanner: Enabled`);
  logger.info(`📊 Health Check: http://localhost:${PORT}/api/health`);
});

export default app;