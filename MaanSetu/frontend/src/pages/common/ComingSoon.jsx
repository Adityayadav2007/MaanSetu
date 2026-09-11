import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'

/**
 * Placeholder for sections that are navigable but not yet implemented.
 *
 * Every sidebar link resolves to a real route so the shell is fully explorable
 * and no click produces a dead end. Each placeholder states plainly what will
 * live there, so the gap is visible rather than disguised as a finished screen.
 */
export default function ComingSoon({ title, description, plannedFeatures = [] }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded bg-amber-50 text-amber-700">
          <Construction size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{description}</p>

          <p className="mt-4 inline-block rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
            Not yet implemented — planned for a later build phase
          </p>

          {plannedFeatures.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Intended scope
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {plannedFeatures.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-slate-400" aria-hidden="true">
                      &middot;
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <Link
              to=".."
              relative="path"
              className="text-sm font-medium text-gov-blue hover:underline"
            >
              &larr; Go back
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
