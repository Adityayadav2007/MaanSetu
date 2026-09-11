/**
 * Shared form primitives.
 *
 * Every control is label-associated and exposes aria-invalid + a described-by
 * error node, so screen readers announce validation failures. Required fields
 * are marked both visually and via the `required` attribute rather than colour
 * alone — a GIGW accessibility requirement.
 */

function FieldShell({ label, htmlFor, required, error, hint, children }) {
  const errorId = error ? `${htmlFor}-error` : undefined
  const hintId = hint ? `${htmlFor}-hint` : undefined

  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span className="text-red-600" aria-label="required">
            {' '}*
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      <div className="mt-1">{children({ errorId, hintId })}</div>
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const BASE_INPUT =
  'block w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-gov-blue focus:outline-none ' +
  'focus:ring-1 focus:ring-gov-blue disabled:bg-slate-100 disabled:text-slate-500 ' +
  'aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500'

export function TextField({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  error,
  hint,
  placeholder,
  autoComplete,
  maxLength,
  disabled = false,
}) {
  return (
    <FieldShell label={label} htmlFor={name} required={required} error={error} hint={hint}>
      {({ errorId, hintId }) => (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={BASE_INPUT}
        />
      )}
    </FieldShell>
  )
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  error,
  hint,
  placeholder = '— Select —',
  disabled = false,
}) {
  return (
    <FieldShell label={label} htmlFor={name} required={required} error={error} hint={hint}>
      {({ errorId, hintId }) => (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={BASE_INPUT}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value
            const text = typeof opt === 'string' ? opt : opt.label
            return (
              <option key={val} value={val}>
                {text}
              </option>
            )
          })}
        </select>
      )}
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  name,
  value,
  onChange,
  rows = 3,
  required = false,
  error,
  hint,
  placeholder,
  maxLength,
}) {
  return (
    <FieldShell label={label} htmlFor={name} required={required} error={error} hint={hint}>
      {({ errorId, hintId }) => (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          required={required}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={BASE_INPUT}
        />
      )}
    </FieldShell>
  )
}

/** Section heading used to group long statutory forms into readable blocks. */
export function FormSection({ title, description, children }) {
  return (
    <fieldset className="border-t border-slate-200 pt-5">
      <legend className="sr-only">{title}</legend>
      <h3 className="text-sm font-bold uppercase tracking-wide text-gov-blue">
        {title}
      </h3>
      {description && <p className="mt-1 text-xs text-slate-600">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}
