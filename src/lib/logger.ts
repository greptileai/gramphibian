import winston from 'winston';
import path from 'path';

// Configure the logger
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      // Always use console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });
  

// If we're not in production, also log to console
if (process.env.NODE_ENV === 'development') {
    // Try-catch to handle cases where logs directory doesn't exist
    try {
      logger.add(
        new winston.transports.File({ 
          filename: 'logs/changelog-debug.log'
        })
      );
      logger.add(
        new winston.transports.File({ 
          filename: 'logs/changelog-error.log', 
          level: 'error' 
        })
      );
    } catch (error) {
      console.warn('Failed to initialize file logging:', error);
    }
  }

export default logger;