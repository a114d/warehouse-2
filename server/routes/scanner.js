import express from 'express';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Search inventory by barcode/code
router.get('/search/:code', requireRole(['admin', 'stock-worker']), async (req, res) => {
  try {
    const { code } = req.params;
    
    logger.info(`🔍 Scanner search for code: ${code} by ${req.user.name}`);
    
    // Try exact match first
    let result = await query(
      'SELECT * FROM inventory WHERE UPPER(code) = UPPER($1)',
      [code]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      const formattedItem = {
        id: row.id,
        name: row.name,
        code: row.code,
        type: row.type,
        flavor: row.flavor,
        quantity: row.quantity,
        expiryDate: row.expiry_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      logger.info(`✅ Exact match found: ${row.name} (${row.code})`);
      
      // Log the scan activity
      await query(
        `INSERT INTO scan_logs (item_id, item_code, scan_type, user_id, user_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.id, row.code, 'manual_search', req.user.id, req.user.name]
      );
      
      return res.json(formattedItem);
    }
    
    // Try partial matches
    result = await query(
      `SELECT * FROM inventory 
       WHERE UPPER(code) LIKE UPPER($1) 
       OR UPPER(name) LIKE UPPER($1) 
       ORDER BY 
         CASE 
           WHEN UPPER(code) LIKE UPPER($1) THEN 1
           WHEN UPPER(name) LIKE UPPER($1) THEN 2
           ELSE 3
         END
       LIMIT 10`,
      [`%${code}%`]
    );
    
    if (result.rows.length > 0) {
      const formattedItems = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        type: row.type,
        flavor: row.flavor,
        quantity: row.quantity,
        expiryDate: row.expiry_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      logger.info(`📋 Partial matches found: ${result.rows.length} items`);
      return res.json(formattedItems);
    }
    
    logger.warn(`❌ No items found for code: ${code}`);
    res.status(404).json({ 
      error: 'Item not found',
      message: `No inventory item found for code: ${code}`,
      searchedCode: code
    });
    
  } catch (error) {
    logger.error('Scanner search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// QR code scan endpoint
router.post('/scan', requireRole(['admin', 'stock-worker']), [
  body('code').trim().isLength({ min: 1 }).withMessage('Code is required'),
  body('scanType').isIn(['qr_code', 'barcode', 'manual']).withMessage('Invalid scan type')
], async (req, res) => {
  try {
    const { code, scanType } = req.body;
    
    logger.info(`📱 QR/Barcode scan: ${code} (${scanType}) by ${req.user.name}`);
    
    // Search for the item
    const result = await query(
      'SELECT * FROM inventory WHERE UPPER(code) = UPPER($1)',
      [code]
    );
    
    if (result.rows.length === 0) {
      logger.warn(`❌ Scan failed - item not found: ${code}`);
      return res.status(404).json({ 
        error: 'Item not found',
        message: `No inventory item found for code: ${code}`,
        scannedCode: code
      });
    }
    
    const row = result.rows[0];
    const formattedItem = {
      id: row.id,
      name: row.name,
      code: row.code,
      type: row.type,
      flavor: row.flavor,
      quantity: row.quantity,
      expiryDate: row.expiry_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    // Log the scan activity
    await query(
      `INSERT INTO scan_logs (item_id, item_code, scan_type, user_id, user_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [row.id, row.code, scanType, req.user.id, req.user.name]
    );
    
    logger.info(`✅ Scan successful: ${row.name} (${row.code})`);
    res.json(formattedItem);
    
  } catch (error) {
    logger.error('QR scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get scan history
router.get('/scan-history', requireRole(['admin', 'stock-worker']), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const result = await query(
      `SELECT sl.*, i.name as item_name, i.type as item_type
       FROM scan_logs sl
       LEFT JOIN inventory i ON sl.item_id = i.id
       ORDER BY sl.created_at DESC 
       LIMIT $1`,
      [parseInt(limit)]
    );
    
    const formattedHistory = result.rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      itemCode: row.item_code,
      itemName: row.item_name,
      itemType: row.item_type,
      scanType: row.scan_type,
      userId: row.user_id,
      userName: row.user_name,
      createdAt: row.created_at
    }));
    
    res.json(formattedHistory);
  } catch (error) {
    logger.error('Scan history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock items
router.get('/low-stock/:threshold', requireRole(['admin', 'stock-worker']), async (req, res) => {
  try {
    const { threshold } = req.params;
    
    const result = await query(
      'SELECT * FROM inventory WHERE quantity <= $1 ORDER BY quantity ASC',
      [parseInt(threshold)]
    );
    
    const formattedItems = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      type: row.type,
      flavor: row.flavor,
      quantity: row.quantity,
      expiryDate: row.expiry_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(formattedItems);
  } catch (error) {
    logger.error('Low stock check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;