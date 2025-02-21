const fs = require('fs');
const crypto = require('crypto');

// Generate a random session secret key
const sessionSecret = `SESSION_SECRET=${crypto.randomBytes(64).toString('hex')}\n`;

// Write or append the session secret key to the .env file
fs.appendFileSync('.env', sessionSecret);


