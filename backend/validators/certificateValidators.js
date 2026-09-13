import Joi from 'joi'

/** POST /api/certificates/issue */
export const issueCertificateSchema = Joi.object({
  applicationNo: Joi.string().trim().required().messages({
    'string.empty': 'Application number is required',
  }),
  // Optional: defaults to the category's statutory periodicity under Rule 6.
  validityMonths: Joi.number().integer().min(1).max(120).optional().allow(null),
})

/** PATCH /api/certificates/:certificateNo/revoke */
export const revokeCertificateSchema = Joi.object({
  reason: Joi.string().trim().min(10).max(2000).required().messages({
    'string.min': 'A revocation reason of at least 10 characters is required for the audit record',
    'string.empty': 'A revocation reason is required',
  }),
})

/** POST /api/admin/enforcement */
export const recordEnforcementSchema = Joi.object({
  district: Joi.string().trim().required(),
  premises: Joi.string().trim().min(3).required(),
  violation: Joi.string().trim().min(3).required(),
  actionTaken: Joi.string().trim().min(3).required(),
  penalty: Joi.number().min(0).optional().allow(null),
  officerCode: Joi.string().trim().max(50).optional().allow('', null),
})
