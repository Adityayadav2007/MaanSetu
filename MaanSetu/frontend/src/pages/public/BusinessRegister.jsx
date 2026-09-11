import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import PublicLayout from '../../components/layout/PublicLayout'
import { TextField, SelectField, TextAreaField, FormSection } from '../../components/common/FormField'
import Captcha from '../../components/common/Captcha'
import {
  BUSINESS_TYPES,
  STATES,
  TRADE_CATEGORIES,
} from '../../constants/legalMetrology'

/**
 * Stakeholder registration for instrument users (businesses and traders).
 *
 * Field set follows the particulars an applicant must furnish under the Legal
 * Metrology (General) Rules, 2011 — applicant identity, nature of trade, and
 * the premises where notified instruments are kept for use in transaction.
 */

const INITIAL = {
  businessName: '',
  businessType: '',
  tradeCategory: '',
  gstin: '',
  panNo: '',
  contactPerson: '',
  designation: '',
  mobile: '',
  email: '',
  premisesAddress: '',
  state: '',
  district: '',
  pincode: '',
  password: '',
  confirmPassword: '',
}

export default function BusinessRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [captcha, setCaptcha] = useState({ answer: '', expected: '' })
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)

  function update(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
  }

  /**
   * Client-side validation is a convenience for the user, not a trust boundary.
   * Every rule below must be re-applied server-side — a request can be crafted
   * that never touches this form.
   */
  function validate() {
    const e = {}

    if (!form.businessName.trim()) e.businessName = 'Enter the registered name of the business.'
    if (!form.businessType) e.businessType = 'Select the constitution of the business.'
    if (!form.tradeCategory) e.tradeCategory = 'Select the nature of trade.'

    if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(form.gstin.toUpperCase())) {
      e.gstin = 'GSTIN must be 15 characters in the standard format.'
    }
    if (!form.panNo.trim()) {
      e.panNo = 'PAN is required.'
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNo.toUpperCase())) {
      e.panNo = 'PAN must be in the format ABCDE1234F.'
    }

    if (!form.contactPerson.trim()) e.contactPerson = 'Enter the name of the authorised person.'
    if (!/^[6-9][0-9]{9}$/.test(form.mobile)) e.mobile = 'Enter a valid 10-digit Indian mobile number.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) e.email = 'Enter a valid email address.'

    if (!form.premisesAddress.trim()) e.premisesAddress = 'Enter the address where instruments are used.'
    if (!form.state) e.state = 'Select the State or Union Territory.'
    if (!form.district.trim()) e.district = 'Enter the district.'
    if (!/^[1-9][0-9]{5}$/.test(form.pincode)) e.pincode = 'Enter a valid 6-digit PIN code.'

    // Password policy mirrors what the backend must enforce. Length is the
    // dominant factor in resisting offline cracking, so 12 is the floor.
    if (form.password.length < 12) {
      e.password = 'Password must be at least 12 characters long.'
    } else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) ||
               !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) {
      e.password = 'Include upper and lower case letters, a digit and a special character.'
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'The two passwords do not match.'
    }

    if (String(captcha.answer).trim() !== String(captcha.expected).trim()) {
      e.captcha = 'The captcha answer is incorrect.'
    }
    if (!consent) e.consent = 'You must accept the declaration to register.'

    return e
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Move focus to the summary so screen-reader users hear the failure.
      document.getElementById('reg-error-summary')?.focus()
      return
    }

    setSubmitting(true)
    try {
      // Placeholder for POST /api/auth/register/business.
      await new Promise((r) => setTimeout(r, 900))
      setDone({
        registrationNo: `BUS-${new Date().getFullYear()}-${String(
          Math.floor(Math.random() * 900000) + 100000,
        )}`,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded border border-green-300 bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto text-gov-green" size={52} aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Registration Submitted
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Your application for stakeholder registration has been received.
            </p>

            <dl className="mt-6 rounded border border-slate-200 bg-slate-50 p-4 text-left text-sm">
              <div className="flex justify-between gap-4 py-1">
                <dt className="text-slate-600">Registration Number</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {done.registrationNo}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <dt className="text-slate-600">Status</dt>
                <dd className="font-semibold text-amber-700">Pending Verification</dd>
              </div>
            </dl>

            <p className="mt-5 text-sm text-slate-600">
              A verification link has been sent to{' '}
              <strong className="text-slate-900">{form.email}</strong> and an OTP
              to your registered mobile number. Your account will be activated by
              the Legal Metrology Department after the particulars furnished are
              scrutinised. You will be notified on both channels.
            </p>

            <p className="mt-3 rounded bg-amber-50 p-3 text-xs text-amber-900">
              Please retain your registration number. It will be required for all
              correspondence and for applying for verification of instruments.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded bg-gov-blue px-6 py-2.5 text-sm font-semibold text-white
                           hover:bg-blue-900 focus:outline-none focus:ring-2
                           focus:ring-gov-blue focus:ring-offset-2"
              >
                Proceed to Login
              </button>
              <Link
                to="/"
                className="rounded border border-slate-300 px-6 py-2.5 text-sm
                           font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    )
  }

  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-4 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-1.5">/</span>
          <Link to="/login" className="hover:underline">Business Login</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Register</span>
        </nav>

        <h1 className="text-2xl font-bold text-gov-blue">
          Stakeholder Registration — Instrument User
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
          For businesses, traders and establishments that keep weighing or
          measuring instruments for use in transaction or protection. Registration
          is required before applying for verification under the Legal Metrology
          Act, 2009.
        </p>

        <div className="mt-4 flex items-start gap-2.5 rounded border-l-4 border-gov-blue bg-blue-50 p-3.5 text-xs text-blue-900">
          <ShieldCheck className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
          <p>
            Furnishing false particulars is an offence. All information is
            subject to verification by the Department, and the premises may be
            inspected.
          </p>
        </div>

        {hasErrors && (
          <div
            id="reg-error-summary"
            tabIndex={-1}
            role="alert"
            className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
              <AlertTriangle size={16} aria-hidden="true" />
              Please correct the highlighted fields before submitting.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 space-y-7 rounded border border-slate-200 bg-white p-6 shadow-sm"
        >
          <FormSection
            title="Particulars of the Business"
            description="As per the registration certificate of the establishment."
          >
            <TextField
              label="Name of Business / Establishment"
              name="businessName"
              value={form.businessName}
              onChange={update}
              error={errors.businessName}
              required
              autoComplete="organization"
            />
            <SelectField
              label="Constitution of Business"
              name="businessType"
              value={form.businessType}
              onChange={update}
              error={errors.businessType}
              required
              options={BUSINESS_TYPES.map((b) => ({ value: b.code, label: b.name }))}
            />
            <SelectField
              label="Nature of Trade"
              name="tradeCategory"
              value={form.tradeCategory}
              onChange={update}
              error={errors.tradeCategory}
              required
              options={TRADE_CATEGORIES}
            />
            <TextField
              label="GSTIN"
              name="gstin"
              value={form.gstin}
              onChange={update}
              error={errors.gstin}
              hint="Optional if the business is not registered under GST."
              maxLength={15}
              placeholder="09AABCR1234K1Z5"
            />
            <TextField
              label="PAN"
              name="panNo"
              value={form.panNo}
              onChange={update}
              error={errors.panNo}
              required
              maxLength={10}
              placeholder="ABCDE1234F"
            />
          </FormSection>

          <FormSection
            title="Authorised Person"
            description="The person responsible for compliance and correspondence."
          >
            <TextField
              label="Full Name"
              name="contactPerson"
              value={form.contactPerson}
              onChange={update}
              error={errors.contactPerson}
              required
              autoComplete="name"
            />
            <TextField
              label="Designation"
              name="designation"
              value={form.designation}
              onChange={update}
              placeholder="Proprietor / Partner / Director"
            />
            <TextField
              label="Mobile Number"
              name="mobile"
              type="tel"
              value={form.mobile}
              onChange={update}
              error={errors.mobile}
              required
              maxLength={10}
              hint="Used for OTP and verification alerts."
              autoComplete="tel"
            />
            <TextField
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              error={errors.email}
              required
              autoComplete="email"
            />
          </FormSection>

          <FormSection
            title="Premises where Instruments are Used"
            description="The place of business at which notified instruments are kept for use in transaction."
          >
            <div className="sm:col-span-2">
              <TextAreaField
                label="Address of Premises"
                name="premisesAddress"
                value={form.premisesAddress}
                onChange={update}
                error={errors.premisesAddress}
                required
                rows={2}
              />
            </div>
            <SelectField
              label="State / Union Territory"
              name="state"
              value={form.state}
              onChange={update}
              error={errors.state}
              required
              options={STATES}
              hint="Determines the Legal Metrology jurisdiction."
            />
            <TextField
              label="District"
              name="district"
              value={form.district}
              onChange={update}
              error={errors.district}
              required
            />
            <TextField
              label="PIN Code"
              name="pincode"
              value={form.pincode}
              onChange={update}
              error={errors.pincode}
              required
              maxLength={6}
              autoComplete="postal-code"
            />
          </FormSection>

          <FormSection
            title="Login Credentials"
            description="Used to sign in to your dashboard."
          >
            <TextField
              label="Create Password"
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              error={errors.password}
              required
              hint="At least 12 characters, with upper and lower case, a digit and a special character."
              autoComplete="new-password"
            />
            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={update}
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
            />
          </FormSection>

          <div className="border-t border-slate-200 pt-5">
            <Captcha
              value={captcha.answer}
              onChange={setCaptcha}
              error={errors.captcha}
            />

            <div className="mt-5">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  aria-invalid={errors.consent ? 'true' : undefined}
                  aria-describedby={errors.consent ? 'consent-error' : undefined}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-400
                             text-gov-blue focus:ring-gov-blue"
                />
                <span>
                  I declare that the particulars furnished above are true and
                  correct to the best of my knowledge, and I consent to their
                  verification by the Legal Metrology Department. I understand
                  that furnishing false information attracts penalty under the
                  Legal Metrology Act, 2009.
                </span>
              </label>
              {errors.consent && (
                <p id="consent-error" className="mt-1 text-xs font-medium text-red-700" role="alert">
                  {errors.consent}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-gov-blue px-8 py-2.5 text-sm font-semibold text-white
                         hover:bg-blue-900 focus:outline-none focus:ring-2
                         focus:ring-gov-blue focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit Registration'}
            </button>
            <Link
              to="/login"
              className="rounded border border-slate-300 px-8 py-2.5 text-center text-sm
                         font-semibold text-slate-700 hover:bg-slate-50"
            >
              Already registered? Sign in
            </Link>
          </div>
        </form>
      </div>
    </PublicLayout>
  )
}
