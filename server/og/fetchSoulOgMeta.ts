import { fetchSoulOgMeta as fetchSoulOgMetaImpl, type OgMeta } from './fetchOgMeta'

export type SoulOgMeta = OgMeta

export async function fetchSoulOgMeta(slug: string, apiBase: string): Promise<SoulOgMeta | null> {
  return fetchSoulOgMetaImpl(slug, apiBase)
}
