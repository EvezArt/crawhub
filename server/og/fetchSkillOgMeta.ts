import { type OgMeta, fetchOgMeta } from './fetchOgMeta'

export type SkillOgMeta = OgMeta

export async function fetchSkillOgMeta(slug: string, apiBase: string): Promise<SkillOgMeta | null> {
  return fetchOgMeta(slug, apiBase, 'skills')
}
