import { defineEventHandler, getQuery, getRequestHost, setHeader } from 'h3'

import { fetchSkillOgMeta } from '../../og/fetchSkillOgMeta'
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
import { buildSkillOgSvg } from '../../og/skillOgSvg'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = cleanString(query.slug)
  if (!slug) {
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return 'Missing `slug` query param.'
  }

  const params = extractOgParams(query)
  const needFetch = !params.title || !params.description || !params.owner || !params.version
  const meta = needFetch ? await fetchSkillOgMeta(slug, getApiBase(getRequestHost(event))) : null

  const { owner, version, title, description } = mergeMetaWithQuery(params, meta, slug)
  const { ownerLabel, versionLabel } = buildLabels(owner, version, 'clawhub')
  const footer = owner ? `clawhub.ai/${owner}/${slug}` : `clawhub.ai/skills/${slug}`

  setCacheHeaders(event, version)

  const markDataUrl = await getMarkDataUrl()
  const svg = buildSkillOgSvg({
    markDataUrl,
    title,
    description,
    ownerLabel,
    versionLabel,
    footer,
  })

  return renderSvgToPng(svg)
})
