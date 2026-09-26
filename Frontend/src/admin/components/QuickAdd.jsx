import { useState } from 'react'

// A single-field "add" control. It is deliberately not a <form>, so it can sit inside another form.
export default function QuickAdd({ label, placeholder, buttonLabel = 'Add', maxLength = 60, onAdd }) {
  const [value, setValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function add() {
    const name = value.trim()
    if (!name || adding) return
    setAdding(true)
    setError('')
    try {
      await onAdd(name)
      setValue('')
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      add()
    }
  }

  return (
    <div className="quick-add">
      <div className="quick-add-row">
        <input
          className="input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label}
          maxLength={maxLength}
        />
        <button type="button" className="btn btn-secondary" onClick={add} disabled={adding || !value.trim()}>
          {adding ? 'Adding…' : buttonLabel}
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
