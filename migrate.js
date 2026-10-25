/**
 * migrate.js — Database Setup Script
 * 
 * Usage (once PostgreSQL is installed and running):
 *   1. Copy backend/.env.example → backend/.env and fill in your credentials
 *   2. Create the database: createdb kelvin_shoe_repair  (or via pgAdmin)
 *   3. Run: node backend/migrate.js
 * 
 * This script reads database/schema.sql and runs it against your DB.
 * It is safe to run multiple times (uses IF NOT EXISTS + ON CONFLICT).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load dotenv if available (for local dev; in Render, env vars are in process.env)
try {
  require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
} catch {
  try {
    require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({
      path: path.join(__dirname, 'backend', '.env'),
    });
  } catch {
    // In production environments (Render), process.env is injected directly
  }
}

let Client;
try {
  Client = require('pg').Client;
} catch {
  Client = require(path.join(__dirname, 'backend', 'node_modules', 'pg')).Client;
}

const schemaPath = path.join(__dirname, 'database', 'schema.sql');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Please set the DATABASE_URL environment variable.');
    process.exit(1);
  }

  const isRemoteDb = process.env.NODE_ENV === 'production' || 
    (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1'));

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('📦 Connecting to database...');
    await client.connect();
    console.log('✅ Connected.');

    console.log('📄 Reading schema.sql...');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⚙️  Running schema...');
    await client.query(sql);

    console.log('\n✅ Migration complete! Tables created:');
    const res = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    res.rows.forEach((r) => console.log('   •', r.tablename));

    console.log('\n⚠️  IMPORTANT: The seed owner account uses a placeholder password hash.');
    console.log('   Run this to generate a real hash, then update the users table:');
    console.log("   node -e \"console.log(require('bcrypt').hashSync('YourPassword', 12))\"");
    console.log('\n🚀 Ready to start the backend: cd backend && npm run dev\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Is PostgreSQL running? (check Services or pg_ctl status)');
    console.error('  2. Does the database exist? Run: createdb kelvin_shoe_repair');
    console.error('  3. Are DATABASE_URL credentials correct in backend/.env?');
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
