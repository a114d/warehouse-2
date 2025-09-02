import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', requireRole(['admin']), async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, name, role, shop_id, shop_name, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, username, name, role, shop_id, shop_name, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (Admin only)
router.post('/', requireRole(['admin']), [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'stock-worker', 'store-worker', 'screen']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, name, password, role, shopId, shopName } = req.body;

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const result = await query(
      `INSERT INTO users (username, name, password_hash, role, shop_id, shop_name) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, name, role, shop_id, shop_name`,
      [username, name, passwordHash, role, shopId || null, shopName || null]
    );

    const newUser = result.rows[0];

    logger.info(`New user ${username} created by ${req.user.name} with role ${role}`);

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Username already exists' });
    }
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (Admin only)
router.put('/:id', requireRole(['admin']), [
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Name cannot be empty'),
  body('role').optional().isIn(['admin', 'stock-worker', 'store-worker', 'screen']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, role, shopId, shopName } = req.body;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           role = COALESCE($2, role),
           shop_id = $3,
           shop_name = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING id, username, name, role, shop_id, shop_name`,
      [name, role, shopId || null, shopName || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User ${id} updated by ${req.user.name}`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`User ${result.rows[0].username} deleted by ${req.user.name}`);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;