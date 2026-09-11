import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Search, ShieldCheck, ShieldAlert, ShieldX, Printer, QrCode, Loader2,
} from 'lucide-react'
import PublicLayout from '../../components/layout/PublicLayout'
import StatusPill from '../../components/common/StatusPill'
import {
  lookupCertificate, formatDate, daysUntil, SAMPLE_CERTIFICATE_NOS,
} from '../../services/mockData'
import {
  CERTIFICATE_STATUS, VERIFICATION_RESULT_LABELS,
} from '../../constants/legalMetrology'

/**
 * Public certificate verification — deliberately open, no authentication.
 *
 * Any consumer must be able to confirm that the instrument being used for a
 * transaction is lawfully verified and stamped, which is the core consumer
 * protection purpose of the Legal Metrology Act, 2009. Requiring a login here
 * would defeat that purpose.
 *
 * The response is intentionally minimal — no proprietor contact details, no
 * GSTIN, no full postal address. Only the facts a consumer needs to judge
 * lawful use.
 */
export default function VerifyCertificate() {
  const { certificateNo } = useParams()
  const navigate = useNavigate()

  const [query, setQuery] = useState(certificateNo ?? '')
  const [result, setResult] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(false)

  // A QR scan lands on /verify/:certificateNo, so resolve it on mount.
  useEffect(() => {
    if (certificateNo) void runLookup(certificateNo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificateNo])

  async function runLookup(value) {
    setLoading(true)
    setNotFound(false)
    setResult(null)
    try {
      const found = await lookupCertificate(value)
      if (found) setResult(found)
      else setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    void runLookup(query)
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-4 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Verify Certificate</span>
        </nav>

        <h1 className="text-2xl font-bold text-gov-blue">
          Verify a Digital Verification Certificate
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
          Enter the certificate number printed on the instrument's verification
          sticker, or scan its QR code. No login is required — this service is
          open to every consumer.
        </p>

        {/* Search */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded border border-slate-200 bg-white p-5 shadow-sm"
        >
          <label htmlFor="certno" className="block text-sm font-medium text-slate-700">
            Certificate Number, Instrument ID or Serial Number
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="certno"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. LM/UP/KNR/2025/004417"
              autoComplete="off"
              className="flex-1 rounded border border-slate-300 px-3 py-2.5 text-sm
                         focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center justify-center gap-2 rounded bg-gov-blue
                         px-6 py-2.5 text-sm font-semibold text-white
                         hover:bg-blue-900 focus:outline-none focus:ring-2
                         focus:ring-gov-blue focus:ring-offset-2 disabled:opacity-50"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Checking…</>
                : <><Search size={16} aria-hidden="true" /> Verify</>}
            </button>
            <Link
              to="/scan"
              className="inline-flex items-center justify-center gap-2 rounded border
                         border-gov-blue px-4 py-2.5 text-sm font-semibold text-gov-blue
                         hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-gov-blue"
            >
              <QrCode size={16} aria-hidden="true" /> Scan QR
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Try a sample:</span>
            {SAMPLE_CERTIFICATE_NOS.map((s) => (
              <button
                key={s.no}
                type="button"
                onClick={() => { setQuery(s.no); void runLookup(s.no) }}
                className="rounded border border-slate-300 px-2 py-0.5 font-mono
                           hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-gov-blue"
              >
                {s.no} <span className="font-sans text-slate-400">({s.note})</span>
              </button>
            ))}
          </div>
        </form>

        {notFound && (
          <div
            className="mt-6 rounded border-l-4 border-red-500 bg-red-50 p-5"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <ShieldX className="mt-0.5 shrink-0 text-red-600" size={22} aria-hidden="true" />
              <div>
                <h2 className="font-bold text-red-900">No certificate found</h2>
                <p className="mt-1 text-sm text-red-800">
                  No verification record matches “{query}”. This may mean the
                  instrument has never been verified, the number was entered
                  incorrectly, or the certificate is not genuine.
                </p>
                <p className="mt-2 text-sm text-red-800">
                  If a trader is using this instrument for a transaction, you may{' '}
                  <Link to="/grievance" className="font-semibold underline">
                    file a complaint with the Legal Metrology Department
                  </Link>.
                </p>
              </div>
            </div>
          </div>
        )}

        {result && <CertificateResult cert={result} />}
      </div>
    </PublicLayout>
  )
}

/* ------------------------------------------------------------------ *
 * Result card
 * ------------------------------------------------------------------ */

function CertificateResult({ cert }) {
  const left = daysUntil(cert.validUpto)
  const isValid = cert.status === CERTIFICATE_STATUS.VALID
    || cert.status === CERTIFICATE_STATUS.EXPIRING_SOON

  const banner = {
    [CERTIFICATE_STATUS.VALID]: {
      icon: ShieldCheck,
      wrap: 'border-green-500 bg-green-50',
      iconClass: 'text-green-600',
      title: 'This instrument is lawfully verified',
      body: `Verification is valid for a further ${left} day${left === 1 ? '' : 's'}, until ${formatDate(cert.validUpto)}.`,
    },
    [CERTIFICATE_STATUS.EXPIRING_SOON]: {
      icon: ShieldAlert,
      wrap: 'border-amber-500 bg-amber-50',
      iconClass: 'text-amber-600',
      title: 'Verified — but expiring soon',
      body: `This certificate expires in ${left} day${left === 1 ? '' : 's'} on ${formatDate(cert.validUpto)}. The instrument remains lawful to use until then.`,
    },
    [CERTIFICATE_STATUS.EXPIRED]: {
      icon: ShieldX,
      wrap: 'border-red-500 bg-red-50',
      iconClass: 'text-red-600',
      title: 'Verification has EXPIRED',
      body: `This certificate expired on ${formatDate(cert.validUpto)}, ${Math.abs(left)} day${Math.abs(left) === 1 ? '' : 's'} ago. Using this instrument for any transaction is an offence until it is re-verified.`,
    },
    [CERTIFICATE_STATUS.REVOKED]: {
      icon: ShieldX,
      wrap: 'border-red-600 bg-red-100',
      iconClass: 'text-red-700',
      title: 'Certificate REVOKED',
      body: cert.revokedReason
        ?? 'This certificate has been revoked by the Legal Metrology Department. The instrument must not be used for trade.',
    },
    [CERTIFICATE_STATUS.SUSPENDED]: {
      icon: ShieldAlert,
      wrap: 'border-orange-500 bg-orange-50',
      iconClass: 'text-orange-600',
      title: 'Certificate SUSPENDED',
      body: 'This certificate is currently suspended pending departmental action. The instrument should not be used for trade.',
    },
  }[cert.status]

  const Icon = banner.icon

  return (
    <div className="mt-6">
      {/* Verdict banner — the answer, before any detail */}
      <div className={`rounded border-l-4 p-5 ${banner.wrap}`} role="status">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 shrink-0 ${banner.iconClass}`} size={26} aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{banner.title}</h2>
              <StatusPill status={cert.status} kind="certificate" />
            </div>
            <p className="mt-1 text-sm text-slate-800">{banner.body}</p>
          </div>
        </div>
      </div>

      {/* Certificate detail */}
      <div className="mt-4 overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
              Verification Certificate
            </h3>
            <p className="font-mono text-sm font-semibold text-slate-800">
              {cert.certificateNo}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300
                       bg-white px-3 py-1.5 text-xs font-medium text-slate-700
                       hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-gov-blue"
          >
            <Printer size={14} aria-hidden="true" /> Print
          </button>
        </div>

        <dl className="grid gap-x-8 gap-y-0 px-5 py-2 sm:grid-cols-2">
          <Row label="Instrument Category" value={cert.categoryName} />
          <Row label="Instrument ID" value={cert.instrumentId} mono />
          <Row label="Make" value={cert.make} />
          <Row label="Model" value={cert.model} />
          <Row label="Serial Number" value={cert.serialNo} mono />
          <Row label="Capacity" value={cert.capacity} />
          <Row label="Accuracy Class" value={cert.accuracyClass} />
          <Row label="Verification Stamp No." value={cert.stampNo} mono />
          <Row label="Held By" value={cert.holder} />
          <Row label="Trading Premises" value={cert.premises} />
          <Row label="Verified By" value={cert.verifiedBy} />
          <Row
            label="Verification Result"
            value={VERIFICATION_RESULT_LABELS[cert.result] ?? cert.result}
          />
          <Row label="Verified On" value={formatDate(cert.verifiedOn)} />
          <Row
            label="Valid Up To"
            value={formatDate(cert.validUpto)}
            emphasis={!isValid}
          />
          {cert.revoked && (
            <Row label="Revoked On" value={formatDate(cert.revokedOn)} emphasis />
          )}
        </dl>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600">
          <p>
            Verified against the national Legal Metrology repository on{' '}
            {new Date().toLocaleString('en-IN')}. This digital certificate is
            issued under the Legal Metrology Act, 2009 and the Legal Metrology
            (General) Rules, 2011, and is valid without a physical signature.
          </p>
        </div>
      </div>

      {!isValid && (
        <div className="mt-4 rounded border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-900">
            What you can do as a consumer
          </h3>
          <p className="mt-2 text-sm text-slate-700">
            If this instrument is being used for a transaction — weighing goods,
            dispensing fuel, or measuring quantity — it is being used unlawfully.
            You may{' '}
            <Link to="/grievance" className="font-semibold text-gov-blue underline">
              lodge a complaint
            </Link>{' '}
            with the Legal Metrology Department of your State, quoting
            certificate number {cert.certificateNo}. Complaints can be filed
            anonymously.
          </p>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, mono = false, emphasis = false }) {
  return (
    <div className="border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`mt-0.5 text-sm ${mono ? 'font-mono' : ''} ${
          emphasis ? 'font-bold text-red-700' : 'font-medium text-slate-900'
        }`}
      >
        {value || '—'}
      </dd>
    </div>
  )
}
