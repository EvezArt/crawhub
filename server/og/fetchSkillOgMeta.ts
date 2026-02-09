import { fetchOgMeta, type OgMeta } from './fetchOgMeta'

export type SkillOgMeta = OgMeta

export async function fetchSkillOgMeta(slug: string, apiBase: string): Promise<SkillOgMeta | null> {
  return fetchOgMeta(slug, apiBase, {
    apiPath: '/api/v1/skills',
    entityField: 'skill',
  })
}
