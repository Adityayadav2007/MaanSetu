import multer from 'multer'
import crypto from 'node:crypto'
import path from 'node:path'

/**
 * File upload handling for Rule 10 supporting documents.
 *
 * Files are held in memory and written to disk under `UPLOAD_DIR` with a
 * generated name. The original filename is never used as the on-disk name:
 * it is attacker-controlled and would allow path traversal
 * (`../../etc/passwd`) or overwriting another applicant's document.
 */

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB — mirrors the limit in errorHandler
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10) || ''
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`)
  },
})

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WebP images and PDF files are accepted.'))
  }
  cb(null, true)
}

export const uploadDocuments = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: 8 },
  fileFilter,
}).array('documents', 8)

export const UPLOAD_LIMIT_MB = MAX_FILE_BYTES / (1024 * 1024)
export { UPLOAD_DIR }
