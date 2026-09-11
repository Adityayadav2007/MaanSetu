import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, ShieldCheck, QrCode, AlertCircle } from 'lucide-react'
import PublicLayout from '../../components/layout/PublicLayout'
import { TextField } from '../../components/common/FormField'
import Captcha from '../../components/common/Captcha'
import { useAuth } from '../../context/AuthContext'
import { ROLES, ROLE_HOME } from '../../constants/legalMetrology'

/**
 * Portal 1 — Business / Instrument User login.
 *
 * This is the citizen-facing entry point. Members of the public who only want
 * to check an instrument are routed to the QR scanner instead, since scanning
 * requires no account (see the notice panel below).
 */
export default function BusinessLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [captcha, setCaptcha] = useState({ answer: '', expected: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({
        identifier: form.identifier,
        password: form.password,
        role: ROLES.BUSINESS,
        captchaAnswer: captcha.answer,
        captchaExpected: captcha.expected,
      })
      navigate(ROLE_HOME[ROLES.BUSINESS], { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-600">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="font-medium text-slate-900">Business Login</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* ---------------- Login form ---------------- */}
          <div className="lg:col-span-3">
            <div className="rounded border border-slate-300 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <h1 className="flex items-center gap-2 text-lg font-bold text-gov-blue">
                  <LogIn size={20} aria-hidden="true" />
                  Business / Instrument User Login
                </h1>
                <p className="mt-1 text-xs text-slate-600">
                  For traders, manufacturers, dealers and other users of weighing
                  and measuring instruments registered under the Legal Metrology
                  Act, 2009.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6" noValidate>
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
                  label="Registration ID / Mobile Number / Email"
                  name="identifier"
                  value={form.identifier}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  placeholder="e.g. MS-BUS-2026-000123"
                  hint="Use the Registration ID issued at the time of enrolment."
                />

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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <Link to="/forgot-password" className="text-sm text-gov-blue hover:underline">
                    Forgot your password?
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-gov-blue px-6 py-2.5 text-sm font-semibold text-white
                               hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-gov-blue
                               focus:ring-offset-2 disabled:opacity-60"
                  >
                    {submitting ? 'Signing in…' : 'Sign In'}
                  </button>
                </div>

                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <p className="font-semibold text-slate-700">Demonstration credentials</p>
                  <p className="mt-1 font-mono">
                    ID: <strong>MS-BUS-2026-000123</strong> &nbsp;|&nbsp; Password:{' '}
                    <strong>Demo@1234</strong>
                  </p>
                </div>
              </form>

              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm">
                <p className="text-slate-700">
                  New to Maansetu?{' '}
                  <Link to="/register" className="font-semibold text-gov-blue hover:underline">
                    Register your business
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* ---------------- Side panels ---------------- */}
          <div className="space-y-6 lg:col-span-2">
            {/* Public / no-login path */}
            <section className="rounded border-2 border-gov-green bg-green-50 p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-green-900">
                <QrCode size={18} aria-hidden="true" />
                Are you a consumer?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-green-900">
                <strong>No login is required</strong> to check whether a weighing
                or measuring instrument is validly verified. Simply scan the QR
                code affixed to the instrument, or enter the certificate number.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  to="/scan"
                  className="rounded bg-gov-green px-4 py-2.5 text-center text-sm font-semibold text-white
                             hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-gov-green
                             focus:ring-offset-2"
                >
                  Scan QR Code
                </Link>
                <Link
                  to="/verify"
                  className="rounded border border-gov-green bg-white px-4 py-2.5 text-center text-sm
                             font-semibold text-green-900 hover:bg-green-100"
                >
                  Enter Certificate Number
                </Link>
              </div>
            </section>

            {/* Officer redirect */}
            <section className="rounded border border-slate-300 bg-white p-5">
              <h2 className="flex items-center gap-2 text-base font-bold text-gov-blue">
                <ShieldCheck size={18} aria-hidden="true" />
                Departmental Officers
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Legal Metrology Officers, Government Approved Test Centres and
                Department Administrators must use the separate secure officer
                portal.
              </p>
              <Link
                to="/officer/login"
                className="mt-4 inline-block rounded border border-gov-blue px-4 py-2 text-sm
                           font-semibold text-gov-blue hover:bg-blue-50"
              >
                Go to Officer Portal
              </Link>
            </section>

            {/* Security advisory */}
            <section className="rounded border border-amber-300 bg-amber-50 p-5 text-xs leading-relaxed text-amber-900">
              <h2 className="text-sm font-bold">Security Advisory</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Never share your password or OTP with anyone, including departmental staff.</li>
                <li>The Department never asks for payment through personal UPI or bank accounts.</li>
                <li>Always confirm the address bar shows the official Maansetu domain.</li>
                <li>Sessions end automatically after 15 minutes of inactivity.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
