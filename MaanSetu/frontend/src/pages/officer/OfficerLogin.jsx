import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, AlertCircle, Scale, FlaskConical, Settings, Lock } from 'lucide-react'
import GovHeader from '../../components/common/GovHeader'
import GovFooter from '../../components/common/GovFooter'
import { TextField, SelectField } from '../../components/common/FormField'
import Captcha from '../../components/common/Captcha'
import { useAuth } from '../../context/AuthContext'
import { ROLES, ROLE_HOME, STATES } from '../../constants/legalMetrology'

/**
 * Portal 2 — Officer login, with three sub-logins.
 *
 *   LMO   — State Legal Metrology Officer (field verification & stamping)
 *   GATC  — Government Approved Test Centre (notified laboratory branch)
 *   ADMIN — Department Administrator (oversight of all data and activity)
 *
 * Each sub-login collects different credentials because the three cadres are
 * identified differently in departmental records: an LMO by service ID and
 * jurisdiction, a GATC by its notification number, and an Admin by an official
 * departmental email.
 */

const OFFICER_TABS = [
  {
    role: ROLES.LMO,
    label: 'Legal Metrology Officer',
    short: 'LMO',
    icon: Scale,
    blurb:
      'State-appointed officers empowered under Section 14 of the Legal Metrology Act, 2009 to verify and stamp instruments.',
    idLabel: 'Officer Service ID',
    idPlaceholder: 'e.g. LMO-MH-2019-0447',
    idHint: 'The service identification number issued by your State Controller.',
    demo: { id: 'LMO-MH-2019-0447', password: 'Officer@1234' },
    needsJurisdiction: true,
  },
  {
    role: ROLES.GATC,
    label: 'Govt. Approved Test Centre',
    short: 'GATC',
    icon: FlaskConical,
    blurb:
      'Laboratories notified by the Government under Rule 21 of the Legal Metrology (General) Rules, 2011 to carry out verification.',
    idLabel: 'GATC Notification Number',
    idPlaceholder: 'e.g. GATC-KA-2021-018',
    idHint: 'The notification number under which your centre is approved.',
    demo: { id: 'GATC-KA-2021-018', password: 'Centre@1234' },
    needsJurisdiction: true,
  },
  {
    role: ROLES.ADMIN,
    label: 'Department Administrator',
    short: 'Admin',
    icon: Settings,
    blurb:
      'Departmental oversight of all registrations, verifications, certificates and enforcement activity across jurisdictions.',
    idLabel: 'Official Departmental Email',
    idPlaceholder: 'name@legalmetrology.gov.in',
    idHint: 'Only official gov.in / nic.in addresses are permitted.',
    demo: { id: 'controller@legalmetrology.gov.in', password: 'Admin@1234' },
    needsJurisdiction: false,
  },
]

