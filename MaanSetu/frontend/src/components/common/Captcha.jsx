import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

/**
 * Arithmetic captcha.
 *
 * This is a UX speed-bump, not a security control. It raises the cost of naive
 * form-fill bots but is solvable by any determined attacker. Real bot and
 * credential-stuffing defence must live server-side: per-IP and per-account
 * rate limiting, exponential backoff, and account lockout after repeated
 * failures. Treat this component as defence-in-depth only.
 */
export default function Captcha({ onChange, value, error }) {
  const [challenge, setChallenge] = useState({ text: '', answer: '' })

  const regenerate = useCallback(() => {
    const a = Math.floor(Math.random() * 9) + 1
    const b = Math.floor(Math.random() * 9) + 1
    setChallenge({ text: `${a} + ${b}`, answer: String(a + b) })
    onChange({ answer: '', expected: String(a + b) })
  }, [onChange])

  useEffect(() => {
    regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <label htmlFor="captcha" className="block text-sm font-medium text-slate-700">
        Security Check
        <span className="text-red-600" aria-label="required"> *</span>
      </label>
      <div className="mt-1 flex items-stretch gap-2">
        <div
          className="select-none rounded border border-slate-300 bg-slate-100 px-4
                     grid place-items-center font-mono text-base font-bold
                     tracking-widest text-slate-800"
          aria-label={`Captcha question: what is ${challenge.text}?`}
        >
          {challenge.text} = ?
        </div>
        <button
          type="button"
          onClick={regenerate}
          className="rounded border border-slate-300 px-2 text-slate-600
                     hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-gov-blue"
          aria-label="Get a new captcha question"
          title="New question"
        >
          <RefreshCw size={16} aria-hidden="true" />
        </button>
        <input
          id="captcha"
          name="captcha"
          type="text"
          inputMode="numeric"
          required
          value={value}
          onChange={(e) => onChange({ answer: e.target.value, expected: challenge.answer })}
          placeholder="Answer"
          autoComplete="off"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'captcha-error' : undefined}
          className="w-24 rounded border border-slate-300 px-3 py-2 text-sm
                     focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
        />
      </div>
      {error && (
        <p id="captcha-error" className="mt-1 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
