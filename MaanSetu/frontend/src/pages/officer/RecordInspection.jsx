import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Save, ShieldCheck, XCircle } from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import { LMO_NAV } from './LMODashboard'
import { useAuth } from '../../context/AuthContext'
import { SelectField, TextAreaField, TextField } from '../../components/common/FormField'
import {
  MOCK_LMO_QUEUE,
  formatDate,
} from '../../services/mockData'
import {
  VERIFICATION_RESULT,
  VERIFICATION_RESULT_LABELS,
} from '../../constants/legalMetrology'

/**
 * Field inspection recording.
 *
 * Structure follows the observation sheet prescribed for verification under the
 * Legal Metrology (General) Rules, 2011: identification of the instrument,
 * the working standards used (Rule 8 — standards must themselves be traceable
 * and in-date), the tests actually performed, and the resulting decision on
 * whether to stamp under Rule 12.
 *
 * The working-standard fields are not optional decoration: a verification
 * carried out with an out-of-calibration standard is invalid, so the standard's
 * own certificate number and validity are recorded alongside the result.
 */
export default function RecordInspection() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    applicationId: '',
    inspectionDate: new Date().toISOString().slice(0, 10),
    premisesFound: '',
    // Working standards used (Rule 8)
    standardId: '',
    standardCertNo: '',
    standardValidUpto: '',
    // Tests performed
    zeroError: '',
    repeatability: '',
    eccentricity: '',
    linearity: '',
    maxPermissibleError: '',
    observedError: '',
    // Outcome
    result: '',
    stampNo: '',
    sealDetails: '',
    observations: '',
    adjustmentMade: '',
    rejectionGround: '',
  })

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setSaved(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    // Real implementation: POST /api/verifications with the officer's digital
    // signature. The server must reject any attempt to record a result against
    // an application not allotted to this officer.
    setSaved(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selected = MOCK_LMO_QUEUE.find((q) => q.id === form.applicationId)
  const isFail = form.result === VERIFICATION_RESULT.FAIL
  const isAdjusted = form.result === VERIFICATION_RESULT.PASS_WITH_ADJUSTMENT

  return (
    <PortalLayout title="LMO Portal" subtitle={user?.jurisdiction} nav={LMO_NAV}>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Record Verification</h1>
        <p className="mt-1 text-sm text-slate-600">
          Observation sheet for verification and stamping under the Legal Metrology
          (General) Rules, 2011.
        </p>
      </div>

      {saved && (
        <div
          className="mb-5 flex gap-3 rounded border-l-4 border-gov-green bg-green-50 p-4"
          role="status"
        >
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0 text-green-700"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-bold text-green-900">
              Observation sheet recorded
            </p>
            <p className="mt-0.5 text-xs text-green-800">
              In the live system this entry is signed with your digital signature
              certificate and locked against further edits. A digital verification
              certificate with QR code is generated automatically where the result is
              a pass.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Application selection */}
        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gov-blue">
            1. Application under Verification
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Application Number"
              name="applicationId"
              value={form.applicationId}
              onChange={set('applicationId')}
              required
              hint="Only applications allotted to you are listed"
              options={MOCK_LMO_QUEUE.map((q) => ({
                value: q.id,
                label: `${q.id} — ${q.applicant}`,
              }))}
            />
            <TextField
              label="Date of Verification"
              name="inspectionDate"
              type="date"
              value={form.inspectionDate}
              onChange={set('inspectionDate')}
              required
            />
          </div>

          {selected && (
            <dl className="mt-4 grid gap-x-6 gap-y-2 rounded bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <Row label="Instrument" value={selected.instrumentLabel} />
              <Row label="Applicant" value={selected.applicant} />
              <Row label="Premises" value={selected.premises} />
              <Row label="Scheduled On" value={formatDate(selected.scheduledOn)} />
            </dl>
          )}

          <div className="mt-4">
            <TextField
              label="Premises Verified At"
              name="premisesFound"
              value={form.premisesFound}
              onChange={set('premisesFound')}
              required
              placeholder="Address where the instrument was actually inspected"
              hint="If it differs from the declared premises, record the actual location"
            />
          </div>
        </section>

        {/* Working standards — Rule 8 */}
        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
            2. Working Standards Used
          </h2>
          <p className="mt-1 mb-4 text-xs text-slate-600">
            Verification must be carried out with working standards that are themselves
            verified and within validity. Recording the standard&apos;s certificate
            makes the traceability chain auditable.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="Standard Identification"
              name="standardId"
              value={form.standardId}
              onChange={set('standardId')}
              required
              placeholder="e.g. WS/UP/KNR/M1/0042"
            />
            <TextField
              label="Standard Certificate No."
              name="standardCertNo"
              value={form.standardCertNo}
              onChange={set('standardCertNo')}
              required
              placeholder="Certificate of the working standard"
            />
            <TextField
              label="Standard Valid Upto"
              name="standardValidUpto"
              type="date"
              value={form.standardValidUpto}
              onChange={set('standardValidUpto')}
              required
            />
          </div>
        </section>

        {/* Tests performed */}
        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
            3. Tests and Observations
          </h2>
          <p className="mt-1 mb-4 text-xs text-slate-600">
            Enter observed values. Applicable tests vary by instrument category;
            record &quot;NA&quot; where a test does not apply.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              label="Zero / No-load Error"
              name="zeroError"
              value={form.zeroError}
              onChange={set('zeroError')}
              placeholder="e.g. 0 g"
            />
            <TextField
              label="Repeatability Test"
              name="repeatability"
              value={form.repeatability}
              onChange={set('repeatability')}
              placeholder="e.g. Within limits over 3 runs"
            />
            <TextField
              label="Eccentricity / Off-centre Load"
              name="eccentricity"
              value={form.eccentricity}
              onChange={set('eccentricity')}
              placeholder="e.g. 20 g at corner load"
            />
            <TextField
              label="Linearity / Span Test"
              name="linearity"
              value={form.linearity}
              onChange={set('linearity')}
              placeholder="e.g. Satisfactory at 25/50/75/100%"
            />
            <TextField
              label="Maximum Permissible Error"
              name="maxPermissibleError"
              value={form.maxPermissibleError}
              onChange={set('maxPermissibleError')}
              required
              placeholder="e.g. ±50 g"
              hint="As prescribed for the accuracy class"
            />
            <TextField
              label="Observed Error"
              name="observedError"
              value={form.observedError}
              onChange={set('observedError')}
              required
              placeholder="e.g. +20 g"
            />
          </div>

          <div className="mt-4">
            <TextAreaField
              label="Detailed Observations"
              name="observations"
              value={form.observations}
              onChange={set('observations')}
              rows={4}
              placeholder="Condition of the instrument, legibility of nameplate, condition of existing seals, any deficiency noticed"
            />
          </div>

          <div className="mt-4 rounded border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">
              Photographic Evidence
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Attach photographs of the instrument, its nameplate, and the applied
              seal. In the mobile field app these are captured directly from the
              camera and GPS-tagged at the point of inspection.
            </p>
            <input
              type="file"
              multiple
              accept="image/*"
              className="mt-3 block w-full text-xs text-slate-600
                         file:mr-3 file:rounded file:border-0 file:bg-gov-blue
                         file:px-3 file:py-1.5 file:text-xs file:font-semibold
                         file:text-white hover:file:bg-blue-900"
              aria-label="Attach photographs of the inspection"
            />
          </div>
        </section>

        {/* Result — Rule 12 */}
        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
            4. Verification Result
          </h2>
          <p className="mt-1 mb-4 text-xs text-slate-600">
            An instrument may be stamped only where it conforms to the prescribed
            limits. Where it does not, it must be rejected and must not be used for
            trade until re-verified.
          </p>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Decision <span className="text-red-600">*</span>
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {Object.values(VERIFICATION_RESULT).map((r) => {
                const active = form.result === r
                const isReject = r === VERIFICATION_RESULT.FAIL
                return (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-start gap-2 rounded border p-3 text-sm
                                transition-colors ${
                                  active
                                    ? isReject
                                      ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
                                      : 'border-gov-green bg-green-50 ring-1 ring-gov-green'
                                    : 'border-slate-300 hover:bg-slate-50'
                                }`}
                  >
                    <input
                      type="radio"
                      name="result"
                      value={r}
                      checked={active}
                      onChange={set('result')}
                      required
                      className="mt-0.5"
                    />
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      {isReject ? (
                        <XCircle size={14} className="text-red-600" aria-hidden="true" />
                      ) : (
                        <ShieldCheck size={14} className="text-green-700" aria-hidden="true" />
                      )}
                      {VERIFICATION_RESULT_LABELS[r]}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {isAdjusted && (
            <div className="mt-4">
              <TextAreaField
                label="Adjustment Carried Out"
                name="adjustmentMade"
                value={form.adjustmentMade}
                onChange={set('adjustmentMade')}
                required
                rows={2}
                placeholder="Nature of the adjustment made before the instrument was found conforming"
              />
            </div>
          )}

          {isFail ? (
            <div className="mt-4">
              <TextAreaField
                label="Ground for Rejection"
                name="rejectionGround"
                value={form.rejectionGround}
                onChange={set('rejectionGround')}
                required
                rows={3}
                placeholder="Specific reason the instrument does not conform, with reference to the limit exceeded"
              />
              <div
                className="mt-3 flex gap-2 rounded border-l-4 border-red-600 bg-red-50 p-3"
                role="alert"
              >
                <AlertTriangle
                  size={16}
                  className="mt-0.5 shrink-0 text-red-700"
                  aria-hidden="true"
                />
                <p className="text-xs text-red-900">
                  On rejection no stamp is applied and no certificate is issued. The
                  applicant is notified that the instrument may not be used for trade
                  or protection until it is re-verified and stamped.
                </p>
              </div>
            </div>
          ) : (
            form.result && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Verification Stamp Number"
                  name="stampNo"
                  value={form.stampNo}
                  onChange={set('stampNo')}
                  required
                  placeholder="e.g. UP-KNR-2026-4417"
                />
                <TextField
                  label="Seal / Stamping Details"
                  name="sealDetails"
                  value={form.sealDetails}
                  onChange={set('sealDetails')}
                  required
                  placeholder="Location and nature of the seal applied"
                />
              </div>
            )
          )}
        </section>

        {/* Declaration */}
        <section className="rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gov-blue">
            5. Officer Declaration
          </h2>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" required className="mt-1" />
            <span>
              I certify that I have personally verified the instrument described above
              using the working standards recorded, that the observations are true, and
              that the result reflects the actual condition of the instrument. I
              understand this record is signed with my digital signature certificate
              and forms part of the statutory verification record.
            </span>
          </label>
          <p className="mt-3 text-xs text-slate-500">
            Recorded by {user?.name} ({user?.id}) &middot; {user?.jurisdiction}
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded bg-gov-blue px-5 py-2.5
                       text-sm font-semibold text-white hover:bg-blue-900
                       focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2"
          >
            <Save size={16} aria-hidden="true" />
            Sign and Submit Observation Sheet
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-5 py-2.5 text-sm
                       font-medium text-slate-700 hover:bg-slate-50
                       focus:outline-none focus:ring-2 focus:ring-gov-blue"
          >
            Save Draft (Offline)
          </button>
        </div>
      </form>
    </PortalLayout>
  )
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  )
}
