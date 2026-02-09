const encoder = new TextEncoder()

export const API_TOKEN_PREFIX = 'clh_'
export const QUANTUM_TOKEN_PREFIX = 'clhq_'

export async function hashToken(token: string) {
  const bytes = encoder.encode(token)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(new Uint8Array(digest))
}

export function generateToken(type: 'standard' | 'quantum' = 'standard') {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const prefix = type === 'quantum' ? QUANTUM_TOKEN_PREFIX : API_TOKEN_PREFIX
  const token = `${prefix}${toBase64Url(bytes)}`
  const tokenPrefix = token.slice(0, type === 'quantum' ? 13 : 12)
  return { token, prefix: tokenPrefix, type }
}

function toHex(bytes: Uint8Array) {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

function toBase64Url(bytes: Uint8Array) {
  const base64 = toBase64(bytes)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toBase64(bytes: Uint8Array) {
  let output = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const triple = (a << 16) | (b << 8) | c
    output += BASE64_ALPHABET[(triple >> 18) & 63]
    output += BASE64_ALPHABET[(triple >> 12) & 63]
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(triple >> 6) & 63] : '='
    output += i + 2 < bytes.length ? BASE64_ALPHABET[triple & 63] : '='
  }
  return output
}

export const __test = {
  toHex,
  toBase64,
  toBase64Url,
}
