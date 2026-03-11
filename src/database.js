/**
 * BACKWARD COMPATIBILITY BRIDGE
 * This file redirects all database calls to the new modular structure in src/database/
 */
const db = require('./database/index');

module.exports = db;
