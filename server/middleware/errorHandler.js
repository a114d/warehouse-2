import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error
  let error = {
    message: 'Internal Server Error',
    status: 500
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
    error.status = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.status = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.status = 401;
  }

  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    error.message = 'Resource already exists';
    error.status = 409;
  }

  if (err.code === '23503') { // Foreign key constraint violation
    error.message = 'Referenced resource not found';
    error.status = 400;
  }

  if (err.code === '23502') { // Not null constraint violation
    error.message = 'Required field missing';
    error.status = 400;
  }

  // Custom errors
  if (err.status) {
    error.status = err.status;
    error.message = err.message;
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};