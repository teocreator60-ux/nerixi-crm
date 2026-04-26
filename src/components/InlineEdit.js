'use client'
import { useEffect, useRef, useState } from 'react'

export default function InlineEdit({ value, onSave, type = 'text', options = null, displayFormat, placeholder = 'Cliquer pour éditer', style, hint = true, multiline = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { setDraft(value) }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (typeof inputRef.current.select === 'function') inputRef.current.select()
    }
  }, [editing])

  const start = (e) => {
    e?.stopPropagation?.()
    setEditing(true)
    setDraft(value)
  }
  const cancel = () => { setEditing(false); setDraft(value) }
  const save = async () => {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft) } catch {}
    setSaving(false)
    setEditing(false)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); save() }
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save() }
    else if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }

  const display = displayFormat ? displayFormat(value) : (value === '' || value == null ? <span style={{ opacity: 0.4 }}>{placeholder}</span> : value)

  return (
    <span
      className={`inline-edit-wrap ${editing ? 'is-editing' : ''}`}
      onDoubleClick={start}
      title={editing ? 'Échap pour annuler' : 'Double-clic pour éditer'}
      style={style}
    >
      {!editing ? (
        <>
          {display}
          {hint && <span className="inline-edit-hint">double-clic</span>}
        </>
      ) : type === 'select' && options ? (
        <select ref={inputRef} value={draft || ''} onChange={e => setDraft(e.target.value)} onBlur={save} onKeyDown={onKey} disabled={saving}>
          {options.map(o => (
            typeof o === 'object' ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          ref={inputRef}
          rows={3}
          value={draft || ''}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={onKey}
          disabled={saving}
        />
      ) : (
        <input
          ref={inputRef}
          type={type}
          value={draft ?? ''}
          onChange={e => setDraft(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
          onBlur={save}
          onKeyDown={onKey}
          disabled={saving}
        />
      )}
    </span>
  )
}
