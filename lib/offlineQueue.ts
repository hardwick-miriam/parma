import Dexie, { type Table } from 'dexie'

export interface QueuedLog {
  id?: number
  text: string
  date: string        // YYYY-MM-DD
  timezone: string
  createdAt: number   // Date.now()
  attempts: number
}

class ParmaDB extends Dexie {
  logQueue!: Table<QueuedLog>

  constructor() {
    super('parma')
    this.version(1).stores({
      logQueue: '++id, createdAt',
    })
  }
}

let _db: ParmaDB | null = null

function db(): ParmaDB {
  if (!_db) _db = new ParmaDB()
  return _db
}

export async function enqueueLog(log: Omit<QueuedLog, 'id' | 'attempts'>): Promise<number> {
  return db().logQueue.add({ ...log, attempts: 0 })
}

export async function getPendingLogs(): Promise<QueuedLog[]> {
  return db().logQueue.orderBy('createdAt').toArray()
}

export async function dequeueLog(id: number): Promise<void> {
  return db().logQueue.delete(id)
}

export async function incrementAttempts(id: number): Promise<void> {
  await db().logQueue.where('id').equals(id).modify((item) => { item.attempts++ })
}

export async function pendingCount(): Promise<number> {
  return db().logQueue.count()
}

/**
 * Try to flush all queued logs through the normal parse flow.
 * Called on reconnect.
 */
export async function flushQueue(
  onFlushed: (text: string) => void,
  onFailed: (text: string, err: string) => void
): Promise<void> {
  const items = await getPendingLogs()
  for (const item of items) {
    try {
      const res = await fetch('/api/parse-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text, date: item.date, timezone: item.timezone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'parse failed')

      const { saveLog } = await import('@/app/actions')
      await saveLog(item.text, data.parsed)
      await dequeueLog(item.id!)
      onFlushed(item.text)
    } catch (err) {
      await incrementAttempts(item.id!)
      onFailed(item.text, String(err))
    }
  }
}
