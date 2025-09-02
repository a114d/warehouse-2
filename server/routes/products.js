import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    
    let queryText = 'SELECT * FROM products ORDER BY created_at DESC';
    let queryParams = [];
    
    if (type) {
      queryText = 'SELECT * FROM products WHERE type = $1 ORDER BY created_at DESC';
      queryParams = [type];
    }
    
    const result = await query(queryText, queryParams);
    
    // Format the response to match frontend expectations
    const formattedProducts = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      category: row.category,
      productionDate: row.production_date,
      quantity: row.quantity
    }));
    
    res.json(formattedProducts);
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const row = result.rows[0];
    const formattedProduct = {
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      category: row.category,
      productionDate: row.production_date,
      quantity: row.quantity
    };
    
    res.json(formattedProduct);
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new product (Admin only)
router.post('/', requireRole(['admin']), [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('type').isIn(['ice-cream', 'drinks', 'kitchen', 'non-kitchen']).withMessage('Invalid type'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, category, productionDate, quantity } = req.body;

    // Generate product code
    const codeResult = await query(
      'SELECT code FROM products WHERE type = $1 ORDER BY code DESC LIMIT 1',
      [type]
    );
    
    const prefix = type === 'ice-cream' ? 'IC' : 
                   type === 'drinks' ? 'DR' : 
                   type === 'kitchen' ? 'KT' : 'NK';
    
    let nextNumber = 1;
    if (codeResult.rows.length > 0) {
      const lastCode = codeResult.rows[0].code;
      const lastNumber = parseInt(lastCode.substring(2)) || 0;
      nextNumber = lastNumber + 1;
    }
    
    const code = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    // Start transaction
    await query('BEGIN');
    
    try {
      // Insert product
      const productResult = await query(
        `INSERT INTO products (code, name, type, category, production_date, quantity) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [code, name, type, category || null, productionDate, quantity]
      );

      // Also add to inventory with proper expiry date
      const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await query(
        `INSERT INTO inventory (name, code, type, flavor, quantity, expiry_date) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, code, type, type === 'ice-cream' ? 'Default' : null, quantity, expiryDate]
      );

      // Create QR code entry
      await query(
        `INSERT INTO qr_codes (product_code, qr_data, qr_image_url) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (product_code) DO NOTHING`,
        [code, code, `/qr-codes/${code}.png`]
      );

      await query('COMMIT');

      const row = productResult.rows[0];
      const formattedProduct = {
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type,
        category: row.category,
        productionDate: row.production_date,
        quantity: row.quantity
      };

      logger.info(`Product ${name} (${code}) added by ${req.user.name} with quantity ${quantity}`);
      res.status(201).json(formattedProduct);
    } catch (error) {
      try {
        await query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Rollback error:', rollbackError);
      }
      throw error;
    }
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Product code already exists' });
    }
    logger.error('Add product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (Admin only)
router.put('/:id', requireRole(['admin']), [
  body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, quantity, productionDate } = req.body;

    // Start transaction
    await query('BEGIN');
    
    try {
      const result = await query(
        `UPDATE products 
         SET name = COALESCE($1, name), 
             quantity = COALESCE($2, quantity), 
             production_date = COALESCE($3, production_date),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 
         RETURNING *`,
        [name, quantity, productionDate, id]
      );

      if (result.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }

      // Also update inventory if quantity changed
      if (quantity !== undefined) {
        await query(
          'UPDATE inventory SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE code = $2',
          [quantity, result.rows[0].code]
        );
      }

      await query('COMMIT');

      const row = result.rows[0];
      const formattedProduct = {
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type,
        category: row.category,
        productionDate: row.production_date,
        quantity: row.quantity
      };

      logger.info(`Product ${id} updated by ${req.user.name}`);
      res.json(formattedProduct);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (Admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Start transaction
    await query('BEGIN');
    
    try {
      // Get product code first
      const productResult = await query('SELECT code FROM products WHERE id = $1', [id]);
      if (productResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const productCode = productResult.rows[0].code;
      
      // Delete from products
      await query('DELETE FROM products WHERE id = $1', [id]);
      
      // Also delete from inventory
      await query('DELETE FROM inventory WHERE code = $1', [productCode]);
      
      // Delete QR code entry
      await query('DELETE FROM qr_codes WHERE product_code = $1', [productCode]);

      await query('COMMIT');

      logger.info(`Product ${id} deleted by ${req.user.name}`);
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;