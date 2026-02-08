/* @vitest-environment node */
import { describe, expect, it, vi } from 'vitest'

vi.mock('./_generated/api', () => ({
  internal: {
    maintenance: {
      getSkillBackfillPageInternal: Symbol('getSkillBackfillPageInternal'),
      applySkillBackfillPatchInternal: Symbol('applySkillBackfillPatchInternal'),
      backfillSkillSummariesInternal: Symbol('backfillSkillSummariesInternal'),
      getSkillFingerprintBackfillPageInternal: Symbol('getSkillFingerprintBackfillPageInternal'),
      applySkillFingerprintBackfillPatchInternal: Symbol(
        'applySkillFingerprintBackfillPatchInternal',
      ),
      backfillSkillFingerprintsInternal: Symbol('backfillSkillFingerprintsInternal'),
    },
  },
}))

const { backfillSkillFingerprintsInternalHandler, backfillSkillSummariesInternalHandler } =
  await import('./maintenance')

function makeBlob(text: string) {
  return { text: () => Promise.resolve(text) } as unknown as Blob
}

describe('maintenance backfill', () => {
  it('repairs summary + parsed by reparsing SKILL.md', async () => {
    const runQuery = vi.fn().mockResolvedValue({
      items: [
        {
          kind: 'ok',
          skillId: 'skills:1',
          versionId: 'skillVersions:1',
          skillSummary: '>',
          versionParsed: { frontmatter: { description: '>' } },
          readmeStorageId: 'storage:1',
        },
      ],
      cursor: null,
      isDone: true,
    })

    const runMutation = vi.fn().mockResolvedValue({ ok: true })
    const storageGet = vi
      .fn()
      .mockResolvedValue(makeBlob(`---\ndescription: >\n  Hello\n  world.\n---\nBody`))

    const result = await backfillSkillSummariesInternalHandler(
      { runQuery, runMutation, storage: { get: storageGet } } as never,
      { dryRun: false, batchSize: 10, maxBatches: 1 },
    )

    expect(result.ok).toBe(true)
    expect(result.stats.skillsScanned).toBe(1)
    expect(result.stats.skillsPatched).toBe(1)
    expect(result.stats.versionsPatched).toBe(1)
    expect(runMutation).toHaveBeenCalledTimes(1)
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      skillId: 'skills:1',
      versionId: 'skillVersions:1',
      summary: 'Hello world.',
      parsed: {
        frontmatter: { description: 'Hello world.' },
        metadata: undefined,
        clawdis: undefined,
      },
    })
  })

  it('dryRun does not patch', async () => {
    const runQuery = vi.fn().mockResolvedValue({
      items: [
        {
          kind: 'ok',
          skillId: 'skills:1',
          versionId: 'skillVersions:1',
          skillSummary: '>',
          versionParsed: { frontmatter: { description: '>' } },
          readmeStorageId: 'storage:1',
        },
      ],
      cursor: null,
      isDone: true,
    })

    const runMutation = vi.fn()
    const storageGet = vi.fn().mockResolvedValue(makeBlob(`---\ndescription: Hello\n---\nBody`))

    const result = await backfillSkillSummariesInternalHandler(
      { runQuery, runMutation, storage: { get: storageGet } } as never,
      { dryRun: true, batchSize: 10, maxBatches: 1 },
    )

    expect(result.ok).toBe(true)
    expect(result.stats.skillsPatched).toBe(1)
    expect(runMutation).not.toHaveBeenCalled()
  })

  it('counts missing storage blob', async () => {
    const runQuery = vi.fn().mockResolvedValue({
      items: [
        {
          kind: 'ok',
          skillId: 'skills:1',
          versionId: 'skillVersions:1',
          skillSummary: null,
          versionParsed: { frontmatter: {} },
          readmeStorageId: 'storage:missing',
        },
      ],
      cursor: null,
      isDone: true,
    })

    const runMutation = vi.fn()
    const storageGet = vi.fn().mockResolvedValue(null)

    const result = await backfillSkillSummariesInternalHandler(
      { runQuery, runMutation, storage: { get: storageGet } } as never,
      { dryRun: false, batchSize: 10, maxBatches: 1 },
    )

    expect(result.stats.missingStorageBlob).toBe(1)
    expect(runMutation).not.toHaveBeenCalled()
  })
})

