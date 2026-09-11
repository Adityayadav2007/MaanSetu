import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, CheckCircle2, Info } from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import { BUSINESS_NAV } from './BusinessDashboard'
import { TextField, SelectField, TextAreaField, FormSection } from '../../components/common/FormField'
import {
  INSTRUMENT_CATEGORIES, ACCURACY_CLASSES, DOCUMENT_TYPES, STATES,
  getCategoryByCode,
} from '../../constants/legalMetrology'

/**
 * Instrument registration.
 *
 * Field set follows the particulars required for an application for
 * verification under the Legal Metrology (General) Rules, 2011 — identification
 * of the instrument (make, model, serial number), its metrological
 * characteristics (capacity, accuracy class, least count / verification scale
 * interval), the premises where it is used, and the model approval reference.
 */

const EMPTY = {
  category: '',
  make: '',
  model: '',
  serialNo: '',
  yearOfManufacture: '',
  capacity: '',
  unit: '',
  accuracyClass: '',
  leastCount: '',
  modelApprovalNo: '',
  premisesName: '',
  premisesAddress: '',
  premisesState: '',
  premisesDistrict: '',
  premisesPincode: '',
  usageType: '',
  remarks: '',
}

const USAGE_TYPES = [
  { value: 'TRADE', label: 'Use in trade or commerce' },
  { value: 'PROTECTION', label: 'Use for protection (health, safety, environment)' },
  { value: 'INDUSTRIAL', label: 'Industrial process control' },
  { value: 'GOVT', label: 'Government / statutory purpose' },
]

