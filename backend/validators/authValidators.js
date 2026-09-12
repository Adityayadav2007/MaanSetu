import Joi from 'joi'

/**
 * Validation schemas for authentication endpoints.
 */

export const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'string.empty': 'Email or officer ID is required',
    'any.required': 'Email or officer ID is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  }),
  role: Joi.string()
    .valid('BUSINESS', 'LMO', 'GATC', 'ADMIN')
    .required()
    .messages({
      'any.only': 'Invalid role specified',
      'any.required': 'Role is required'
    })
})

export const registerBusinessSchema = Joi.object({
  // Business details
  businessName: Joi.string().trim().required().messages({
    'string.empty': 'Business name is required'
  }),
  businessType: Joi.string()
    .valid('PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PVT_LTD', 'PUBLIC_LTD', 'COOPERATIVE', 'TRUST', 'GOVT', 'OTHER')
    .required(),
  tradeCategory: Joi.string().trim().required(),
  gstin: Joi.string()
    .trim()
    .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'GSTIN must be in valid format (15 characters)'
    }),
  panNo: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .required()
    .messages({
      'string.pattern.base': 'PAN must be in format ABCDE1234F'
    }),

  // Contact details
  contactPerson: Joi.string().trim().required(),
  designation: Joi.string().trim().optional().allow(''),
  mobile: Joi.string()
    .pattern(/^[6-9][0-9]{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Mobile number must be a valid 10-digit Indian number'
    }),
  email: Joi.string().email().required(),

  // Premises
  premisesAddress: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  district: Joi.string().trim().required(),
  pincode: Joi.string()
    .pattern(/^[1-9][0-9]{5}$/)
    .required()
    .messages({
      'string.pattern.base': 'PIN code must be a valid 6-digit code'
    }),

  // Credentials
  password: Joi.string()
    .min(12)
    .pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/)
    .required()
    .messages({
      'string.min': 'Password must be at least 12 characters',
      'string.pattern.base': 'Password must include upper and lower case letters, a digit and a special character'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
})
