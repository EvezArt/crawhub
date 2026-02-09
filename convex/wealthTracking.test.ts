import { describe, expect, it } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from './_generated/api'
import schema from './schema'

describe('Wealth Tracking System', () => {
  it('getUserAssets returns correct structure for user with no assets', async () => {
    const t = convexTest(schema)

    // Create a test user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Test User',
        handle: 'testuser',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })

    // Get assets for new user
    const assets = await t.query(api.wealthTracking.getUserAssets, { userId })

    // Verify structure and values
    expect(assets.userId).toBe(userId)
    expect(assets.totalSkills).toBe(0)
    expect(assets.totalSouls).toBe(0)
    expect(assets.totalDownloads).toBe(0)
    expect(assets.totalStars).toBe(0)
    expect(assets.reputationScore).toBe(0)
    expect(assets.wealthRank).toBe('bronze')
    expect(assets.missingOpportunities).toContain(
      'No skills published - publish your first skill to start building wealth',
    )
  })

  it('getUserAssets calculates correct values with skills', async () => {
    const t = convexTest(schema)

    // Create user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Wealthy User',
        handle: 'wealthyuser',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })

    // Create a skill with stats
    await t.run(async (ctx) => {
      const skillId = await ctx.db.insert('skills', {
        slug: 'test-skill',
        displayName: 'Test Skill',
        ownerUserId: userId,
        tags: {},
        stats: {
          downloads: 100,
          stars: 20,
          installsCurrent: 15,
          installsAllTime: 50,
          versions: 1,
          comments: 5,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      // Add a badge
      await ctx.db.insert('skillBadges', {
        skillId,
        kind: 'official',
        byUserId: userId,
        at: Date.now(),
      })
    })

    const assets = await t.query(api.wealthTracking.getUserAssets, { userId })

    // Verify calculations
    expect(assets.totalSkills).toBe(1)
    expect(assets.totalDownloads).toBe(100)
    expect(assets.totalStars).toBe(20)
    expect(assets.totalInstallsCurrent).toBe(15)
    expect(assets.totalInstallsAllTime).toBe(50)
    expect(assets.totalBadges).toBe(1)

    // Reputation = (100 * 1) + (20 * 5) + (15 * 3) + (50 * 1) + (1 * 50) + (0 * 2)
    // = 100 + 100 + 45 + 50 + 50 = 345
    expect(assets.reputationScore).toBe(345)
    expect(assets.wealthRank).toBe('bronze')

    // Verify skill asset value
    expect(assets.skills).toHaveLength(1)
    const skill = assets.skills[0]
    // Value = (100 * 1) + (20 * 5) + (15 * 3) + (50 * 1) + (1 * 50)
    // = 100 + 100 + 45 + 50 + 50 = 345
    expect(skill.value).toBe(345)
  })

  it('wealth ranks are assigned correctly', async () => {
    const t = convexTest(schema)

    const testCases = [
      { downloads: 100, stars: 20, expectedRank: 'bronze' }, // Score: 200
      { downloads: 250, stars: 50, expectedRank: 'silver' }, // Score: 500
      { downloads: 400, stars: 320, expectedRank: 'gold' }, // Score: 2000
      { downloads: 1000, stars: 800, expectedRank: 'platinum' }, // Score: 5000
      { downloads: 2000, stars: 1600, expectedRank: 'diamond' }, // Score: 10000
    ]

    for (const testCase of testCases) {
      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: `User ${testCase.expectedRank}`,
          handle: `user-${testCase.expectedRank}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      await t.run(async (ctx) => {
        await ctx.db.insert('skills', {
          slug: `skill-${testCase.expectedRank}`,
          displayName: `Skill ${testCase.expectedRank}`,
          ownerUserId: userId,
          tags: {},
          stats: {
            downloads: testCase.downloads,
            stars: testCase.stars,
            versions: 1,
            comments: 0,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      const assets = await t.query(api.wealthTracking.getUserAssets, { userId })
      expect(assets.wealthRank).toBe(testCase.expectedRank)
    }
  })

  it('getWealthLeaderboard orders users correctly', async () => {
    const t = convexTest(schema)

    // Create users with different wealth levels
    const users = await Promise.all(
      [
        { downloads: 100, stars: 10 }, // Score: 150
        { downloads: 500, stars: 50 }, // Score: 750
        { downloads: 200, stars: 30 }, // Score: 350
      ].map(async (stats, i) => {
        const userId = await t.run(async (ctx) => {
          return await ctx.db.insert('users', {
            name: `User ${i}`,
            handle: `user-${i}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        })

        await t.run(async (ctx) => {
          await ctx.db.insert('skills', {
            slug: `skill-${i}`,
            displayName: `Skill ${i}`,
            ownerUserId: userId,
            tags: {},
            stats: {
              downloads: stats.downloads,
              stars: stats.stars,
              versions: 1,
              comments: 0,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        })

        return userId
      }),
    )

    const leaderboard = await t.query(api.wealthTracking.getWealthLeaderboard, {
      limit: 10,
    })

    // Should be ordered by reputation score (descending)
    expect(leaderboard).toHaveLength(3)
    expect(leaderboard[0].reputationScore).toBe(750) // User 1
    expect(leaderboard[1].reputationScore).toBe(350) // User 2
    expect(leaderboard[2].reputationScore).toBe(150) // User 0
  })

  it('discoverOpportunities identifies categories correctly', async () => {
    const t = convexTest(schema)

    // Create some skills in different categories
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Creator',
        handle: 'creator',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })

    // Low competition category (1 skill, high downloads)
    await t.run(async (ctx) => {
      await ctx.db.insert('skills', {
        slug: 'automation-tool',
        displayName: 'Automation Tool',
        ownerUserId: userId,
        tags: {},
        stats: {
          downloads: 500,
          stars: 50,
          versions: 1,
          comments: 0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      // High competition category (multiple skills)
      await ctx.db.insert('skills', {
        slug: 'testing-framework-1',
        displayName: 'Testing Framework 1',
        ownerUserId: userId,
        tags: {},
        stats: {
          downloads: 100,
          stars: 10,
          versions: 1,
          comments: 0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      await ctx.db.insert('skills', {
        slug: 'testing-framework-2',
        displayName: 'Testing Framework 2',
        ownerUserId: userId,
        tags: {},
        stats: {
          downloads: 150,
          stars: 15,
          versions: 1,
          comments: 0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      await ctx.db.insert('skills', {
        slug: 'testing-framework-3',
        displayName: 'Testing Framework 3',
        ownerUserId: userId,
        tags: {},
        stats: {
          downloads: 200,
          stars: 20,
          versions: 1,
          comments: 0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })

    const opportunities = await t.query(api.wealthTracking.discoverOpportunities, {})

    expect(opportunities.opportunities.length).toBeGreaterThan(0)
    expect(opportunities.totalCategories).toBeGreaterThan(0)

    // Automation should be high value (low competition, high downloads)
    const automationOpp = opportunities.opportunities.find((o) => o.category === 'automation')
    if (automationOpp) {
      expect(automationOpp.competition).toBe('low')
      expect(automationOpp.totalSkills).toBe(1)
    }
  })

  it('getWealthHistory tracks accumulation over time', async () => {
    const t = convexTest(schema)

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', {
        name: 'Growing User',
        handle: 'growinguser',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })

    const skillId = await t.run(async (ctx) => {
      return await ctx.db.insert('skills', {
        slug: 'growing-skill',
        displayName: 'Growing Skill',
        ownerUserId: userId,
        tags: {},
        stats: {
          downloads: 300,
          stars: 30,
          versions: 1,
          comments: 0,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })

    // Add daily stats
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000

    await t.run(async (ctx) => {
      await ctx.db.insert('skillDailyStats', {
        skillId,
        day: twoDaysAgo,
        downloads: 100,
        installs: 10,
        updatedAt: twoDaysAgo,
      })

      await ctx.db.insert('skillDailyStats', {
        skillId,
        day: oneDayAgo,
        downloads: 100,
        installs: 15,
        updatedAt: oneDayAgo,
      })

      await ctx.db.insert('skillDailyStats', {
        skillId,
        day: now,
        downloads: 100,
        installs: 20,
        updatedAt: now,
      })
    })

    const history = await t.query(api.wealthTracking.getWealthHistory, {
      userId,
      days: 3,
    })

    expect(history.history).toHaveLength(3)
    expect(history.totalGrowth.downloads).toBe(300)
    expect(history.totalGrowth.installs).toBe(45)
    expect(history.currentRate).toBeDefined()
    expect(history.currentRate!.downloadsPerDay).toBe(100)
    expect(history.currentRate!.installsPerDay).toBe(15)
  })
})
