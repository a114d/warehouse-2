import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    
    let queryText = 'SELECT * FROM inventory ORDER BY created_at DESC';
    let queryParams = [];
    
    if (type) {
      queryText = 'SELECT * FROM inventory WHERE type = $1 ORDER BY created_at DESC';
      queryParams = [type];
    }
    
    const result = await query(queryText, queryParams);
    
    // Format the response to match frontend expectations
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
    logger.error('Get inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM inventory WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
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
    
    res.json(formattedItem);
  } catch (error) {
    logger.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search inventory by code (for QR scanner)
router.get('/search/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Try exact match first
    let result = await query('SELECT * FROM inventory WHERE UPPER(code) = UPPER($1)', [code]);
    
    if (result.rows.length === 0) {
      // Try partial match
      result = await query(
        `SELECT * FROM inventory 
         WHERE UPPER(code) LIKE UPPER($1) 
         OR UPPER(name) LIKE UPPER($1) 
         ORDER BY 
           CASE 
             WHEN UPPER(code) = UPPER($1) THEN 1
             WHEN UPPER(code) LIKE UPPER($1) THEN 2
             WHEN UPPER(name) LIKE UPPER($1) THEN 3
             ELSE 4
           END
         LIMIT 10`,
        [`%${code}%`]
      );
    }
    
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
    logger.error('Search inventory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new inventory item
router.post('/', requireRole(['admin', 'stock-worker']), [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('code').trim().isLength({ min: 1 }).withMessage('Code is required'),
  body('type').isIn(['ice-cream', 'drinks', 'kitchen', 'non-kitchen']).withMessage('Invalid type'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, code, type, flavor, quantity, expiryDate } = req.body;

    const result = await query(
      `INSERT INTO inventory (name, code, type, flavor, quantity, expiry_date) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, code, type, flavor || null, quantity, expiryDate || null]
    );

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

    logger.info(`Inventory item ${name} added by ${req.user.name}`);
    res.status(201).json(formattedItem);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Item code already exists' });
    }
    logger.error('Add inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory item
router.put('/:id', requireRole(['admin', 'stock-worker']), [
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, quantity, expiryDate, flavor } = req.body;

    const result = await query(
      `UPDATE inventory 
       SET name = COALESCE($1, name), 
           quantity = COALESCE($2, quantity), 
           expiry_date = COALESCE($3, expiry_date),
           flavor = COALESCE($4, flavor),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [name, quantity, expiryDate, flavor, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
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

    logger.info(`Inventory item ${id} updated by ${req.user.name}`);
    res.json(formattedItem);
  } catch (error) {
    logger.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete inventory item
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM inventory WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    logger.info(`Inventory item ${id} deleted by ${req.user.name}`);
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;