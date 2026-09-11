import { Link } from 'react-router-dom'

/**
 * Government footer band with statutory links and accessibility notices,
 * as expected of a GIGW-compliant government portal.
 */
export default function GovFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto">
      <div className="bg-slate-800 text-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <h2 className="font-semibold text-white mb-3">About Maansetu</h2>
            <p className="text-slate-400 leading-relaxed text-[13px]">
              A unified national platform for online verification, digital
              certification and lifecycle management of weighing and measuring
              instruments under the Legal Metrology Act, 2009.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-white mb-3">For Businesses</h2>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/register" className="hover:text-white hover:underline">Register Your Business</Link></li>
              <li><Link to="/login" className="hover:text-white hover:underline">Apply for Verification</Link></li>
              <li><Link to="/login" className="hover:text-white hover:underline">Download Certificates</Link></li>
              <li><Link to="/help" className="hover:text-white hover:underline">Fee Structure</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-white mb-3">For Public</h2>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/scan" className="hover:text-white hover:underline">Scan Instrument QR Code</Link></li>
              <li><Link to="/verify" className="hover:text-white hover:underline">Verify a Certificate</Link></li>
              <li><Link to="/grievance" className="hover:text-white hover:underline">File a Complaint</Link></li>
              <li><Link to="/help" className="hover:text-white hover:underline">Consumer Rights</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-white mb-3">Legal &amp; Policy</h2>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/help" className="hover:text-white hover:underline">Terms of Use</Link></li>
              <li><Link to="/help" className="hover:text-white hover:underline">Privacy Policy</Link></li>
              <li><Link to="/help" className="hover:text-white hover:underline">Accessibility Statement</Link></li>
              <li><Link to="/help" className="hover:text-white hover:underline">Right to Information</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-400 text-xs">
        <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>
            &copy; {year} Department of Consumer Affairs, Government of India.
            All rights reserved.
          </p>
          <p>
            Content owned by the Department of Legal Metrology &middot; Last
            reviewed on {new Date().toLocaleDateString('en-IN')}
          </p>
        </div>
      </div>
    </footer>
  )
}
