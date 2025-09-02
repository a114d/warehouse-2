import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all operations
router.get('/', async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    
    let queryText = 'SELECT * FROM daily_operations ORDER BY operation_date DESC, created_at DESC';
    let queryParams = [];
    
    if (date) {
      queryText = 'SELECT * FROM daily_operations WHERE operation_date = $1 ORDER BY created_at DESC';
      queryParams = [date];
    } else if (startDate && endDate) {
      queryText = 'SELECT * FROM daily_operations WHERE operation_date BETWEEN $1 AND $2 ORDER BY operation_date DESC, created_at DESC';
      queryParams = [startDate, endDate];
    }
    
    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    logger.error('Get operations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new operation
router.post('/', requireRole(['admin', 'stock-worker']), [
  body('itemId').trim().isLength({ min: 1 }).withMessage('Item ID is required'),
  body('itemName').trim().isLength({ min: 1 }).withMessage('Item name is required'),
  body('itemType').isIn(['ice-cream', 'drinks', 'kitchen', 'non-kitchen']).withMessage('Invalid item type'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('direction').isIn(['in', 'out']).withMessage('Direction must be in or out')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, itemName, itemType, quantity, direction, date, notes } = req.body;

    const result = await query(
      `INSERT INTO daily_operations (item_id, item_name, item_type, quantity, direction, operation_date, admin_id, admin_name, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [itemId, itemName, itemType, quantity, direction, date || new Date().toISOString().split('T')[0], req.user.id, req.user.name, notes || null]
    );

    logger.info(`Operation added: ${direction} ${quantity} ${itemName} by ${req.user.name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Add operation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;