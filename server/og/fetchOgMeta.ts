export type OgMeta = {
  displayName: string | null
  summary: string | null
  owner: string | null
  version: string | null
}

type EntityType = 'skills' | 'souls'

type EntityPayload = {
  skill?: { displayName?: string; summary?: string | null } | null
  soul?: { displayName?: string; summary?: string | null } | null
  owner?: { handle?: string | null } | null
  latestVersion?: { version?: string | null } | null
}

export async function fetchOgMeta(
  slug: string,
  apiBase: string,
  entityType: EntityType,
): Promise<OgMeta | null> {
  try {
    const url = new URL(`/api/v1/${entityType}/${encodeURIComponent(slug)}`, apiBase)
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    const payload = (await response.json()) as EntityPayload

    const entity = entityType === 'skills' ? payload.skill : payload.soul

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
