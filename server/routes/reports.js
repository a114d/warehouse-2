import express from 'express';
import { query } from '../config/database.js';
import { requireRole } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get daily operations report
router.get('/daily-operations', requireRole(['admin']), async (req, res) => {
  try {
    const { date, startDate, endDate, includeSupplier } = req.query;
    
    let queryText = `
      SELECT 
        id,
        item_id,
        item_name,
        item_type,
        quantity,
        direction,
        operation_date as date,
        admin_id,
        admin_name,
        notes,
        created_at
      FROM daily_operations
    `;
    
    let queryParams = [];
    let whereConditions = [];
    
    if (date) {
      whereConditions.push('operation_date = $' + (queryParams.length + 1));
      queryParams.push(date);
    } else if (startDate && endDate) {
      whereConditions.push('operation_date BETWEEN $' + (queryParams.length + 1) + ' AND $' + (queryParams.length + 2));
      queryParams.push(startDate, endDate);
    }
    
    if (whereConditions.length > 0) {
      queryText += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    queryText += ' ORDER BY operation_date DESC, created_at DESC';
    
    const result = await query(queryText, queryParams);
    
    // If including supplier deliveries, fetch and merge them
    let supplierOperations = [];
    if (includeSupplier === 'true') {
      let supplierQuery = `
        SELECT 
          CONCAT('supplier-', sd.id, '-', sdi.id) as id,
          CONCAT('supplier-', sdi.id) as item_id,
          sdi.name as item_name,
          'kitchen' as item_type,
          sdi.quantity::integer as quantity,
          'in' as direction,
          sd.delivery_date as date,
          sd.received_by_id as admin_id,
          sd.received_by_name as admin_name,
          CONCAT('Supplier delivery from ', sd.supplier_name, ' - ', sdi.category) as notes,
          sd.created_at
        FROM supplier_deliveries sd
        JOIN supplier_delivery_items sdi ON sd.id = sdi.delivery_id
      `;
      
      let supplierParams = [];
      let supplierWhereConditions = [];
      
      if (date) {
        supplierWhereConditions.push('sd.delivery_date = $' + (supplierParams.length + 1));
        supplierParams.push(date);
      } else if (startDate && endDate) {
        supplierWhereConditions.push('sd.delivery_date BETWEEN $' + (supplierParams.length + 1) + ' AND $' + (supplierParams.length + 2));
        supplierParams.push(startDate, endDate);
      }
      
      if (supplierWhereConditions.length > 0) {
        supplierQuery += ' WHERE ' + supplierWhereConditions.join(' AND ');
      }
      
      supplierQuery += ' ORDER BY sd.delivery_date DESC, sd.created_at DESC';
      
      const supplierResult = await query(supplierQuery, supplierParams);
      supplierOperations = supplierResult.rows;
    }
    
    // Merge and sort all operations
    const allOperations = [...result.rows, ...supplierOperations].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });
    
    res.json(allOperations);
  } catch (error) {
    logger.error('Get daily operations report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory summary report
router.get('/inventory-summary', requireRole(['admin']), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        type,
        COUNT(*) as item_count,
        SUM(quantity) as total_quantity,
        AVG(quantity) as avg_quantity,
        MIN(quantity) as min_quantity,
        MAX(quantity) as max_quantity
      FROM inventory 
      GROUP BY type
      ORDER BY type
    `);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Get inventory summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get shipment summary report
router.get('/shipment-summary', requireRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let queryText = `
      SELECT 
        destination,
        item_type,
        COUNT(*) as shipment_count,
        SUM(quantity) as total_quantity
      FROM shipments
    `;
    
    let queryParams = [];
    
    if (startDate && endDate) {
      queryText += ' WHERE shipment_date BETWEEN $1 AND $2';
      queryParams = [startDate, endDate];
    }
    
    queryText += ' GROUP BY destination, item_type ORDER BY destination, item_type';
    
    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    logger.error('Get shipment summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock request summary report
router.get('/stock-request-summary', requireRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let queryText = `
      SELECT 
        shop_name,
        status,
        COUNT(*) as request_count,
        DATE_TRUNC('month', request_date) as month
      FROM stock_requests
    `;
    
    let queryParams = [];
    
    if (startDate && endDate) {
      queryText += ' WHERE request_date BETWEEN $1 AND $2';
      queryParams = [startDate, endDate];
    }
    
    queryText += ' GROUP BY shop_name, status, DATE_TRUNC(\'month\', request_date) ORDER BY month DESC, shop_name';
    
    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    logger.error('Get stock request summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;