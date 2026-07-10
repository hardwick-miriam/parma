'use client'

import { useState, useEffect } from 'react'

const CATEGORIES = [
  { id: 'streak_risk', label: 'Streak at risk', description: 'When your logging or step streak is about to break' },
  { id: 'session_reminder', label: 'Session reminder', description: 'Planned workout reminder from your routine' },
  { id: 'recovery_ready', label: 'Recovery ready', description: 'When WHOOP recovery score is high and you\'re primed to train' },
  { id: 'pr_celebration', label: 'PR celebration', description: 'Personal record achievements' },
  { id: 'hydration', label: 'Hydration nudge', description: 'Afternoon nudge if water intake is low' },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

export function PushNotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Record<CategoryId, boolean>>({
    streak_risk: true,
    session_reminder: true,
    recovery_ready: true,
    pr_celebration: true,
    hydration: true,
  })

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
    setPermission(Notification.permission)
  }, [])

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
        if (!sub) return
        // Seed from what's actually saved server-side — without this the
        // checkboxes always reset to "everything on" on every page load,
        // regardless of what the user previously turned off.
        fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.categories) setCategories((prev) => ({ ...prev, ...d.categories }))
          })
          .catch(() => {})
      })
    })
  }, [supported])

  async function enableNotifications() {
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), categories }),
      })
      setSubscribed(true)
    } catch (err) {
      console.error('[push] enable error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function disableNotifications() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  async function updateCategories(id: CategoryId, val: boolean) {
    const updated = { ...categories, [id]: val }
    setCategories(updated)

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), categories: updated }),
      })
    }
  }

  if (!supported) {
    return <p className="text-sm text-text-muted">Push notifications are not supported in this browser.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text">Push notifications</p>
          <p className="text-xs text-text-muted">
            {subscribed ? 'Enabled on this device' : permission === 'denied' ? 'Blocked — update in browser settings' : 'Disabled'}
          </p>
        </div>
        {permission !== 'denied' && (
          <button
            onClick={subscribed ? disableNotifications : enableNotifications}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={subscribed
              ? { background: 'var(--surface-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--border)' }
              : { background: 'var(--accent)', color: '#fff' }
            }
          >
            {loading ? '…' : subscribed ? 'Disable' : 'Enable'}
          </button>
        )}
      </div>

      {subscribed && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Categories</p>
          {CATEGORIES.map(({ id, label, description }) => (
            <label key={id} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={categories[id as CategoryId]}
                onChange={(e) => updateCategories(id as CategoryId, e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <div>
                <p className="text-sm text-text">{label}</p>
                <p className="text-xs text-text-muted">{description}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