export default function OfficerLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [activeRole, setActiveRole] = useState(ROLES.LMO)
  const [form, setForm] = useState({ identifier: '', password: '', jurisdiction: '' })
  const [captcha, setCaptcha] = useState({ answer: '', expected: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const tab = OFFICER_TABS.find((t) => t.role === activeRole)

  function switchTab(role) {
    setActiveRole(role)
    setForm({ identifier: '', password: '', jurisdiction: '' })
    setError('')
  }

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (tab.needsJurisdiction && !form.jurisdiction) {
      setError('Please select your State / Union Territory.')
      return
    }

    setSubmitting(true)
    try {
      await login({
        identifier: form.identifier,
        password: form.password,
        role: activeRole,
        captchaAnswer: captcha.answer,
        captchaExpected: captcha.expected,
      })
      navigate(ROLE_HOME[activeRole], { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <GovHeader showNav={false} />

      {/* Restricted-access banner distinguishes this portal from the public one */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 text-xs">
          <Lock size={14} aria-hidden="true" />
          <p>
            <strong>Restricted Access.</strong> This portal is for authorised
            departmental personnel only. All activity is logged and audited.
          </p>
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-600">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="font-medium text-slate-900">Officer Login</span>
          </nav>

          <div className="mb-6 text-center">
            <h1 className="flex items-center justify-center gap-2 text-xl font-bold text-gov-blue sm:text-2xl">
              <ShieldCheck size={26} aria-hidden="true" />
              Officer &amp; Administrator Portal
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Select your role to continue. Each role has distinct powers and a
              separate audit trail.
            </p>
          </div>

          <div className="overflow-hidden rounded border border-slate-300 bg-white shadow-sm">
            {/* Role tabs — the three sub-logins */}
            <div
              role="tablist"
              aria-label="Officer role"
              className="grid grid-cols-1 border-b border-slate-300 sm:grid-cols-3"
            >
              {OFFICER_TABS.map((t) => {
                const Icon = t.icon
                const selected = t.role === activeRole
                return (
                  <button
                    key={t.role}
                    role="tab"
                    type="button"
                    id={`tab-${t.role}`}
                    aria-selected={selected}
                    aria-controls={`panel-${t.role}`}
                    onClick={() => switchTab(t.role)}
                    className={[
                      'flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold',
                      'border-b-4 transition-colors focus:outline-none focus:ring-2',
                      'focus:ring-inset focus:ring-gov-blue',
                      selected
                        ? 'border-gov-orange bg-blue-50 text-gov-blue'
                        : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span className="hidden sm:inline">{t.short}</span>
                    <span className="sm:hidden">{t.label}</span>
                  </button>
                )
              })}
            </div>

            <div
              role="tabpanel"
              id={`panel-${activeRole}`}
              aria-labelledby={`tab-${activeRole}`}
              className="grid gap-0 md:grid-cols-5"
            >
              {/* Role description */}
              <div className="border-b border-slate-200 bg-slate-50 p-6 md:col-span-2 md:border-b-0 md:border-r">
                <h2 className="text-base font-bold text-gov-blue">{tab.label}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{tab.blurb}</p>

                <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Permitted Actions
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                  {activeRole === ROLES.LMO &&
                    [
                      'Conduct field verification and stamping',
                      'Record inspection observations and results',
                      'Approve or reject applications',
                      'Issue digital verification certificates',
                      'Initiate enforcement action',
                    ].map((x) => <li key={x}>&bull; {x}</li>)}
                  {activeRole === ROLES.GATC &&
                    [
                      'Accept allotted verification work',
                      'Record laboratory test observations',
                      'Upload calibration and test reports',
                      'Recommend certificate issuance',
                      'Manage centre capacity and schedule',
                    ].map((x) => <li key={x}>&bull; {x}</li>)}
                  {activeRole === ROLES.ADMIN &&
                    [
                      'Monitor all applications and pendency',
                      'Allot and reassign verification work',
                      'Manage officer and GATC accounts',
                      'Revoke or suspend certificates',
                      'Access audit logs and MIS reports',
                    ].map((x) => <li key={x}>&bull; {x}</li>)}
                </ul>

                <div className="mt-5 rounded border border-slate-300 bg-white px-3 py-2.5 text-[11px] text-slate-600">
                  <p className="font-semibold text-slate-700">Demonstration credentials</p>
                  <p className="mt-1 break-all font-mono">{tab.demo.id}</p>
                  <p className="font-mono">{tab.demo.password}</p>
                </div>
              </div>

              {/* Credentials form */}
              <div className="p-6 md:col-span-3">
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
                    >
                      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <p>{error}</p>
                    </div>
                  )}

                  <TextField
                    label={tab.idLabel}
                    name="identifier"
                    value={form.identifier}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    placeholder={tab.idPlaceholder}
                    hint={tab.idHint}
                  />

                  {tab.needsJurisdiction && (
                    <SelectField
                      label="State / Union Territory"
                      name="jurisdiction"
                      value={form.jurisdiction}
                      onChange={handleChange}
                      options={STATES}
                      required
                      hint="Your posting determines the jurisdiction you can act within."
                    />
                  )}

                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />

                  <Captcha
                    value={captcha.answer}
                    onChange={({ answer, expected }) => setCaptcha({ answer, expected })}
                  />

                  <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                    <p>
                      <strong>Two-factor authentication.</strong> In production, a
                      one-time password is sent to your registered official mobile
                      number after this step. Officer accounts additionally support
                      login via Digital Signature Certificate (DSC).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link to="/forgot-password" className="text-sm text-gov-blue hover:underline">
                      Reset password
                    </Link>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded bg-gov-blue px-6 py-2.5 text-sm font-semibold text-white
                                 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-gov-blue
                                 focus:ring-offset-2 disabled:opacity-60"
                    >
                      {submitting ? 'Verifying…' : `Sign In as ${tab.short}`}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            Not a departmental officer?{' '}
            <Link to="/login" className="font-semibold text-gov-blue hover:underline">
              Go to the Business / Public login
            </Link>
          </p>

          <div className="mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-center text-xs text-red-900">
            <strong>Warning:</strong> Unauthorised access to this system is an
            offence. All login attempts, queries and data modifications are
            recorded with user identity, timestamp and IP address.
          </div>
        </div>
      </main>

      <GovFooter />
    </div>
  )
}
