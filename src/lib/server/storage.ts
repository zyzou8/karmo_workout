import { promises as fs } from 'fs'
import https from 'https'
import path from 'path'

/**
 * Key/value JSON file storage. Two backends:
 *  - local (default): files under DATA_DIR (default ./data)
 *  - nas: a Synology NAS, via the DSM FileStation web API
 * Select with STORAGE_BACKEND=local|nas.
 */
export interface Storage {
  read(name: string): Promise<string | null>
  write(name: string, content: string): Promise<void>
}

function assertSafeName(name: string) {
  if (!/^[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)*$/.test(name) || name.includes('..')) {
    throw new Error(`unsafe storage name: ${name}`)
  }
}

class LocalStorage implements Storage {
  constructor(private root: string) {}

  async read(name: string) {
    assertSafeName(name)
    try {
      return await fs.readFile(path.join(this.root, name), 'utf8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw e
    }
  }

  async write(name: string, content: string) {
    assertSafeName(name)
    const target = path.join(this.root, name)
    await fs.mkdir(path.dirname(target), { recursive: true })
    // Write-then-rename so a crash never leaves a half-written file.
    const tmp = `${target}.${process.pid}.tmp`
    await fs.writeFile(tmp, content, 'utf8')
    await fs.rename(tmp, target)
  }
}

interface RawResponse { status: number; contentType: string; body: Buffer }

class SynologyStorage implements Storage {
  private sid: string | null = null
  // NAS on the LAN typically uses a self-signed certificate; trust is scoped to this agent only.
  private agent = new https.Agent({ rejectUnauthorized: process.env.NAS_TLS_VERIFY === 'true', keepAlive: true, maxSockets: 4 })

  constructor(private baseUrl: string, private user: string, private password: string, private dir: string) {}

  private request(url: string, opts: { method?: string; headers?: Record<string, string>; body?: Buffer } = {}): Promise<RawResponse> {
    return new Promise((resolve, reject) => {
      const req = https.request(url, { method: opts.method || 'GET', headers: opts.headers, agent: this.agent, timeout: 15000 }, res => {
        const chunks: Buffer[] = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode || 0, contentType: String(res.headers['content-type'] || ''), body: Buffer.concat(chunks) }))
        res.on('error', reject)
      })
      req.on('timeout', () => req.destroy(new Error('NAS request timed out')))
      req.on('error', reject)
      if (opts.body) req.write(opts.body)
      req.end()
    })
  }

  private api(cgi: string, params: Record<string, string>) {
    return `${this.baseUrl}/webapi/${cgi}?${new URLSearchParams(params).toString()}`
  }

  private async login(): Promise<string> {
    const res = await this.request(this.api('auth.cgi', {
      api: 'SYNO.API.Auth', version: '6', method: 'login',
      account: this.user, passwd: this.password, session: 'FileStation', format: 'sid',
    }))
    const json = JSON.parse(res.body.toString('utf8'))
    if (!json.success) throw new Error(`NAS login failed (code ${json.error?.code})`)
    this.sid = json.data.sid as string
    return this.sid
  }

  /** Run fn with a session id, logging in again once if the session expired. */
  private async withSid<T>(fn: (sid: string) => Promise<T>): Promise<T> {
    const sid = this.sid || (await this.login())
    try {
      return await fn(sid)
    } catch (e) {
      if ((e as Error).message === 'NAS_SESSION') return fn(await this.login())
      throw e
    }
  }

  private static check(res: RawResponse) {
    // DSM doesn't always label its JSON replies (upload answers as text/plain), so sniff the body.
    if (res.contentType.includes('octet-stream')) return null
    let json
    try { json = JSON.parse(res.body.toString('utf8')) } catch { return null }
    if (typeof json !== 'object' || json === null || !('success' in json)) return null
    if (!json.success) {
      const code = json.error?.code
      if (code === 105 || code === 106 || code === 107 || code === 119) throw new Error('NAS_SESSION')
      throw new Error(`NAS API error (code ${code})`)
    }
    return json
  }

  private fullPath(name: string) {
    assertSafeName(name)
    return `${this.dir}/${name}`
  }

  async read(name: string) {
    const full = this.fullPath(name)
    return this.withSid(async sid => {
      const res = await this.request(this.api('entry.cgi', {
        api: 'SYNO.FileStation.Download', version: '2', method: 'download', path: full, mode: 'download', _sid: sid,
      }))
      if (res.contentType.includes('application/octet-stream')) return res.body.toString('utf8')
      SynologyStorage.check(res) // throws on API errors such as an expired session
      // DSM answers a missing file with a bare HTTP error page, so confirm before treating it as absent.
      const info = SynologyStorage.check(await this.request(this.api('entry.cgi', {
        api: 'SYNO.FileStation.List', version: '2', method: 'getinfo', path: JSON.stringify([full]), _sid: sid,
      })))
      if (info?.data?.files?.[0]?.code === 408) return null
      throw new Error(`NAS download failed (HTTP ${res.status})`)
    })
  }

  async write(name: string, content: string) {
    const full = this.fullPath(name)
    const folder = full.slice(0, full.lastIndexOf('/'))
    const filename = full.slice(full.lastIndexOf('/') + 1)
    return this.withSid(async sid => {
      const boundary = `----karmo${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
      const fields: Record<string, string> = {
        api: 'SYNO.FileStation.Upload', version: '2', method: 'upload',
        path: folder, create_parents: 'true', overwrite: 'true',
      }
      const parts: Buffer[] = []
      for (const [k, v] of Object.entries(fields)) {
        parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
      }
      // The file part must come last for FileStation.
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`))
      parts.push(Buffer.from(content, 'utf8'))
      parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
      const body = Buffer.concat(parts)
      const res = await this.request(`${this.baseUrl}/webapi/entry.cgi?_sid=${encodeURIComponent(sid)}`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': String(body.length) },
        body,
      })
      if (!SynologyStorage.check(res)) throw new Error(`NAS upload failed (HTTP ${res.status})`)
    })
  }
}

let instance: Storage | null = null

export function getStorage(): Storage {
  if (instance) return instance
  if (process.env.STORAGE_BACKEND === 'nas') {
    const { NAS_URL, NAS_USER, NAS_PASSWORD } = process.env
    if (!NAS_URL || !NAS_USER || !NAS_PASSWORD) throw new Error('STORAGE_BACKEND=nas requires NAS_URL, NAS_USER and NAS_PASSWORD')
    instance = new SynologyStorage(NAS_URL.replace(/\/+$/, ''), NAS_USER, NAS_PASSWORD, (process.env.NAS_DIR || '/home/karmo_data').replace(/\/+$/, ''))
  } else {
    instance = new LocalStorage(path.resolve(process.env.DATA_DIR || './data'))
  }
  return instance
}

/** Serialise read-modify-write cycles per file within this server process. */
const locks = new Map<string, Promise<unknown>>()
export function withFileLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(name) || Promise.resolve()
  const next = prev.catch(() => {}).then(fn)
  locks.set(name, next)
  next.finally(() => { if (locks.get(name) === next) locks.delete(name) }).catch(() => {})
  return next
}
