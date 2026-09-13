import { AlertTriangle, Loader2 } from 'lucide-react'

/**
 * Shared loading / error / empty presentation.
 *
 * Pages that talk to the API have three states the mock data never had. Showing
 * them consistently matters more than it looks: a blank table during a slow
 * request reads to a trader as "my instruments are gone".
 */

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="my-6 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <div>
          <p className="font-semibold">Could not load this data</p>
          <p className="mt-1 text-red-800">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Renders `children` once data has arrived, and the right placeholder before.
 *
 * @param {{loading: boolean, error: string|null, empty?: boolean,
 *          emptyMessage?: string, onRetry?: () => void, children: React.ReactNode}} props
 */
export function AsyncState({
  loading, error, empty = false, emptyMessage, onRetry, children,
}) {
  if (loading) return <Loading />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (empty) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">
        {emptyMessage || 'Nothing to show yet.'}
      </p>
    )
  }
  return children
}

export default AsyncState
