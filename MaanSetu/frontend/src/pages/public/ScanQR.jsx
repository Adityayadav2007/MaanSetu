import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Camera, CameraOff, Keyboard, Info, AlertTriangle } from 'lucide-react'
import PublicLayout from '../../components/layout/PublicLayout'

/**
 * Public QR scanner — no authentication.
 *
 * A consumer standing at a shop counter must be able to point a phone at the
 * verification sticker and get an immediate answer. Requiring registration
 * would make the consumer-protection purpose of the Act unusable in practice.
 *
 * Privacy: the camera stream is processed entirely in the browser. No frame is
 * uploaded anywhere. Only the decoded certificate number is sent to the server
 * for lookup, and the scan itself is not tied to any identity.
 */
export default function ScanQR() {
  const navigate = useNavigate()
  const regionId = 'maansetu-qr-region'
  const scannerRef = useRef(null)

  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')

  // Tear the camera down on unmount — leaving it live is both a privacy
  // problem and a battery drain.
  useEffect(() => {
    return () => { void stopScanner() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startScanner() {
    setError('')
    try {
      // Imported lazily so the QR library is not in the initial bundle for
      // users who never open this page.
      const { Html5Qrcode } = await import('html5-qrcode')

      const scanner = new Html5Qrcode(regionId, { verbose: false })
      scannerRef.current = scanner
      setScanning(true)

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          void handleDecoded(decodedText)
        },
        () => {
          // Per-frame decode misses are normal while aiming; stay silent.
        },
      )
    } catch (err) {
      setScanning(false)
      setError(
        err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings, or enter the certificate number manually below.'
          : 'Unable to start the camera on this device. Please enter the certificate number manually below.',
      )
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current
    scannerRef.current = null
    setScanning(false)
    if (!scanner) return
    try {
      await scanner.stop()
      scanner.clear()
    } catch {
      // Already stopped — nothing to do.
    }
  }

  async function handleDecoded(text) {
    await stopScanner()
    // QR payloads are URLs like https://maansetu.gov.in/verify/<certNo>.
    // Extract the certificate number rather than navigating to the raw string,
    // so a malicious QR code cannot redirect the user off-site.
    const match = String(text).match(/\/verify\/(.+)$/i)
    const certNo = match ? match[1] : String(text).trim()
    navigate(`/verify/${encodeURIComponent(certNo)}`)
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (!manual.trim()) return
    navigate(`/verify/${encodeURIComponent(manual.trim())}`)
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <nav className="mb-4 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Scan QR Code</span>
        </nav>

        <h1 className="text-2xl font-bold text-gov-blue">
          Scan an Instrument QR Code
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Point your camera at the QR code on the verification sticker of a
          weighing or measuring instrument. No login or registration is needed.
        </p>

        {/* Scanner */}
        <div className="mt-6 rounded border border-slate-200 bg-white p-5 shadow-sm">
          <div
            id={regionId}
            className="mx-auto grid min-h-[260px] w-full max-w-sm place-items-center
                       overflow-hidden rounded border-2 border-dashed border-slate-300 bg-slate-50"
          >
            {!scanning && (
              <div className="p-6 text-center">
                <Camera className="mx-auto text-slate-400" size={40} aria-hidden="true" />
                <p className="mt-3 text-sm text-slate-600">
                  The camera preview will appear here.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            {!scanning ? (
              <button
                type="button"
                onClick={startScanner}
                className="inline-flex items-center gap-2 rounded bg-gov-blue px-6 py-2.5
                           text-sm font-semibold text-white hover:bg-blue-900
                           focus:outline-none focus:ring-2 focus:ring-gov-blue focus:ring-offset-2"
              >
                <Camera size={16} aria-hidden="true" /> Start Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="inline-flex items-center gap-2 rounded border border-slate-300
                           px-6 py-2.5 text-sm font-semibold text-slate-700
                           hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-gov-blue"
              >
                <CameraOff size={16} aria-hidden="true" /> Stop Camera
              </button>
            )}
          </div>

          {error && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded border-l-4 border-amber-500
                         bg-amber-50 p-3.5 text-sm text-amber-900"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Manual fallback — essential where the camera is unavailable or the
            sticker is damaged. */}
        <form
          onSubmit={handleManualSubmit}
          className="mt-4 rounded border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Keyboard size={16} aria-hidden="true" />
            Cannot scan? Enter the number instead
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            The certificate number is printed on the verification sticker,
            usually below the QR code.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="manual-cert" className="sr-only">
              Certificate number
            </label>
            <input
              id="manual-cert"
              type="text"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="e.g. LM/UP/KNX/2025/004417"
              autoComplete="off"
              className="flex-1 rounded border border-slate-300 px-3 py-2.5 text-sm
                         focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
            />
            <button
              type="submit"
              disabled={!manual.trim()}
              className="rounded bg-gov-blue px-6 py-2.5 text-sm font-semibold text-white
                         hover:bg-blue-900 focus:outline-none focus:ring-2
                         focus:ring-gov-blue focus:ring-offset-2 disabled:opacity-50"
            >
              Verify
            </button>
          </div>
        </form>

        {/* Guidance */}
        <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-blue-900">
            <Info size={16} aria-hidden="true" />
            What the result tells you
          </h2>
          <div className="mt-2.5 space-y-2 text-sm text-blue-900">
            <p>
              A <strong>valid</strong> result means the instrument was verified
              and stamped by a Legal Metrology Officer or an approved test
              centre, and its verification has not yet expired — it is lawful
              for use in trade.
            </p>
            <p>
              An <strong>expired</strong> or <strong>revoked</strong> result
              means the instrument must not be used for any transaction. If a
              trader is using it anyway, you can lodge a complaint — anonymously
              if you prefer.
            </p>
            <p>
              <strong>No record found</strong> may mean the instrument was never
              verified, or that the sticker is not genuine. This is worth
              reporting.
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Privacy note: the camera image is processed on your device only. No
          photograph or video is uploaded, and scans are not linked to your
          identity.
        </p>
      </div>
    </PublicLayout>
  )
}
