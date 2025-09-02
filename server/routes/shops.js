import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all shops
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM shops ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    logger.error('Get shops error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shop by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM shops WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Get shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new shop (Admin only)
router.post('/', requireRole(['admin']), [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('location').trim().isLength({ min: 1 }).withMessage('Location is required'),
  body('contactPerson').trim().isLength({ min: 1 }).withMessage('Contact person is required'),
  body('phone').trim().isLength({ min: 1 }).withMessage('Phone is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('address').trim().isLength({ min: 1 }).withMessage('Address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, location, contactPerson, phone, email, address } = req.body;

    const result = await query(
      `INSERT INTO shops (name, location, contact_person, phone, email, address) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, location, contactPerson, phone, email, address]
    );

    logger.info(`Shop ${name} added by ${req.user.name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Add shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update shop (Admin only)
router.put('/:id', requireRole(['admin']), [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('location').optional().trim().isLength({ min: 1 }).withMessage('Location cannot be empty'),
  body('contactPerson').optional().trim().isLength({ min: 1 }).withMessage('Contact person cannot be empty'),
  body('phone').optional().trim().isLength({ min: 1 }).withMessage('Phone cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('address').optional().trim().isLength({ min: 1 }).withMessage('Address cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, location, contactPerson, phone, email, address } = req.body;

    const result = await query(
      `UPDATE shops 
       SET name = COALESCE($1, name), 
           location = COALESCE($2, location),
           contact_person = COALESCE($3, contact_person),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           address = COALESCE($6, address),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [name, location, contactPerson, phone, email, address, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    logger.info(`Shop ${id} updated by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shop (Admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM shops WHERE id = $1 RETURNING name', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    logger.info(`Shop ${result.rows[0].name} deleted by ${req.user.name}`);
    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    logger.error('Delete shop error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;