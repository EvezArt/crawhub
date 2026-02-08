/**
 * Test for AI-usable API types and structures
 */

import { describe, it, expect } from 'vitest'
import { CRAWFATHER_SKILL } from '../crawfather-skill'
import { toSkillRecord } from './skill'
import type { SkillStats, SkillCapability, SkillMeta } from './skill'

describe('AI-usable skill types', () => {
  it('should have correct SkillStats structure', () => {
    const stats: SkillStats = {
      downloads: 100,
      stars: 50,
      installsAllTime: 200,
      versions: 5,
    }
    expect(stats.downloads).toBe(100)
    expect(stats.installsAllTime).toBe(200)
  })

  it('should have correct SkillCapability structure', () => {
    const capability: SkillCapability = {
      id: 'test.capability',
      verbs: ['scan', 'plan'],
      resources: ['github', 'agents'],
    }
    expect(capability.verbs).toHaveLength(2)
    expect(capability.resources).toContain('github')
  })

  it('should have correct SkillMeta structure', () => {
    const meta: SkillMeta = {
      id: 'test-skill',
      name: 'Test Skill',
      description: 'A test skill',
      category: 'testing',
      tags: ['test', 'example'],
      capability: {
        id: 'test.capability',
        verbs: ['test'],
        resources: ['code'],
      },
    }
    expect(meta.id).toBe('test-skill')
    expect(meta.capability?.verbs).toContain('test')
  })

  it('should have valid CrawFather skill record', () => {
    expect(CRAWFATHER_SKILL).toBeDefined()
    expect(CRAWFATHER_SKILL.meta.id).toBe('crawfather-survival-pack')
    expect(CRAWFATHER_SKILL.meta.name).toBe('CrawFather Survival Pack')
    expect(CRAWFATHER_SKILL.meta.capability).toBeDefined()
    expect(CRAWFATHER_SKILL.meta.capability?.id).toBe('crawfather.meta_survival')
    expect(CRAWFATHER_SKILL.meta.capability?.verbs).toContain('scan')
    expect(CRAWFATHER_SKILL.meta.capability?.resources).toContain('github')
    expect(CRAWFATHER_SKILL.stats.installsAllTime).toBe(0)
  })

  it('should convert skill document to SkillRecord', () => {
    const mockSkill = {
      _id: 'skill123' as any,
      _creationTime: Date.now(),
      slug: 'test-skill',
      displayName: 'Test Skill',
      summary: 'A test skill',
      ownerUserId: 'user123' as any,
      tags: { latest: 'v1' as any },
      stats: {
        downloads: 100,
        stars: 50,
        installsAllTime: 200,
        versions: 5,
        comments: 10,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const record = toSkillRecord(mockSkill, 'testuser', '1.0.0')

    expect(record.meta.id).toBe('test-skill')
    expect(record.meta.name).toBe('Test Skill')
    expect(record.stats.downloads).toBe(100)
    expect(record.stats.installsAllTime).toBe(200)
    expect(record.ownerHandle).toBe('testuser')
    expect(record.latestVersion).toBe('1.0.0')
  })
})
