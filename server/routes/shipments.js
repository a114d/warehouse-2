import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all shipment requests
router.get('/requests', async (req, res) => {
  try {
    const { status } = req.query;
    
    let queryText = 'SELECT * FROM shipment_requests ORDER BY request_date DESC, created_at DESC';
    let queryParams = [];
    
    if (status) {
      queryText = 'SELECT * FROM shipment_requests WHERE status = $1 ORDER BY request_date DESC, created_at DESC';
      queryParams = [status];
    }
    
    const result = await query(queryText, queryParams);
    
    // Format the response
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      itemType: row.item_type,
      flavor: row.flavor,
      quantity: row.quantity,
      destination: row.destination,
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
      notes: row.notes
    }));
    
    res.json(formattedRequests);
  } catch (error) {
    logger.error('Get shipment requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all completed shipments
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM shipments ORDER BY shipment_date DESC, created_at DESC');
    
    // Format the response
    const formattedShipments = result.rows.map(row => ({
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      itemType: row.item_type,
      flavor: row.flavor,
      quantity: row.quantity,
      destination: row.destination,
      shipmentDate: row.shipment_date,
      adminId: row.admin_id,
      adminName: row.admin_name
    }));
    
    res.json(formattedShipments);
  } catch (error) {
    logger.error('Get shipments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new shipment request
router.post('/requests', [
  body('itemId').trim().isLength({ min: 1 }).withMessage('Item ID is required'),
  body('itemName').trim().isLength({ min: 1 }).withMessage('Item name is required'),
  body('itemType').isIn(['ice-cream', 'drinks', 'kitchen', 'non-kitchen']).withMessage('Invalid item type'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('destination').trim().isLength({ min: 1 }).withMessage('Destination is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, itemName, itemType, flavor, quantity, destination } = req.body;

    const result = await query(
      `INSERT INTO shipment_requests (item_id, item_name, item_type, flavor, quantity, destination, requested_by_id, requested_by_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [itemId, itemName, itemType, flavor || null, quantity, destination, req.user.id, req.user.name]
    );

    logger.info(`Shipment request created for ${itemName} to ${destination} by ${req.user.name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Create shipment request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shipment request status (Admin only)
router.put('/requests/:id/status', requireRole(['admin']), [
  body('status').isIn(['pending', 'approved', 'cancelled', 'shipped']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await query(
      `UPDATE shipment_requests 
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
      return res.status(404).json({ error: 'Shipment request not found' });
    }

    logger.info(`Shipment request ${id} status updated to ${status} by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update shipment request status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create completed shipment (Admin only)
router.post('/', requireRole(['admin']), [
  body('itemId').trim().isLength({ min: 1 }).withMessage('Item ID is required'),
  body('itemName').trim().isLength({ min: 1 }).withMessage('Item name is required'),
  body('itemType').isIn(['ice-cream', 'drinks', 'kitchen', 'non-kitchen']).withMessage('Invalid item type'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('destination').trim().isLength({ min: 1 }).withMessage('Destination is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, itemName, itemType, flavor, quantity, destination, shipmentDate } = req.body;

    const result = await query(
      `INSERT INTO shipments (item_id, item_name, item_type, flavor, quantity, destination, shipment_date, admin_id, admin_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [itemId, itemName, itemType, flavor || null, quantity, destination, shipmentDate || new Date().toISOString().split('T')[0], req.user.id, req.user.name]
    );

    logger.info(`Shipment created: ${itemName} to ${destination} by ${req.user.name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Create shipment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;