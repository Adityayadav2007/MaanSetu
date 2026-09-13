import Joi from 'joi'
import {
  APPLICATION_TYPE_CODES, APPLICATION_STATUS_CODES, VERIFICATION_RESULT_CODES,
} from './codes.js'

/** POST /api/applications — a business applies for verification. */
export const createApplicationSchema = Joi.object({
  instrumentId: Joi.string().trim().required().messages({
    'string.empty': 'Select the instrument to be verified',
  }),
  applicationType: Joi.string()
    .valid(...APPLICATION_TYPE_CODES)
    .required()
    .messages({ 'any.only': 'Select either fresh verification or re-verification' }),
  feePaid: Joi.number().min(0).optional().allow(null),
  feeReceipt: Joi.string().trim().max(100).optional().allow('', null),
})

/** PATCH /api/applications/:no/respond */
export const respondToQuerySchema = Joi.object({
  response: Joi.string().trim().min(10).max(2000).required().messages({
    'string.min': 'Please describe your response in at least 10 characters',
  }),
})

/** PATCH /api/applications/:no/allot */
export const allotApplicationSchema = Joi.object({
  officerId: Joi.string().trim().required().messages({
    'string.empty': 'Select the officer or test centre to allot to',
  }),
  scheduledOn: Joi.date().iso().optional().allow(null),
})

/** PATCH /api/applications/:no/query */
export const raiseQuerySchema = Joi.object({
  queryText: Joi.string().trim().min(10).max(2000).required().messages({
    'string.min': 'A query must be at least 10 characters so the applicant knows what to fix',
  }),
})

/**
 * PATCH /api/applications/:no/status
 *
 * CERTIFIED is excluded: a certificate is issued by POST /api/certificates/issue,
 * which does the stamping checks and allocates the certificate number. Allowing
 * the status to be set directly would bypass all of it.
 */
export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...APPLICATION_STATUS_CODES.filter((s) => s !== 'CERTIFIED'))
    .required(),
  reason: Joi.string().trim().max(2000).optional().allow('', null),
})

/** POST /api/verifications — an officer records the result of an inspection. */
export const recordVerificationSchema = Joi.object({
  applicationNo: Joi.string().trim().required(),
  inspectionDate: Joi.date().iso().required().messages({
    'any.required': 'Inspection date is required',
  }),
  premisesFound: Joi.string().trim().max(500).optional().allow('', null),

  // The standard weights used must themselves be in date, or the whole
  // verification is worthless — Rule 12.
  standardId: Joi.string().trim().max(100).optional().allow('', null),
  standardCertNo: Joi.string().trim().max(100).optional().allow('', null),
  standardValidUpto: Joi.date().iso().optional().allow(null),

  zeroError: Joi.string().trim().max(100).optional().allow('', null),
  repeatability: Joi.string().trim().max(100).optional().allow('', null),
  eccentricity: Joi.string().trim().max(100).optional().allow('', null),
  linearity: Joi.string().trim().max(100).optional().allow('', null),
  maxPermissibleError: Joi.string().trim().max(100).optional().allow('', null),
  observedError: Joi.string().trim().max(100).optional().allow('', null),
  observations: Joi.string().trim().max(4000).optional().allow('', null),

  result: Joi.string()
    .valid(...VERIFICATION_RESULT_CODES)
    .required()
    .messages({ 'any.only': 'Select the verification result' }),

  stampNo: Joi.string().trim().max(100).optional().allow('', null),
  sealDetails: Joi.string().trim().max(500).optional().allow('', null),
  adjustmentMade: Joi.string().trim().max(1000).optional().allow('', null),
  rejectionGround: Joi.string().trim().max(1000).optional().allow('', null),
})
