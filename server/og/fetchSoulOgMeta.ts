import { fetchOgMeta, type OgMeta } from './fetchOgMeta'

export type SoulOgMeta = OgMeta

export async function fetchSoulOgMeta(slug: string, apiBase: string): Promise<SoulOgMeta | null> {
  return fetchOgMeta(slug, apiBase, {
    apiPath: '/api/v1/souls',
    entityField: 'soul',
  })
}
