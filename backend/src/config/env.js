'use strict';
/**
 * env.js — Environment variable validation.
 * Fails fast on startup if required variables are missing.
 * Import this BEFORE anything that needs env vars.
 */

const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const missing = REQUIRED.filter((k) => !process.env[k]);

if (missing.length > 0) {
  console.error('\n[env] ❌ Missing required environment variables:');
  missing.forEach((k) => console.error(`       - ${k}`));
  console.error('[env] Copy backend/.env.example → backend/.env and fill in values.\n');
  process.exit(1);
}

module.exports = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  IS_PROD: process.env.NODE_ENV === 'production',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'kelvin_shoe_repair',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  PHONE_SESSION_EXPIRES_IN: process.env.PHONE_SESSION_EXPIRES_IN || '10m',

  // SMS
  SMS_PROVIDER: process.env.SMS_PROVIDER || 'africastalking',
  SMS_MODE: process.env.SMS_MODE || 'mock',
  AT_API_KEY: process.env.AT_API_KEY || '',
  AT_USERNAME: process.env.AT_USERNAME || '',

  // File uploads
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  IMAGE_MAX_DIMENSION: parseInt(process.env.IMAGE_MAX_DIMENSION || '1200', 10),
  IMAGE_QUALITY: parseInt(process.env.IMAGE_QUALITY || '80', 10),

  // App
  SHOP_TIMEZONE: process.env.SHOP_TIMEZONE || 'Africa/Nairobi',
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Security / Business rules
  SESSION_INACTIVITY_MINUTES: parseInt(process.env.SESSION_INACTIVITY_MINUTES || '5', 10),
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  PICKUP_CODE_EXPIRY_HOURS: parseInt(process.env.PICKUP_CODE_EXPIRY_HOURS || '24', 10),
  REGISTRATION_EXPIRY_HOURS: parseInt(process.env.REGISTRATION_EXPIRY_HOURS || '48', 10),
  PRICE_CONFIRMATION_TIMEOUT_HOURS: parseInt(process.env.PRICE_CONFIRMATION_TIMEOUT_HOURS || '72', 10),
  ABANDONED_DAYS: parseInt(process.env.ABANDONED_DAYS || '30', 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  LOGIN_MAX_ATTEMPTS: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
  LOGIN_LOCKOUT_MINUTES: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '5', 10),
};
