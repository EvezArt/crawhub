/**
 * Generic factory for fetching OG metadata for skills and souls
 */

export type OgMeta = {
  displayName: string | null
  summary: string | null
  owner: string | null
  version: string | null
}

type EntityPayload = {
  displayName?: string
  summary?: string | null
}

type OwnerPayload = {
  handle?: string | null
}

type VersionPayload = {
  version?: string | null
}

type FetchOgMetaOptions = {
  apiPath: string
  entityField: string
}

export async function fetchOgMeta(
  slug: string,
  apiBase: string,
  options: FetchOgMetaOptions,
): Promise<OgMeta | null> {
  try {
    const url = new URL(`${options.apiPath}/${encodeURIComponent(slug)}`, apiBase)
    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!response.ok) return null

    const payload = (await response.json()) as {
      [key: string]: EntityPayload | OwnerPayload | VersionPayload | null | undefined
    }

    const entity = payload[options.entityField] as EntityPayload | null | undefined
    const owner = payload.owner as OwnerPayload | null | undefined
    const latestVersion = payload.latestVersion as VersionPayload | null | undefined

    return {
      displayName: entity?.displayName ?? null,
      summary: entity?.summary ?? null,
      owner: owner?.handle ?? null,
      version: latestVersion?.version ?? null,
    }
  } catch {
    return null
  }
}
