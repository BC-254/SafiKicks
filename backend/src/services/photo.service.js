'use strict';
/**
 * photo.service.js — Image upload, sharp compression, and file management.
 * NFR-06: Photos are compressed on upload and kept for retention period.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');
const env = require('../config/env');
const logger = require('../utils/logger');

// Store in memory buffer so sharp can process before saving to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
});

/**
 * Process buffer with sharp, resize to max dimension, compress, and save.
 * @param {Buffer} buffer
 * @param {string} jobId
 * @param {string} prefix - 'receipt' | 'completion'
 * @returns {Promise<string>} relative URL path e.g. '/uploads/jobs/:jobId/...'
 */
const saveCompressedPhoto = async (buffer, jobId, prefix = 'photo') => {
  const uploadsBase = path.resolve(env.UPLOAD_DIR);
  const jobDir = path.join(uploadsBase, 'jobs', jobId);

  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }

  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e4)}.webp`;
  const targetPath = path.join(jobDir, filename);

  await sharp(buffer)
    .resize(env.IMAGE_MAX_DIMENSION, env.IMAGE_MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: env.IMAGE_QUALITY })
    .toFile(targetPath);

  logger.info('Saved compressed photo', { jobId, filename });

  return `/uploads/jobs/${jobId}/${filename}`;
};

module.exports = {
  upload,
  saveCompressedPhoto,
};
