import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all stock requests
router.get('/', async (req, res) => {
  try {
    const { status, shopId } = req.query;
    
    let queryText = `
      SELECT sr.*, 
             json_agg(
               json_build_object(
                 'productId', sri.product_id,
                 'productName', sri.product_name,
                 'productCode', sri.product_code,
                 'quantity', sri.quantity,
                 'type', sri.type
               )
             ) as items
      FROM stock_requests sr
      LEFT JOIN stock_request_items sri ON sr.id = sri.stock_request_id
    `;
    
    let queryParams = [];
    let whereConditions = [];
    
    if (status) {
      whereConditions.push('sr.status = $' + (queryParams.length + 1));
      queryParams.push(status);
    }
    
    if (shopId) {
      whereConditions.push('sr.shop_id = $' + (queryParams.length + 1));
      queryParams.push(shopId);
    }
    
    if (whereConditions.length > 0) {
      queryText += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    queryText += ' GROUP BY sr.id ORDER BY sr.request_date DESC, sr.created_at DESC';
    
    const result = await query(queryText, queryParams);
    
    // Format the response
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      shopId: row.shop_id,
      shopName: row.shop_name,
      status: row.status,
      requestDate: row.request_date,
      requestedBy: {
        id: row.requested_by_id,
        name: row.requested_by_name
      },
      processedBy: row.processed_by_id ? {
        id: row.processed_by_id,
        name: row.processed_by_name
      } : undefined,
      processedAt: row.processed_at,
      notes: row.notes,
      items: row.items || []
    }));
    
    res.json(formattedRequests);
  } catch (error) {
    logger.error('Get stock requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new stock request
router.post('/', [
  body('shopId').trim().isLength({ min: 1 }).withMessage('Shop ID is required'),
  body('shopName').trim().isLength({ min: 1 }).withMessage('Shop name is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shopId, shopName, items } = req.body;

    // Start transaction
    const client = await query('BEGIN');
    
    try {
      // Insert stock request
      const requestResult = await query(
        `INSERT INTO stock_requests (shop_id, shop_name, requested_by_id, requested_by_name) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [shopId, shopName, req.user.id, req.user.name]
      );

      const requestId = requestResult.rows[0].id;

      // Insert stock request items
      for (const item of items) {
        await query(
          `INSERT INTO stock_request_items (stock_request_id, product_id, product_name, product_code, quantity, type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [requestId, item.productId, item.productName, item.productCode, item.quantity, item.type]
        );
      }

      await query('COMMIT');

      logger.info(`Stock request created for ${shopName} by ${req.user.name}`);
      res.status(201).json(requestResult.rows[0]);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Create stock request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update stock request status (Admin only)
router.put('/:id/status', requireRole(['admin', 'stock-worker']), [
  body('status').isIn(['pending', 'processing', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await query(
      `UPDATE stock_requests 
       SET status = $1, 
           processed_by_id = $2,
           processed_by_name = $3,
           processed_at = CURRENT_TIMESTAMP,
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [status, req.user.id, req.user.name, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stock request not found' });
    }

    logger.info(`Stock request ${id} status updated to ${status} by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update stock request status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;