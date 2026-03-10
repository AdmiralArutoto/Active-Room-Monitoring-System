const Redis = require('ioredis');

const url = process.env.REDIS_URL || 'redis://localhost:6379';

// Main client for commands (HSET, HGET, PUBLISH, etc.)
const publisher = new Redis(url);

// Dedicated client for SUBSCRIBE mode (can't run other commands while subscribed)
const subscriber = new Redis(url);

publisher.on('error', (err) => console.error('Redis publisher error:', err.message));
subscriber.on('error', (err) => console.error('Redis subscriber error:', err.message));

module.exports = { publisher, subscriber };
