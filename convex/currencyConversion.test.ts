/**
 * Tests for Currency Conversion & Instant Arbitrage System
 */

import { convexTest } from 'convex-test'
import { expect, it } from 'vitest'
import schema from './schema'
import {
  getUSDValuation,
  instantArbitrage,
  liquidateSkill,
  liquidateSoul,
  previewArbitrage,
  getExchangeRates,
  EXCHANGE_RATES,
} from './currencyConversion'

it('should calculate USD valuation correctly for bronze user', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'bronzeuser',
      displayName: 'Bronze User',
      githubId: 50001,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create 2 skills with modest stats
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'skill-1',
      displayName: 'Skill 1',
      ownerUserId: userId,
      stats: {
        downloads: 25,
        stars: 5,
        installsCurrent: 3,
        installsAllTime: 15,
      },
    })

    await ctx.db.insert('skills', {
      slug: 'skill-2',
      displayName: 'Skill 2',
      ownerUserId: userId,
      stats: {
        downloads: 25,
        stars: 5,
        installsCurrent: 2,
        installsAllTime: 10,
      },
    })
  })

  // Create 1 soul
  await t.run(async (ctx) => {
    await ctx.db.insert('souls', {
      slug: 'soul-1',
      displayName: 'Soul 1',
      ownerUserId: userId,
      stats: {
        downloads: 0,
        stars: 0,
      },
    })
  })

  // Get valuation
  const valuation = await t.query(getUSDValuation, { userId })

  expect(valuation.userId).toBe(userId)
  expect(valuation.breakdown.skills.count).toBe(2)
  expect(valuation.breakdown.souls.count).toBe(1)
  expect(valuation.breakdown.downloads.count).toBe(50)
  expect(valuation.breakdown.stars.count).toBe(10)

  // Check USD values
  expect(valuation.breakdown.skills.valueUSD).toBe(2 * EXCHANGE_RATES.SKILL) // 2 × $5
  expect(valuation.breakdown.souls.valueUSD).toBe(1 * EXCHANGE_RATES.SOUL) // 1 × $2
  expect(valuation.breakdown.downloads.valueUSD).toBe(50 * EXCHANGE_RATES.DOWNLOAD) // $0.50
  expect(valuation.breakdown.stars.valueUSD).toBe(10 * EXCHANGE_RATES.STAR) // $0.50

  // Check reputation calculation
  const expectedReputation = 50 * 1 + 10 * 5 + 5 * 3 + 25 * 1
  expect(valuation.reputationPoints).toBe(expectedReputation) // 50 + 50 + 15 + 25 = 140
  expect(valuation.reputationValueUSD).toBe(expectedReputation * EXCHANGE_RATES.REPUTATION_TO_USD)

  // Total USD should be sum of all components
  expect(valuation.totalUSD).toBeGreaterThan(0)
})

it('should calculate USD valuation for diamond rank user', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'diamonduser',
      displayName: 'Diamond User',
      githubId: 50002,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create 10 skills with high stats
  await t.run(async (ctx) => {
    for (let i = 0; i < 10; i++) {
      const skillId = await ctx.db.insert('skills', {
        slug: `diamond-skill-${i}`,
        displayName: `Diamond Skill ${i}`,
        ownerUserId: userId,
        stats: {
          downloads: 500,
          stars: 80,
          installsCurrent: 30,
          installsAllTime: 200,
        },
      })

      // Add a badge to some skills
      if (i < 8) {
        await ctx.db.insert('skillBadges', {
          skillId,
          kind: 'official',
          awardedByUserId: userId,
          awardedAt: Date.now(),
        })
      }
    }
  })

  // Create 5 souls
  await t.run(async (ctx) => {
    for (let i = 0; i < 5; i++) {
      await ctx.db.insert('souls', {
        slug: `soul-${i}`,
        displayName: `Soul ${i}`,
        ownerUserId: userId,
        stats: {
          downloads: 0,
          stars: 0,
        },
      })
    }
  })

  // Get valuation
  const valuation = await t.query(getUSDValuation, { userId })

  expect(valuation.breakdown.skills.count).toBe(10)
  expect(valuation.breakdown.souls.count).toBe(5)
  expect(valuation.breakdown.badges.count).toBe(8)

  // Should have substantial value
  expect(valuation.totalUSD).toBeGreaterThan(100)
  expect(valuation.reputationPoints).toBeGreaterThan(10000) // Diamond rank
})

