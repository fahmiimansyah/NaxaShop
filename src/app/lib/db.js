// File: src/lib/db.js
import mysql from 'mysql2/promise';

// Kita bikin koneksi ke XAMPP lokal lu
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Kosongin aja karena lu pake XAMPP default
  database: 'naxashop', // Pastiin namanya sama kayak di phpMyAdmin lu
});

export default db;