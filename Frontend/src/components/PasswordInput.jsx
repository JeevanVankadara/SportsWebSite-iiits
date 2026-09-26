import { useState } from 'react'

// Password field with a Show/Hide button, handy when typing on a phone.
export default function PasswordInput({ id, value, onChange, autoComplete, minLength }) {
  const [shown, setShown] = useState(false)

  return (
    <div className="password-input">
      <input
        id={id}
        className="input"
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShown((current) => !current)}
        aria-label={shown ? 'Hide password' : 'Show password'}
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
