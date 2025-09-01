const winston = require('winston');
const MongoTransport = require('./MongoTransport');

const logger = winston.createLogger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    },
    format: winston.format.combine(
        winston.format.timestamp(),// Add timestamp to logs
        winston.format.json()// Format logs as JSON
    ),
    transports: [
        // Write all errors to error.log
        new winston.transports.File({ 
            filename: 'error.log', 
            level: 'error'
        }),
        // Write all logs to combined.log
        new winston.transports.File({ 
            filename: 'combined.log' 
        }),
        // Write to MongoDB
        new MongoTransport({
            level: 'info' // Log info and more severe
        })
    ]
});

/* // Add console logging if not in production
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
} */

// Helper function to add client context to logs
logger.logWithContext = function(level, message, app, additionalInfo = {}) {
    const clientInfo = app ? {
        ip: app.locals.ip,
        roomNumber: app.locals.roomnumber,
        type: app.locals.type
    } : {ip: "",
        roomNumber: "",
        type: ""};

    this.log(level, message, {
        ...additionalInfo,
        clientInfo,
        timestamp: new Date()
    });
};

module.exports = logger;
