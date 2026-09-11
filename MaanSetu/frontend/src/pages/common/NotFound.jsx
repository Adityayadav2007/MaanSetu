import { Link } from 'react-router-dom'
import { Home, QrCode, Search } from 'lucide-react'
import PublicLayout from '../../components/layout/PublicLayout'

/** 404 handler for the public shell. */
export default function NotFound() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-6xl font-bold text-slate-300">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you requested does not exist or may have been moved. If you
          reached this page from a QR code, the code may be damaged or may not
          belong to this portal.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded bg-gov-blue px-4 py-2.5
                       text-sm font-semibold text-white hover:bg-blue-900
                       focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2"
          >
            <Home size={16} aria-hidden="true" />
            Return to Home
          </Link>
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 rounded border border-slate-300
                       bg-white px-4 py-2.5 text-sm font-semibold text-slate-700
                       hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-gov-blue"
          >
            <QrCode size={16} aria-hidden="true" />
            Scan a QR Code
          </Link>
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 rounded border border-slate-300
                       bg-white px-4 py-2.5 text-sm font-semibold text-slate-700
                       hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-gov-blue"
          >
            <Search size={16} aria-hidden="true" />
            Verify a Certificate
          </Link>
        </div>
      </div>
    </PublicLayout>
  )
}
