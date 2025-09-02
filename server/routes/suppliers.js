import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM suppliers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    logger.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all supplier deliveries
router.get('/deliveries', async (req, res) => {
  try {
    const result = await query(`
      SELECT sd.*, 
             json_agg(
               json_build_object(
                 'id', sdi.id,
                 'name', sdi.name,
                 'category', sdi.category,
                 'quantity', sdi.quantity,
                 'unit', sdi.unit,
                 'unitPrice', sdi.unit_price,
                 'totalPrice', sdi.total_price,
                 'expiryDate', sdi.expiry_date,
                 'batchNumber', sdi.batch_number
               )
             ) as items
      FROM supplier_deliveries sd
      LEFT JOIN supplier_delivery_items sdi ON sd.id = sdi.delivery_id
      GROUP BY sd.id
      ORDER BY sd.delivery_date DESC, sd.created_at DESC
    `);
    
    // Format the response
    const formattedDeliveries = result.rows.map(row => ({
      id: row.id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      deliveryDate: row.delivery_date,
      receivedBy: {
        id: row.received_by_id,
        name: row.received_by_name
      },
      totalAmount: row.total_amount,
      notes: row.notes,
      status: row.status,
      items: row.items || []
    }));
    
    res.json(formattedDeliveries);
  } catch (error) {
    logger.error('Get supplier deliveries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new supplier (Admin and Stock Workers)
router.post('/', requireRole(['admin', 'stock-worker']), [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('contactPerson').trim().isLength({ min: 1 }).withMessage('Contact person is required'),
  body('phone').trim().isLength({ min: 1 }).withMessage('Phone is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('address').trim().isLength({ min: 1 }).withMessage('Address is required'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, contactPerson, phone, email, address, category } = req.body;

    const result = await query(
      `INSERT INTO suppliers (name, contact_person, phone, email, address, category) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, contactPerson, phone, email, address, category]
    );

    logger.info(`Supplier ${name} added by ${req.user.name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Add supplier error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record supplier delivery (Admin and Stock Workers)
router.post('/deliveries', requireRole(['admin', 'stock-worker']), [
  body('supplierId').trim().isLength({ min: 1 }).withMessage('Supplier ID is required'),
  body('supplierName').trim().isLength({ min: 1 }).withMessage('Supplier name is required'),
  body('deliveryDate').isISO8601().withMessage('Valid delivery date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplierId, supplierName, deliveryDate, items, totalAmount, notes } = req.body;

    // Start transaction
    await query('BEGIN');
    
    try {
      // Insert supplier delivery
      const deliveryResult = await query(
        `INSERT INTO supplier_deliveries (supplier_id, supplier_name, delivery_date, received_by_id, received_by_name, total_amount, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [supplierId, supplierName, deliveryDate, req.user.id, req.user.name, totalAmount || null, notes || null]
      );

      const deliveryId = deliveryResult.rows[0].id;

      // Insert delivery items
      for (const item of items) {
        await query(
          `INSERT INTO supplier_delivery_items (delivery_id, code, category, quantity, expiry_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [deliveryId, item.code, item.category, item.quantity, item.expiryDate || null]
        );
      }

      await query('COMMIT');

      logger.info(`Supplier delivery recorded from ${supplierName} by ${req.user.name}`);
      res.status(201).json(deliveryResult.rows[0]);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Record supplier delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;