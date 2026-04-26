'use client'

export async function apiFetch(url, opts = {}) {
  return fetch(url, { credentials: 'same-origin', ...opts })
}
