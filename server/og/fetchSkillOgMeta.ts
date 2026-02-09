import { fetchSkillOgMeta as fetchSkillOgMetaImpl, type OgMeta } from './fetchOgMeta'

export type SkillOgMeta = OgMeta

export async function fetchSkillOgMeta(slug: string, apiBase: string): Promise<SkillOgMeta | null> {
  return fetchSkillOgMetaImpl(slug, apiBase)
}
