import { EventEmitter } from 'events'

const KEY = '__nerixi_event_bus__'

function getBus() {
  if (!globalThis[KEY]) {
    const bus = new EventEmitter()
    bus.setMaxListeners(0)
    globalThis[KEY] = bus
  }
  return globalThis[KEY]
}

export function emitEvent(event) {
  const enriched = { ...event, ts: event.ts || new Date().toISOString() }
  getBus().emit('event', enriched)
  return enriched
}

export function subscribe(handler) {
  const bus = getBus()
  bus.on('event', handler)
  return () => bus.off('event', handler)
}
