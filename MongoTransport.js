/**Adding a custom transport is easy. 
 * All you need to do is:
 * 1. accept any options you need,
 * 2. implement a log() method, 
 * 3. and consume it with winston. */
const Transport = require('winston-transport');
const Log = require('./models/logModel');

class MongoTransport extends Transport {
    constructor(opts) {
        super(opts);
        this.name = 'MongoTransport';
    }

    //we'll consume this method when actually logging an issue
    async log(info, callback) {
        /**setImmediate() in Node.js is a function used to schedule a callback to be executed at the end of 
         * the current event loop iteration, specifically during the "check" phase. 
         * This means the callback will run after all I/O operations and other callbacks in the current event loop cycle
         *  have been processed, but before the next event loop iteration begins.  */
        setImmediate(() => {
            this.emit('logged', info);
        });

        try {
            const logEntry = new Log({
                timestamp: new Date(),
                level: info.level,
                message: info.message,
                meta: info.meta || {},
                clientInfo: info.clientInfo || {},
                sessionId: info.sessionId,
                errorStack: info.stack || null
            });

            await logEntry.save();
            callback();
        } catch (error) {
            console.error('Error saving log to MongoDB:', error);
            callback(error);
        }
    }
}

module.exports = MongoTransport;
