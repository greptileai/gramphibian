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
    // Write to a file
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'changelog-debug.log'),
      level: 'debug'
    }),
    // Also write errors to a separate file
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'changelog-error.log'), 
      level: 'error' 
    })
  ]
});

// If we're not in production, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;