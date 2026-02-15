import { type OgMeta, fetchOgMeta } from './fetchOgMeta'

export type SoulOgMeta = OgMeta

export async function fetchSoulOgMeta(slug: string, apiBase: string): Promise<SoulOgMeta | null> {
  return fetchOgMeta(slug, apiBase, 'souls')
}
