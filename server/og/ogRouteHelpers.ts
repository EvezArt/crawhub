import { initWasm, Resvg } from '@resvg/resvg-wasm'
import type { H3Event } from 'h3'
import { setHeader } from 'h3'

import type { OgMeta } from './fetchOgMeta'
import { FONT_MONO, FONT_SANS, getFontBuffers, getResvgWasm } from './ogAssets'

let wasmInitPromise: Promise<void> | null = null

export function cleanString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export function getApiBase(eventHost: string | null) {
  const direct = process.env.VITE_CONVEX_SITE_URL?.trim()
  if (direct) return direct

  const site = process.env.SITE_URL?.trim() || process.env.VITE_SITE_URL?.trim()
  if (site) return site

  if (eventHost) return `https://${eventHost}`
  return 'https://clawhub.ai'
}

export async function ensureWasm() {
  if (!wasmInitPromise) {
    wasmInitPromise = getResvgWasm().then((wasm) => initWasm(wasm))
  }
  await wasmInitPromise
}

export type OgRouteParams = {
  slug: string
  owner: string
  version: string
  title: string
  description: string
}

export function extractOgParams(query: Record<string, unknown>): Partial<OgRouteParams> {
  return {
    slug: cleanString(query.slug),
    owner: cleanString(query.owner),
    version: cleanString(query.version),
    title: cleanString(query.title),
    description: cleanString(query.description),
  }
}

export function setCacheHeaders(event: H3Event, version: string) {
  const cacheKey = version ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
  setHeader(event, 'Cache-Control', cacheKey)
  setHeader(event, 'Content-Type', 'image/png')
}

export function buildLabels(
  owner: string,
  version: string,
  defaultOwner: string,
): { ownerLabel: string; versionLabel: string } {
  return {
    ownerLabel: owner ? `@${owner}` : defaultOwner,
    versionLabel: version ? `v${version}` : 'latest',
  }
}

export async function renderSvgToPng(svg: string): Promise<Uint8Array> {
  await ensureWasm()
  const fontBuffers = await getFontBuffers()

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontBuffers,
      defaultFontFamily: FONT_SANS,
      sansSerifFamily: FONT_SANS,
      monospaceFamily: FONT_MONO,
    },
  })
  const png = resvg.render().asPng()
  resvg.free()
  return png
}

export function mergeMetaWithQuery(
  params: Partial<OgRouteParams>,
  meta: OgMeta | null,
  slug: string,
): { owner: string; version: string; title: string; description: string } {
  return {
    owner: params.owner || meta?.owner || '',
    version: params.version || meta?.version || '',
    title: params.title || meta?.displayName || slug,
    description: params.description || meta?.summary || '',
  }
}
