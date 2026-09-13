import Joi from 'joi'
import { INSTRUMENT_CATEGORY_CODES, ACCURACY_CLASS_CODES } from './codes.js'

/**
 * Validation schemas for the instrument register.
 *
 * The field list mirrors the registration form in
 * frontend/src/pages/business/InstrumentRegister.jsx, so a form that passes
 * client-side validation also passes here. Server-side checks are the ones that
 * matter — client validation is a convenience, not a control.
 */

const YEAR = new Date().getFullYear()

export const registerInstrumentSchema = Joi.object({
  category: Joi.string()
    .valid(...INSTRUMENT_CATEGORY_CODES)
    .required()
    .messages({ 'any.only': 'Select a valid instrument category' }),

  make: Joi.string().trim().min(2).max(255).required().messages({
    'string.empty': 'Make is required',
    'string.min': 'Make must be at least 2 characters',
  }),

  model: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Model is required',
  }),

  serialNo: Joi.string().trim().min(3).max(255).required().messages({
    'string.empty': 'Serial number is required',
    'string.min': 'Serial number must be at least 3 characters',
  }),

  yearOfManufacture: Joi.number()
    .integer()
    .min(1950)
    .max(YEAR)
    .optional()
    .messages({
      'number.min': `Year of manufacture cannot be before 1950`,
      'number.max': `Year of manufacture cannot be after ${YEAR}`,
    }),

  capacity: Joi.string().trim().required().messages({
    'string.empty': 'Capacity is required',
  }),

  unit: Joi.string().trim().max(50).optional().allow('', null),

  accuracyClass: Joi.string()
    .valid(...ACCURACY_CLASS_CODES)
    .optional()
    .allow('', null)
    .messages({ 'any.only': 'Invalid accuracy class' }),

  leastCount: Joi.string().trim().max(50).optional().allow('', null),

  modelApprovalNo: Joi.string().trim().max(100).optional().allow('', null),

  premisesName: Joi.string().trim().max(255).optional().allow('', null),

  premisesAddress: Joi.string().trim().min(5).required().messages({
    'string.empty': 'Premises address is required',
    'string.min': 'Enter the full premises address',
  }),

  premisesState: Joi.string().trim().max(100).optional().allow('', null),
  premisesDistrict: Joi.string().trim().max(100).optional().allow('', null),

  premisesPincode: Joi.string()
    .pattern(/^[1-9][0-9]{5}$/)
    .optional()
    .allow('', null)
    .messages({ 'string.pattern.base': 'PIN code must be a valid 6-digit code' }),

  usageType: Joi.string().trim().max(50).optional().allow('', null),

  remarks: Joi.string().trim().max(2000).optional().allow('', null),
})

/**
 * Update schema: every field optional, but at least one must be present.
 * Note that category and serialNo are deliberately absent — changing either
 * would make the instrument a different instrument as far as the register and
 * any existing certificate are concerned.
 */
export const updateInstrumentSchema = Joi.object({
  make: Joi.string().trim().min(2).max(255),
  model: Joi.string().trim().min(1).max(255),
  capacity: Joi.string().trim().min(1),
  unit: Joi.string().trim().max(50).allow('', null),
  accuracyClass: Joi.string().valid(...ACCURACY_CLASS_CODES).allow('', null),
  leastCount: Joi.string().trim().max(50).allow('', null),
  modelApprovalNo: Joi.string().trim().max(100).allow('', null),
  premisesName: Joi.string().trim().max(255).allow('', null),
  premisesAddress: Joi.string().trim().min(5),
  premisesDistrict: Joi.string().trim().max(100),
  premisesPincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).allow('', null),
  usageType: Joi.string().trim().max(50).allow('', null),
  remarks: Joi.string().trim().max(2000).allow('', null),
}).min(1)
