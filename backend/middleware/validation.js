/**
 * Request validation middleware.
 *
 * Validates request body/query/params against a Joi schema. Returns 400 with
 * detailed errors if validation fails.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), registerController)
 */
export function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      })
    }

    req[property] = value
    next()
  }
}

/**
 * Global error handler.
 *
 * Catches all errors thrown in route handlers and returns consistent JSON
 * error responses. Should be registered last in the middleware chain.
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err)

  // Database errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this value already exists'
    })
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Invalid reference',
      message: 'Referenced record does not exist'
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid authentication token' })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Authentication token expired' })
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5 MB limit' })
    }
    return res.status(400).json({ error: 'File upload error', message: err.message })
  }

  // Default 500
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

/**
 * 404 handler for undefined routes.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} does not exist`
  })
}

/**
 * Async route handler wrapper.
 *
 * Catches promise rejections in async route handlers and passes them to the
 * error handler middleware, avoiding the need for try-catch in every route.
 *
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await getUsersFromDB()
 *     res.json(users)
 *   }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