export default function InstrumentRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [docs, setDocs] = useState([])
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(null)

  const category = getCategoryByCode(form.category)

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
    }
  }

  function addDocs(e) {
    const picked = Array.from(e.target.files || [])
    // Client-side checks are UX only. The server must independently validate
    // MIME type, magic bytes and size, and scan for malware before storing.
    const accepted = picked.filter(
      (f) => f.size <= 5 * 1024 * 1024 &&
        ['image/jpeg', 'image/png', 'application/pdf'].includes(f.type),
    )
    const rejected = picked.length - accepted.length
    setDocs((d) => [
      ...d,
      ...accepted.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}`,
        name: f.name,
        size: f.size,
        type: 'OTHER',
      })),
    ])
    if (rejected > 0) {
      setErrors((p) => ({
        ...p,
        docs: `${rejected} file(s) skipped. Only JPG, PNG or PDF up to 5 MB are accepted.`,
      }))
    }
    e.target.value = ''
  }

  function setDocType(id, type) {
    setDocs((d) => d.map((doc) => (doc.id === id ? { ...doc, type } : doc)))
  }

  function removeDoc(id) {
    setDocs((d) => d.filter((doc) => doc.id !== id))
  }

  function validate() {
    const e = {}
    const required = [
      'category', 'make', 'model', 'serialNo', 'capacity',
      'premisesAddress', 'premisesState', 'premisesDistrict', 'usageType',
    ]
    required.forEach((f) => {
      if (!String(form[f]).trim()) e[f] = 'This field is required.'
    })

    if (form.premisesPincode && !/^[1-9][0-9]{5}$/.test(form.premisesPincode)) {
      e.premisesPincode = 'Enter a valid 6-digit PIN code.'
    }
    if (form.yearOfManufacture) {
      const y = Number(form.yearOfManufacture)
      const now = new Date().getFullYear()
      if (!Number.isInteger(y) || y < 1950 || y > now) {
        e.yearOfManufacture = `Enter a year between 1950 and ${now}.`
      }
    }

    // Rule 10 — mandatory accompanying documents.
    const requiredDocCodes = DOCUMENT_TYPES.filter((d) => d.required).map((d) => d.code)
    const provided = new Set(docs.map((d) => d.type))
    const missing = requiredDocCodes.filter((c) => !provided.has(c))
    if (missing.length > 0) {
      const names = missing
        .map((c) => DOCUMENT_TYPES.find((d) => d.code === c).name)
        .join(', ')
      e.docs = `Please attach and classify the mandatory documents: ${names}.`
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    // Mock persistence — replace with POST /api/instruments.
    const id = `INS-UP-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 900000) + 100000,
    )}`
    setSubmitted(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (submitted) {
    return (
      <PortalLayout title="Business Portal" nav={BUSINESS_NAV}>
        <div className="mx-auto max-w-xl rounded border border-green-300 bg-green-50 p-8 text-center">
          <CheckCircle2 className="mx-auto text-green-600" size={44} aria-hidden="true" />
          <h1 className="mt-4 text-lg font-bold text-green-900">
            Instrument Registered
          </h1>
          <p className="mt-2 text-sm text-green-800">
            Your instrument has been added to the register with identification
            number:
          </p>
          <p className="mt-2 font-mono text-base font-bold text-green-900">
            {submitted}
          </p>
          <p className="mt-4 text-xs text-green-800">
            Registration alone does not authorise use in trade. You must now
            apply for verification and the instrument must be verified and
            stamped before being put into use.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/business/applications/new')}
              className="rounded bg-gov-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
            >
              Apply for Verification Now
            </button>
            <button
              type="button"
              onClick={() => navigate('/business/instruments')}
              className="rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to Instruments
            </button>
          </div>
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout title="Business Portal" nav={BUSINESS_NAV}>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Register New Instrument</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the particulars of the weighing or measuring instrument. Fields
          marked <span className="text-red-600">*</span> are mandatory.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="rounded border border-slate-200 bg-white p-6">
        <div className="space-y-7">
          <FormSection
            title="Instrument Identification"
            description="Details as engraved or displayed on the instrument nameplate."
          >
            <SelectField
              label="Instrument Category"
              name="category"
              value={form.category}
              onChange={set('category')}
              options={INSTRUMENT_CATEGORIES.map((c) => ({ value: c.code, label: c.name }))}
              required
              error={errors.category}
            />
            <TextField
              label="Make / Manufacturer"
              name="make"
              value={form.make}
              onChange={set('make')}
              required
              error={errors.make}
              placeholder="e.g. Avery India"
            />
            <TextField
              label="Model"
              name="model"
              value={form.model}
              onChange={set('model')}
              required
              error={errors.model}
              placeholder="e.g. AV-300E"
            />
            <TextField
              label="Serial Number"
              name="serialNo"
              value={form.serialNo}
              onChange={set('serialNo')}
              required
              error={errors.serialNo}
              hint="As marked on the instrument. Must be unique."
            />
            <TextField
              label="Year of Manufacture"
              name="yearOfManufacture"
              type="number"
              value={form.yearOfManufacture}
              onChange={set('yearOfManufacture')}
              error={errors.yearOfManufacture}
              placeholder="e.g. 2024"
            />
            <TextField
              label="Model Approval Certificate No."
              name="modelApprovalNo"
              value={form.modelApprovalNo}
              onChange={set('modelApprovalNo')}
              error={errors.modelApprovalNo}
              hint="Issued by the Director, Legal Metrology, Government of India."
            />
          </FormSection>

          {category && (
            <p className="flex items-start gap-2 rounded bg-blue-50 p-3 text-xs text-blue-900">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                <strong>{category.name}</strong> — {category.examples}. Typical
                re-verification periodicity is{' '}
                <strong>{category.defaultValidityMonths} months</strong>, subject
                to the periodicity notified by your State Government under
                Rule 6.
              </span>
            </p>
          )}

          <FormSection
            title="Metrological Characteristics"
            description="Capacity and accuracy determine the applicable maximum permissible error."
          >
            <TextField
              label="Maximum Capacity"
              name="capacity"
              value={form.capacity}
              onChange={set('capacity')}
              required
              error={errors.capacity}
              placeholder="e.g. 300 kg / 60 tonne / 40 L per minute"
            />
            <SelectField
              label="Accuracy Class"
              name="accuracyClass"
              value={form.accuracyClass}
              onChange={set('accuracyClass')}
              options={ACCURACY_CLASSES.map((a) => ({ value: a.code, label: a.name }))}
              error={errors.accuracyClass}
              hint="Applicable to weighing instruments (OIML R76)."
            />
            <TextField
              label="Least Count / Verification Scale Interval (e)"
              name="leastCount"
              value={form.leastCount}
              onChange={set('leastCount')}
              error={errors.leastCount}
              placeholder="e.g. 50 g"
            />
            <SelectField
              label="Purpose of Use"
              name="usageType"
              value={form.usageType}
              onChange={set('usageType')}
              options={USAGE_TYPES}
              required
              error={errors.usageType}
              hint="Instruments used in trade or for protection require verification."
            />
          </FormSection>

          <FormSection
            title="Location of Instrument"
            description="The premises where the instrument is installed and used."
          >
            <TextField
              label="Premises / Establishment Name"
              name="premisesName"
              value={form.premisesName}
              onChange={set('premisesName')}
              error={errors.premisesName}
            />
            <TextField
              label="PIN Code"
              name="premisesPincode"
              value={form.premisesPincode}
              onChange={set('premisesPincode')}
              maxLength={6}
              error={errors.premisesPincode}
            />
            <div className="sm:col-span-2">
              <TextAreaField
                label="Full Address"
                name="premisesAddress"
                value={form.premisesAddress}
                onChange={set('premisesAddress')}
                required
                rows={2}
                error={errors.premisesAddress}
              />
            </div>
            <SelectField
              label="State / UT"
              name="premisesState"
              value={form.premisesState}
              onChange={set('premisesState')}
              options={STATES}
              required
              error={errors.premisesState}
            />
            <TextField
              label="District"
              name="premisesDistrict"
              value={form.premisesDistrict}
              onChange={set('premisesDistrict')}
              required
              error={errors.premisesDistrict}
            />
          </FormSection>

          {/* Documents */}
          <fieldset className="border-t border-slate-200 pt-5">
            <legend className="sr-only">Supporting documents</legend>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
              Supporting Documents
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Attach the documents required under the Legal Metrology (General)
              Rules, 2011. Accepted formats: JPG, PNG, PDF — up to 5 MB each.
            </p>

            <ul className="mt-3 grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
              {DOCUMENT_TYPES.filter((d) => d.required).map((d) => (
                <li key={d.code} className="flex items-center gap-1.5">
                  <span className="text-red-600" aria-hidden="true">*</span>
                  {d.name}
                </li>
              ))}
            </ul>

            <label
              className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2
                         rounded border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-7
                         text-center hover:border-gov-blue hover:bg-blue-50"
            >
              <Upload size={22} className="text-slate-400" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-700">
                Choose files to attach
              </span>
              <span className="text-xs text-slate-500">
                Then classify each file using the dropdown beside it
              </span>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={addDocs}
                className="sr-only"
              />
            </label>

            {docs.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 rounded border border-slate-200">
                {docs.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                      {d.name}
                      <span className="ml-2 text-xs text-slate-500">
                        {(d.size / 1024).toFixed(0)} KB
                      </span>
                    </span>
                    <label className="text-xs">
                      <span className="sr-only">Document type for {d.name}</span>
                      <select
                        value={d.type}
                        onChange={(e) => setDocType(d.id, e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1.5 text-xs
                                   focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
                      >
                        {DOCUMENT_TYPES.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.required ? '* ' : ''}{t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeDoc(d.id)}
                      className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove ${d.name}`}
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {errors.docs && (
              <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                {errors.docs}
              </p>
            )}
          </fieldset>

          <div className="border-t border-slate-200 pt-5">
            <TextAreaField
              label="Remarks (optional)"
              name="remarks"
              value={form.remarks}
              onChange={set('remarks')}
              rows={2}
              maxLength={500}
            />
          </div>

          <p className="rounded bg-slate-50 p-3 text-xs text-slate-600">
            <strong>Declaration:</strong> I declare that the particulars furnished
            above are true to the best of my knowledge. I understand that
            furnishing false information is punishable under the Legal Metrology
            Act, 2009, and that the instrument shall not be used in trade until
            it has been verified and stamped.
          </p>

          <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            <button
              type="submit"
              className="rounded bg-gov-blue px-5 py-2.5 text-sm font-semibold text-white
                         hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2"
            >
              Register Instrument
            </button>
            <button
              type="button"
              onClick={() => navigate('/business/instruments')}
              className="rounded border border-slate-300 px-5 py-2.5 text-sm font-semibold
                         text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </PortalLayout>
  )
}
