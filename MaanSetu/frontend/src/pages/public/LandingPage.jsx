import { Link } from 'react-router-dom'
import {
  QrCode, Building2, ShieldCheck, FileCheck2, BellRing,
  Search, ArrowRight, Scale, AlertTriangle,
} from 'lucide-react'
import PublicLayout from '../../components/layout/PublicLayout'

/** Public landing page — routes each stakeholder to the correct portal. */
export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Scrolling statutory notice, as commonly seen on government portals */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-start gap-2 text-[13px] text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Important:</strong> Under Section 24 of the Legal Metrology
            Act, 2009, no weight or measure may be used in any transaction or
            for protection unless it has been verified and stamped. Use of an
            unverified instrument is a punishable offence.
          </p>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gov-blue to-blue-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <Scale size={13} aria-hidden="true" />
              National Legal Metrology Portal
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold leading-tight">
              Online Verification of Weighing &amp; Measuring Instruments
            </h1>
            <p className="mt-4 text-blue-100 leading-relaxed">
              Apply for verification and re-verification, track your
              application, and receive tamper-proof digital certificates with QR
              authentication — entirely online. Consumers can verify any
              stamped instrument instantly, without registering.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/scan"
                className="inline-flex items-center gap-2 rounded bg-white px-5 py-3 text-sm font-semibold
                           text-gov-blue hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white
                           focus:ring-offset-2 focus:ring-offset-gov-blue transition-colors"
              >
                <QrCode size={17} aria-hidden="true" />
                Scan Instrument QR Code
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded border border-white/40 px-5 py-3 text-sm
                           font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2
                           focus:ring-white transition-colors"
              >
                <Building2 size={17} aria-hidden="true" />
                Register Your Business
              </Link>
            </div>

            <p className="mt-4 text-xs text-blue-200">
              Scanning a QR code requires no login. Registration is required
              only to submit verification applications.
            </p>
          </div>

          {/* Two-portal chooser */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PortalCard
              to="/login"
              icon={<Building2 size={22} aria-hidden="true" />}
              title="Business / Public Portal"
              lines={[
                'Register instruments',
                'Apply for verification',
                'Download certificates',
                'Scan QR — no login needed',
              ]}
              cta="Business Login"
            />
            <PortalCard
              to="/officer/login"
              icon={<ShieldCheck size={22} aria-hidden="true" />}
              title="Officer Portal"
              lines={[
                'LMO — State Metrology Officer',
                'GATC — Test Centre / Lab',
                'Administrator — Oversight',
                'Restricted access',
              ]}
              cta="Officer Login"
              accent
            />
          </div>
        </div>
      </section>

      {/* Quick certificate lookup */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <h2 className="text-xl font-bold text-slate-800">
            Verify a Certificate
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Enter a certificate number to confirm whether an instrument is
            currently verified, and view its validity period.
          </p>
          <form
            action="/verify"
            method="get"
            className="mt-5 flex flex-col sm:flex-row gap-2"
          >
            <label className="flex-1">
              <span className="sr-only">Certificate number</span>
              <input
                name="cert"
                type="text"
                placeholder="e.g. LM/MH/2026/NAWI/0001234"
                className="w-full rounded border border-slate-300 px-4 py-3 text-sm
                           focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded bg-gov-blue px-6 py-3
                         text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none
                         focus:ring-2 focus:ring-gov-blue focus:ring-offset-2 transition-colors"
            >
              <Search size={16} aria-hidden="true" />
              Verify
            </button>
          </form>
        </div>
      </section>

      {/* Capability summary */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-center text-xl font-bold text-slate-800">
          What the Platform Provides
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<FileCheck2 size={20} aria-hidden="true" />}
            title="Digital Certificates"
            body="QR-authenticated verification certificates, digitally signed and impossible to forge."
          />
          <Feature
            icon={<BellRing size={20} aria-hidden="true" />}
            title="Expiry Reminders"
            body="Automatic alerts at 60, 30, 15, 7 and 1 day before verification validity lapses."
          />
          <Feature
            icon={<ShieldCheck size={20} aria-hidden="true" />}
            title="Public Authentication"
            body="Any consumer can scan an instrument and confirm its status in seconds."
          />
          <Feature
            icon={<Search size={20} aria-hidden="true" />}
            title="Central Repository"
            body="Complete verification history for every instrument, searchable across jurisdictions."
          />
        </div>
      </section>
    </PublicLayout>
  )
}

function PortalCard({ to, icon, title, lines, cta, accent = false }) {
  return (
    <div
      className={`rounded-lg p-5 ring-1 ${
        accent ? 'bg-blue-950/60 ring-white/20' : 'bg-white/10 ring-white/20'
      }`}
    >
      <div className="flex items-center gap-2 text-white">
        {icon}
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <ul className="mt-3 space-y-1.5 text-[13px] text-blue-100">
        {lines.map((l) => (
          <li key={l} className="flex gap-2">
            <span aria-hidden="true">&middot;</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
      <Link
        to={to}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:underline"
      >
        {cta}
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  )
}

function Feature({ icon, title, body }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="grid h-10 w-10 place-items-center rounded bg-blue-50 text-gov-blue">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-slate-800 text-sm">{title}</h3>
      <p className="mt-1.5 text-[13px] text-slate-600 leading-relaxed">{body}</p>
    </div>
  )
}