it('should perform instant arbitrage correctly', async () => {
  const t = convexTest(schema)

  // Create test user with reputation
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'arbitrageuser',
      displayName: 'Arbitrage User',
      githubId: 50003,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill with 1000 reputation points
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'high-value-skill',
      displayName: 'High Value Skill',
      ownerUserId: userId,
      stats: {
        downloads: 1000,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })
  })

  // Perform arbitrage for 500 points
  const result = await t.mutation(instantArbitrage, {
    userId,
    pointsToExchange: 500,
  })

  expect(result.success).toBe(true)
  expect(result.transaction.pointsExchanged).toBe(500)
  expect(result.transaction.usdAmount).toBe(500 * EXCHANGE_RATES.REPUTATION_TO_USD) // $5.00
  expect(result.transaction.status).toBe('completed')
  expect(result.remainingReputation).toBe(500)
  expect(result.message).toContain('Successfully exchanged')
})

it('should reject arbitrage with insufficient reputation', async () => {
  const t = convexTest(schema)

  // Create test user with low reputation
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'pooruser',
      displayName: 'Poor User',
      githubId: 50004,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill with only 100 reputation
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'low-value',
      displayName: 'Low Value',
      ownerUserId: userId,
      stats: {
        downloads: 100,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })
  })

  // Try to exchange 500 points (more than available)
  await expect(
    t.mutation(instantArbitrage, {
      userId,
      pointsToExchange: 500,
    }),
  ).rejects.toThrow('Insufficient reputation')
})

it('should liquidate skill correctly', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'liquidateuser',
      displayName: 'Liquidate User',
      githubId: 50005,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create valuable skill
  const skillId = await t.run(async (ctx) => {
    const id = await ctx.db.insert('skills', {
      slug: 'valuable-skill',
      displayName: 'Valuable Skill',
      ownerUserId: userId,
      stats: {
        downloads: 200,
        stars: 50,
        installsCurrent: 20,
        installsAllTime: 100,
      },
    })

    // Add 2 badges
    await ctx.db.insert('skillBadges', {
      skillId: id,
      kind: 'official',
      awardedByUserId: userId,
      awardedAt: Date.now(),
    })
    await ctx.db.insert('skillBadges', {
      skillId: id,
      kind: 'highlighted',
      awardedByUserId: userId,
      awardedAt: Date.now(),
    })

    return id
  })

  // Liquidate skill
  const result = await t.mutation(liquidateSkill, { skillId })

  expect(result.success).toBe(true)
  expect(result.skillDetails.name).toBe('Valuable Skill')
  expect(result.skillDetails.baseValueUSD).toBe(EXCHANGE_RATES.SKILL) // $5.00

  // Reputation: 200×1 + 50×5 + 20×3 + 100×1 + 2×50 = 200 + 250 + 60 + 100 + 100 = 710
  expect(result.skillDetails.reputationPoints).toBe(710)
  expect(result.skillDetails.reputationValueUSD).toBe(710 * EXCHANGE_RATES.REPUTATION_TO_USD) // $7.10
  expect(result.skillDetails.totalUSD).toBe(EXCHANGE_RATES.SKILL + 710 * EXCHANGE_RATES.REPUTATION_TO_USD) // $12.10
})

