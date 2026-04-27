'use client'
import { useEffect, useState } from 'react'

export default function Typewriter({ text = '', speed = 35, startDelay = 200, showCaret = true }) {
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setShown('')
    setDone(false)
    if (!text) { setDone(true); return }
    let i = 0
    let interval
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i++
        setShown(text.slice(0, i))
        if (i >= text.length) {
          clearInterval(interval)
          setDone(true)
        }
      }, speed)
    }, startDelay)
    return () => {
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [text, speed, startDelay])

  return (
    <span>
      {shown}
      {showCaret && !done && <span className="tw-caret" aria-hidden />}
    </span>
  )
}