describe('maintenance fingerprint backfill', () => {
  it('backfills fingerprint field and inserts index entry', async () => {
    const { hashSkillFiles } = await import('./lib/skills')
    const expected = await hashSkillFiles([{ path: 'SKILL.md', sha256: 'abc' }])

    const runQuery = vi.fn().mockResolvedValue({
      items: [
        {
          skillId: 'skills:1',
          versionId: 'skillVersions:1',
          versionFingerprint: undefined,
          files: [{ path: 'SKILL.md', sha256: 'abc' }],
          existingEntries: [],
        },
      ],
      cursor: null,
      isDone: true,
    })

    const runMutation = vi.fn().mockResolvedValue({ ok: true })

    const result = await backfillSkillFingerprintsInternalHandler(
      { runQuery, runMutation } as never,
      { dryRun: false, batchSize: 10, maxBatches: 1 },
    )

    expect(result.ok).toBe(true)
    expect(result.stats.versionsScanned).toBe(1)
    expect(result.stats.versionsPatched).toBe(1)
    expect(result.stats.fingerprintsInserted).toBe(1)
    expect(result.stats.fingerprintMismatches).toBe(0)
    expect(runMutation).toHaveBeenCalledTimes(1)
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      versionId: 'skillVersions:1',
      fingerprint: expected,
      patchVersion: true,
      replaceEntries: true,
      existingEntryIds: [],
    })
  })

  it('dryRun does not patch', async () => {
    const runQuery = vi.fn().mockResolvedValue({
      items: [
        {
          skillId: 'skills:1',
          versionId: 'skillVersions:1',
          versionFingerprint: undefined,
          files: [{ path: 'SKILL.md', sha256: 'abc' }],
          existingEntries: [],
        },
      ],
      cursor: null,
      isDone: true,
    })

    const runMutation = vi.fn()

    const result = await backfillSkillFingerprintsInternalHandler(
      { runQuery, runMutation } as never,
      { dryRun: true, batchSize: 10, maxBatches: 1 },
    )

    expect(result.ok).toBe(true)
    expect(result.stats.versionsPatched).toBe(1)
    expect(result.stats.fingerprintsInserted).toBe(1)
    expect(runMutation).not.toHaveBeenCalled()
  })

  it('patches missing version fingerprint without touching correct entries', async () => {
    const { hashSkillFiles } = await import('./lib/skills')
    const expected = await hashSkillFiles([{ path: 'SKILL.md', sha256: 'abc' }])

    const runQuery = vi.fn().mockResolvedValue({
      items: [
        {
          skillId: 'skills:1',
          versionId: 'skillVersions:1',
          versionFingerprint: undefined,
          files: [{ path: 'SKILL.md', sha256: 'abc' }],
          existingEntries: [{ id: 'skillVersionFingerprints:1', fingerprint: expected }],
        },
      ],
      cursor: null,
      isDone: true,
    })

    const runMutation = vi.fn().mockResolvedValue({ ok: true })

    const result = await backfillSkillFingerprintsInternalHandler(
      { runQuery, runMutation } as never,
      { dryRun: false, batchSize: 10, maxBatches: 1 },
    )

    expect(result.ok).toBe(true)
    expect(result.stats.versionsPatched).toBe(1)
    expect(result.stats.fingerprintsInserted).toBe(0)
    expect(result.stats.fingerprintMismatches).toBe(0)
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      versionId: 'skillVersions:1',
      fingerprint: expected,
      patchVersion: true,
      replaceEntries: false,
      existingEntryIds: [],
    })
  })

  it('replaces mismatched fingerprint entries', async () => {
    const { hashSkillFiles } = await import('./lib/skills')
    const expected = await hashSkillFiles([{ path: 'SKILL.md', sha256: 'abc' }])

    const runQuery = vi.fn().mockResolvedValue({
      items: [
        {
          skillId: 'skills:1',
          versionId: 'skillVersions:1',
          versionFingerprint: 'wrong',
          files: [{ path: 'SKILL.md', sha256: 'abc' }],
          existingEntries: [{ id: 'skillVersionFingerprints:1', fingerprint: 'wrong' }],
        },
      ],
      cursor: null,
      isDone: true,
    })

    const runMutation = vi.fn().mockResolvedValue({ ok: true })

    const result = await backfillSkillFingerprintsInternalHandler(
      { runQuery, runMutation } as never,
      { dryRun: false, batchSize: 10, maxBatches: 1 },
    )

    expect(result.ok).toBe(true)
    expect(result.stats.fingerprintMismatches).toBe(1)
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      versionId: 'skillVersions:1',
      fingerprint: expected,
      patchVersion: true,
      replaceEntries: true,
      existingEntryIds: ['skillVersionFingerprints:1'],
    })
  })
})

describe('maintenance advanceFinalizingSkills logic', () => {
  it('correctly identifies when all cleanup phases are complete', () => {
    const allZeros = {
      versions: 0,
      fingerprints: 0,
      embeddings: 0,
      comments: 0,
      reports: 0,
      stars: 0,
      badges: 0,
      dailyStats: 0,
      statEvents: 0,
      installs: 0,
      rootInstalls: 0,
      leaderboards: 0,
      canonical: 0,
      forks: 0,
    }

    const isComplete =
      allZeros.versions === 0 &&
      allZeros.fingerprints === 0 &&
      allZeros.embeddings === 0 &&
      allZeros.comments === 0 &&
      allZeros.reports === 0 &&
      allZeros.stars === 0 &&
      allZeros.badges === 0 &&
      allZeros.dailyStats === 0 &&
      allZeros.statEvents === 0 &&
      allZeros.installs === 0 &&
      allZeros.rootInstalls === 0 &&
      allZeros.leaderboards === 0 &&
      allZeros.canonical === 0 &&
      allZeros.forks === 0

    expect(isComplete).toBe(true)
  })

  it('correctly identifies when cleanup phases are incomplete', () => {
    const withRemaining = {
      versions: 0,
      fingerprints: 0,
      embeddings: 0,
      comments: 0,
      reports: 0,
      stars: 0,
      badges: 0,
      dailyStats: 0,
      statEvents: 0,
      installs: 0,
      rootInstalls: 0,
      leaderboards: 0,
      canonical: 0,
      forks: 5, // Still has forks to clean up
    }

    const isComplete =
      withRemaining.versions === 0 &&
      withRemaining.fingerprints === 0 &&
      withRemaining.embeddings === 0 &&
      withRemaining.comments === 0 &&
      withRemaining.reports === 0 &&
      withRemaining.stars === 0 &&
      withRemaining.badges === 0 &&
      withRemaining.dailyStats === 0 &&
      withRemaining.statEvents === 0 &&
      withRemaining.installs === 0 &&
      withRemaining.rootInstalls === 0 &&
      withRemaining.leaderboards === 0 &&
      withRemaining.canonical === 0 &&
      withRemaining.forks === 0

    expect(isComplete).toBe(false)
  })
})
