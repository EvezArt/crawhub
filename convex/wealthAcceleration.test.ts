/**
 * Tests for Wealth Acceleration System
 */

import { convexTest } from 'convex-test'
import { expect, it } from 'vitest'
import schema from './schema'
import { getWealthAccelerationPlan, simulateWealthBoost, getAchievements, getPersonalizedStrategy } from './wealthAcceleration'

it('should calculate acceleration plan to platinum rank', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'testuser',
      displayName: 'Test User',
      githubId: 12345,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create a skill with some reputation
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'test-skill',
      displayName: 'Test Skill',
      ownerUserId: userId,
      stats: {
        downloads: 100,
        stars: 20,
        installsCurrent: 10,
        installsAllTime: 50,
      },
    })
  })

  // Get acceleration plan to platinum
  const plan = await t.query(getWealthAccelerationPlan, {
    userId,
    targetRank: 'platinum',
  })

  expect(plan).toBeDefined()
  expect(plan.currentRank).toBe('bronze')
  expect(plan.targetRank).toBe('platinum')
  expect(plan.targetReputation).toBe(5000)
  expect(plan.gap).toBeGreaterThan(0)
  expect(plan.recommendedActions).toBeDefined()
  expect(plan.recommendedActions.length).toBeGreaterThan(0)
})

it('should simulate wealth boost correctly', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'testuser2',
      displayName: 'Test User 2',
      githubId: 12346,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create a skill
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'test-skill-2',
      displayName: 'Test Skill 2',
      ownerUserId: userId,
      stats: {
        downloads: 50,
        stars: 10,
        installsCurrent: 5,
        installsAllTime: 25,
      },
    })
  })

  // Simulate adding badges and stars
  const simulation = await t.query(simulateWealthBoost, {
    userId,
    actions: [
      { action: 'earn_badges', quantity: 5 },  // +250 points
      { action: 'boost_stars', quantity: 100 }, // +500 points
    ],
  })

  expect(simulation).toBeDefined()
  expect(simulation.gain).toBe(750) // 250 + 500
  expect(simulation.projectedReputation).toBeGreaterThan(simulation.currentReputation)
})

it('should return achievement list', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'testuser3',
      displayName: 'Test User 3',
      githubId: 12347,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Get achievements
  const achievements = await t.query(getAchievements, { userId })

  expect(achievements).toBeDefined()
  expect(achievements.achievements).toBeDefined()
  expect(achievements.totalCount).toBe(11) // We defined 11 achievements
  expect(achievements.unlockedCount).toBeGreaterThanOrEqual(0)
})

it('should provide personalized strategy', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'testuser4',
      displayName: 'Test User 4',
      githubId: 12348,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create multiple skills
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'skill-1',
      displayName: 'Skill 1',
      ownerUserId: userId,
      stats: {
        downloads: 100,
        stars: 20,
        installsCurrent: 10,
        installsAllTime: 50,
      },
    })

    await ctx.db.insert('skills', {
      slug: 'skill-2',
      displayName: 'Skill 2',
      ownerUserId: userId,
      stats: {
        downloads: 50,
        stars: 5,
        installsCurrent: 3,
        installsAllTime: 20,
      },
    })
  })

  // Get personalized strategy
  const strategy = await t.query(getPersonalizedStrategy, { userId })

  expect(strategy).toBeDefined()
  expect(strategy.currentRank).toBeDefined()
  expect(strategy.strategy).toBeDefined()
  expect(strategy.strategy.length).toBeGreaterThan(0)
  expect(strategy.keyMetrics).toBeDefined()
  expect(strategy.keyMetrics.totalSkills).toBe(2)
})

it('should detect diamond rank achievement', async () => {
  const t = convexTest(schema)

  // Create test user with high reputation
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'diamond-user',
      displayName: 'Diamond User',
      githubId: 99999,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skills that give 10,000+ reputation
  await t.run(async (ctx) => {
    // Create 5 skills with 2000 stars each = 10,000 points
    for (let i = 0; i < 5; i++) {
      await ctx.db.insert('skills', {
        slug: `diamond-skill-${i}`,
        displayName: `Diamond Skill ${i}`,
        ownerUserId: userId,
        stats: {
          downloads: 0,
          stars: 2000,
          installsCurrent: 0,
          installsAllTime: 0,
        },
      })
    }
  })

  // Simulate and verify diamond rank is achievable
  const simulation = await t.query(simulateWealthBoost, {
    userId,
    actions: [],
  })

  expect(simulation.currentReputation).toBeGreaterThanOrEqual(10000)
  expect(simulation.currentRank).toBe('diamond')
})
