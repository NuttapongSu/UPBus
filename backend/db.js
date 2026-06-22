// backend/db.js
const mysql = require('mysql2');
require('dotenv').config();

// สร้างการเชื่อมต่อกับ Database
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'CesM.up@2025#',
    database: process.env.DB_NAME || 'db_bustransit',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();