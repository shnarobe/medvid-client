const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },
    level: {
        type: String,
        required: true,
        enum: ['error', 'warn', 'info', 'debug']
    },
    message: {
        type: String,
        required: true
    },
    meta: {
        type: mongoose.Schema.Types.Mixed
    },
    clientInfo: {
        ip: String,
        roomNumber: String,
        type: String
    },
    sessionId: String,
    errorStack: String
}, { timestamps: true });

// Index for better query performance
logSchema.index({ timestamp: -1, level: 1 });
logSchema.index({ 'clientInfo.ip': 1 });

module.exports = mongoose.model('Log', logSchema);
