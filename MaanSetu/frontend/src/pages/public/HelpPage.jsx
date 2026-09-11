import { Link } from 'react-router-dom'
import { BookOpen, FileText, Phone, Scale, ShieldCheck } from 'lucide-react'
import PublicLayout from '../../components/layout/PublicLayout'
import { INSTRUMENT_CATEGORIES } from '../../constants/legalMetrology'

/**
 * Public help and statutory information page.
 *
 * Doubles as the citizen-facing explainer for what verification means and why
 * an unverified instrument matters, which is the consumer-protection purpose
 * of the Act.
 */
export default function HelpPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-500">
          <Link to="/" className="hover:underline">Home</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-slate-700">Help &amp; Information</span>
        </nav>

        <h1 className="text-2xl font-bold text-slate-900">Help &amp; Information</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Guidance for businesses, consumers and officers on verification of
          weighing and measuring instruments under the Legal Metrology Act, 2009
          and the Legal Metrology (General) Rules, 2011.
        </p>

        {/* Why verification matters */}
        <section className="mt-8 rounded border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-gov-blue" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">
              Why verification is required
            </h2>
          </div>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Under Section 24 of the Legal Metrology Act, 2009, no person shall
              use, or keep for use, any weight or measure in any transaction or
              for protection unless it has been verified and stamped by a Legal
              Metrology Officer or a Government Approved Test Centre. Using an
              unverified instrument is an offence attracting penalty.
            </p>
            <p>
              Verification confirms that an instrument measures within the
              maximum permissible error prescribed for its accuracy class. Once
              verified, the instrument is stamped and a verification certificate
              is issued, valid for the period notified by the State Government
              under Rule 6 of the Legal Metrology (General) Rules, 2011.
            </p>
            <p>
              Verification must be renewed before expiry. An instrument whose
              certificate has lapsed is treated as unverified from the date of
              expiry, regardless of whether it still measures accurately.
            </p>
          </div>
        </section>

        {/* For businesses */}
        <section className="mt-6 rounded border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gov-blue" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">
              For businesses and instrument users
            </h2>
          </div>
          <ol className="mt-3 space-y-3 text-sm text-slate-700">
            {[
              ['Register your business', 'Create an account with your business details, GSTIN (if applicable) and premises address. Registration is one-time.'],
              ['Add your instruments', 'Record each instrument with its make, model, serial number, capacity and accuracy class. Attach the model approval certificate and photographs of the instrument and its nameplate.'],
              ['Apply for verification', 'Submit an application for fresh verification or periodic re-verification and pay the prescribed fee online.'],
              ['Attend the verification', 'A Legal Metrology Officer or notified GATC is allotted and a date scheduled. Keep the instrument accessible and the premises available on that date.'],
              ['Download your certificate', 'On successful verification the instrument is stamped and a QR-enabled digital certificate is issued to your account for download and display.'],
              ['Renew before expiry', 'Automatic reminders are issued 60, 30, 15, 7 and 1 day before expiry. Apply for re-verification before the validity date to remain compliant.'],
            ].map(([heading, body], i) => (
              <li key={heading} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gov-blue text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-slate-900">{heading}. </span>
                  {body}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* For consumers */}
        <section className="mt-6 rounded border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-gov-green" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">For consumers</h2>
          </div>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
            <p>
              Every verified instrument carries a QR code linking to its
              verification record. You do not need an account to check it —
              simply{' '}
              <Link to="/scan" className="font-medium text-gov-blue hover:underline">
                scan the QR code
              </Link>{' '}
              or{' '}
              <Link to="/verify" className="font-medium text-gov-blue hover:underline">
                enter the certificate number
              </Link>
              .
            </p>
            <p>
              If the instrument shows as expired, revoked or is not found, or if
              you suspect short measure, you may file a complaint with the Legal
              Metrology Department of your State. Record the certificate number,
              the trader&apos;s name and the date, and keep your receipt.
            </p>
          </div>
        </section>

        {/* Validity reference */}
        <section className="mt-6 rounded border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-gov-blue" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">
              Instrument categories and indicative validity
            </h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Validity periods are notified separately by each State Government
            under Rule 6. The figures below are indicative defaults — always
            confirm the period shown on your own certificate.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <caption className="sr-only">
                Instrument categories with indicative verification validity periods
              </caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                  <th scope="col" className="px-3 py-2 font-semibold">Category</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Typical instruments</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Validity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {INSTRUMENT_CATEGORIES.map((c) => (
                  <tr key={c.code}>
                    <th scope="row" className="px-3 py-2 text-left font-medium text-slate-900">
                      {c.name}
                    </th>
                    <td className="px-3 py-2 text-slate-600">{c.examples}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {c.defaultValidityMonths} months
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-6 rounded border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-gov-blue" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">Support</h2>
          </div>
          <div className="mt-3 grid gap-4 text-sm text-slate-700 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-900">National Helpline</p>
              <p className="mt-1 text-slate-600">1800-11-4000</p>
              <p className="text-xs text-slate-500">Mon–Sat, 09:30–18:00 IST</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Technical Support</p>
              <p className="mt-1 text-slate-600">support@maansetu.gov.in</p>
              <p className="text-xs text-slate-500">Response within 2 working days</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Grievance Officer</p>
              <p className="mt-1 text-slate-600">grievance@maansetu.gov.in</p>
              <p className="text-xs text-slate-500">Escalation after 15 days</p>
            </div>
          </div>
          <p className="mt-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Contact details shown here are indicative placeholders for this build
            and must be replaced with the department&apos;s notified helpline
            before the portal goes live.
          </p>
        </section>
      </div>
    </PublicLayout>
  )
}
