import { defineEventHandler, getQuery, getRequestHost, setHeader } from 'h3'

import { fetchSoulOgMeta } from '../../og/fetchSoulOgMeta'
import { getMarkDataUrl } from '../../og/ogAssets'
import {
  buildLabels,
  cleanString,
  extractOgParams,
  getApiBase,
  mergeMetaWithQuery,
  renderSvgToPng,
  setCacheHeaders,
} from '../../og/ogRouteHelpers'
import { buildSoulOgSvg } from '../../og/soulOgSvg'

function buildFooter(slug: string, owner: string | null) {
  if (owner) return `@${owner}/${slug}`
  return `souls/${slug}`
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = cleanString(query.slug)
  if (!slug) {
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return 'Missing `slug` query param.'
  }

  const params = extractOgParams(query)
  const needFetch = !params.title || !params.description || !params.owner || !params.version
  const meta = needFetch ? await fetchSoulOgMeta(slug, getApiBase(getRequestHost(event))) : null

  const { owner, version, title, description } = mergeMetaWithQuery(params, meta, slug)
  const { ownerLabel, versionLabel } = buildLabels(owner, version, 'SoulHub')
  const footer = buildFooter(slug, owner || null)

  setCacheHeaders(event, version)

  const markDataUrl = await getMarkDataUrl()
  const svg = buildSoulOgSvg({
    markDataUrl,
    title,
    description,
    ownerLabel,
    versionLabel,
    footer,
  })

  return renderSvgToPng(svg)
})
