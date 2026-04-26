'use client'
import { useEffect, useRef, useState } from 'react'

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function iconFor(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return '📄'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return '🖼️'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) return '📝'
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️'
  if (['mp4', 'mov', 'avi'].includes(ext)) return '🎬'
  if (['mp3', 'wav', 'm4a'].includes(ext)) return '🎵'
  return '📎'
}

export default function Attachments({ clientId }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState([])
  const inputRef = useRef(null)

  const refresh = async () => {
    try {
      const res = await fetch(`/api/attachments/${clientId}`, { cache: 'no-store' })
      const data = await res.json()
      setFiles(data.attachments || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { refresh() }, [clientId])

  const upload = (file) => {
    const tmpId = `tmp_${Date.now()}_${Math.random()}`
    setUploads(u => [...u, { id: tmpId, name: file.name, size: file.size, progress: 0 }])

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/attachments/${clientId}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100)
        setUploads(u => u.map(x => x.id === tmpId ? { ...x, progress: pct } : x))
      }
    }
    xhr.onload = () => {
      setUploads(u => u.filter(x => x.id !== tmpId))
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          if (data.attachment) setFiles(prev => [data.attachment, ...prev])
        } catch {}
      }
    }
    xhr.onerror = () => setUploads(u => u.filter(x => x.id !== tmpId))

    const fd = new FormData()
    fd.append('file', file)
    xhr.send(fd)
  }

  const handleFiles = (list) => {
    if (!list || list.length === 0) return
    Array.from(list).forEach(upload)
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce fichier ?')) return
    await fetch(`/api/attachments/${clientId}?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div>
      <div
        className={`att-dropzone ${dragOver ? 'is-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
      >
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <p style={{ fontSize: 22, marginBottom: 4 }}>📎</p>
        <p style={{ fontWeight: 600, fontSize: 13 }}>Glisse un PDF, image ou contrat ici</p>
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginTop: 2 }}>Ou clique pour choisir un fichier</p>
      </div>

      {uploads.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {uploads.map(u => (
            <div key={u.id} className="att-item fade-in">
              <span style={{ fontSize: 18 }}>{iconFor(u.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</p>
                <div className="att-progress"><div style={{ width: `${u.progress}%` }} /></div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--nerixi-muted)' }}>{u.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {!loading && files.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {files.map(f => (
            <div key={f.id} className="att-item fade-in">
              <span style={{ fontSize: 18 }}>{iconFor(f.name)}</span>
              <a href={f.url} target="_blank" rel="noopener" style={{ flex: 1, color: 'var(--nerixi-text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {f.name}
              </a>
              <span style={{ fontSize: 11, color: 'var(--nerixi-muted)', flexShrink: 0 }}>{fmtSize(f.size)}</span>
              <button onClick={() => remove(f.id)}
                style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 6, padding: '3px 8px', color: '#ff8a89', cursor: 'pointer', fontSize: 11 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
