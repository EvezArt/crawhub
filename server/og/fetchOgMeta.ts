export type OgMeta = {
  displayName: string | null
  summary: string | null
  owner: string | null
  version: string | null
}

type OgMetaOptions = {
  entityType: 'skills' | 'souls'
  entityKey: 'skill' | 'soul'
}

export async function fetchOgMeta(
  slug: string,
  apiBase: string,
  options: OgMetaOptions,
): Promise<OgMeta | null> {
  try {
    const url = new URL(`/api/v1/${options.entityType}/${encodeURIComponent(slug)}`, apiBase)
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const payload = (await response.json()) as {
      [key: string]: { displayName?: string; summary?: string | null } | null | undefined
      owner?: { handle?: string | null } | null
      latestVersion?: { version?: string | null } | null
    }
    const entity = payload[options.entityKey]
    return {
      displayName: entity?.displayName ?? null,
      summary: entity?.summary ?? null,
      owner: payload.owner?.handle ?? null,
      version: payload.latestVersion?.version ?? null,
    }
  } catch {
    return null
  }
}

export async function fetchSkillOgMeta(slug: string, apiBase: string): Promise<OgMeta | null> {
  return fetchOgMeta(slug, apiBase, { entityType: 'skills', entityKey: 'skill' })
}

export async function fetchSoulOgMeta(slug: string, apiBase: string): Promise<OgMeta | null> {
  return fetchOgMeta(slug, apiBase, { entityType: 'souls', entityKey: 'soul' })
}