it('should liquidate soul correctly', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'souluser',
      displayName: 'Soul User',
      githubId: 50006,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create soul
  const soulId = await t.run(async (ctx) => {
    return await ctx.db.insert('souls', {
      slug: 'valuable-soul',
      displayName: 'Valuable Soul',
      ownerUserId: userId,
      stats: {
        downloads: 100,
        stars: 20,
      },
    })
  })

  // Liquidate soul
  const result = await t.mutation(liquidateSoul, { soulId })

  expect(result.success).toBe(true)
  expect(result.soulDetails.name).toBe('Valuable Soul')
  expect(result.soulDetails.baseValueUSD).toBe(EXCHANGE_RATES.SOUL) // $2.00

  // Reputation: 100×1 + 20×5 = 200
  expect(result.soulDetails.reputationPoints).toBe(200)
  expect(result.soulDetails.reputationValueUSD).toBe(200 * EXCHANGE_RATES.REPUTATION_TO_USD) // $2.00
  expect(result.soulDetails.totalUSD).toBe(EXCHANGE_RATES.SOUL + 200 * EXCHANGE_RATES.REPUTATION_TO_USD) // $4.00
})

it('should preview arbitrage scenarios correctly', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'previewuser',
      displayName: 'Preview User',
      githubId: 50007,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill with 1000 reputation points
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'preview-skill',
      displayName: 'Preview Skill',
      ownerUserId: userId,
      stats: {
        downloads: 1000,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })
  })

  // Preview arbitrage
  const preview = await t.query(previewArbitrage, { userId })

  expect(preview.currentValuation).toBeDefined()
  expect(preview.scenarios).toBeDefined()

  // Check full liquidation
  expect(preview.scenarios.fullLiquidation.pointsExchanged).toBe(1000)
  expect(preview.scenarios.fullLiquidation.usdAmount).toBe(1000 * EXCHANGE_RATES.REPUTATION_TO_USD) // $10.00
  expect(preview.scenarios.fullLiquidation.instantSettlement).toBe(true)

  // Check 50% liquidation
  expect(preview.scenarios.partialLiquidation50.pointsExchanged).toBe(500)
  expect(preview.scenarios.partialLiquidation50.usdAmount).toBe(500 * EXCHANGE_RATES.REPUTATION_TO_USD) // $5.00

  // Check 25% liquidation
  expect(preview.scenarios.partialLiquidation25.pointsExchanged).toBe(250)
  expect(preview.scenarios.partialLiquidation25.usdAmount).toBe(250 * EXCHANGE_RATES.REPUTATION_TO_USD) // $2.50
})

it('should return correct exchange rates', async () => {
  const t = convexTest(schema)

  const rates = await t.query(getExchangeRates, {})

  expect(rates.rates).toBeDefined()
  expect(rates.rates.REPUTATION_TO_USD).toBe(0.01)
  expect(rates.rates.DOWNLOAD).toBe(0.01)
  expect(rates.rates.STAR).toBe(0.05)
  expect(rates.rates.BADGE).toBe(0.50)
  expect(rates.rates.SKILL).toBe(5.0)
  expect(rates.rates.SOUL).toBe(2.0)
  expect(rates.lastUpdated).toBeGreaterThan(0)
})

it('should handle badges in USD valuation', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'badgeuser',
      displayName: 'Badge User',
      githubId: 50008,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill with badges
  const skillId = await t.run(async (ctx) => {
    const id = await ctx.db.insert('skills', {
      slug: 'badged-skill',
      displayName: 'Badged Skill',
      ownerUserId: userId,
      stats: {
        downloads: 0,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })

    // Add 3 badges
    await ctx.db.insert('skillBadges', {
      skillId: id,
      kind: 'official',
      awardedByUserId: userId,
      awardedAt: Date.now(),
    })
    await ctx.db.insert('skillBadges', {
      skillId: id,
      kind: 'highlighted',
      awardedByUserId: userId,
      awardedAt: Date.now(),
    })
    await ctx.db.insert('skillBadges', {
      skillId: id,
      kind: 'redactionApproved',
      awardedByUserId: userId,
      awardedAt: Date.now(),
    })

    return id
  })

  // Get valuation
  const valuation = await t.query(getUSDValuation, { userId })

  expect(valuation.breakdown.badges.count).toBe(3)
  expect(valuation.breakdown.badges.valueUSD).toBe(3 * EXCHANGE_RATES.BADGE) // $1.50

  // Reputation from badges: 3 × 50 = 150 points
  expect(valuation.reputationPoints).toBe(150)
})
