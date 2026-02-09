/**
 * Wealth Acceleration System
 *
 * Advanced mutations and utilities to rapidly boost reputation scores
 * and achieve Diamond/Platinum wealth ranks through strategic actions.
 *
 * Target Ranks:
 * - Platinum: 5,000+ reputation points
 * - Diamond: 10,000+ reputation points
 */

import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'

/**
 * Strategic action that accelerates wealth accumulation
 */
export interface WealthBoostAction {
  action: string
  impact: number
  difficulty: 'easy' | 'medium' | 'hard'
  timeEstimate: string
  description: string
}

/**
 * Achievement milestone that unlocks bonus reputation
 */
export interface Achievement {
  id: string
  name: string
  description: string
  reputationBonus: number
  requirement: string
  unlocked: boolean
}

/**
 * Calculate the fastest path to target wealth rank
 */
export const getWealthAccelerationPlan = query({
  args: {
    userId: v.id('users'),
    targetRank: v.union(
      v.literal('silver'),
      v.literal('gold'),
      v.literal('platinum'),
      v.literal('diamond'),
    ),
  },
  handler: async (ctx, args) => {
    // Get current assets
    const skills = await ctx.db
      .query('skills')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    const souls = await ctx.db
      .query('souls')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    // Calculate current reputation
    let currentReputation = 0
    let totalBadges = 0

    for (const skill of skills) {
      const badges = await ctx.db
        .query('skillBadges')
        .withIndex('by_skill', (q) => q.eq('skillId', skill._id))
        .collect()

      totalBadges += badges.length

      currentReputation +=
        skill.stats.downloads * 1 +
        skill.stats.stars * 5 +
        (skill.stats.installsCurrent ?? 0) * 3 +
        (skill.stats.installsAllTime ?? 0) * 1 +
        badges.length * 50
    }

    for (const soul of souls) {
      currentReputation += soul.stats.downloads * 1 + soul.stats.stars * 5
    }

    // Determine target score
    const targetScores = {
      silver: 500,
      gold: 2000,
      platinum: 5000,
      diamond: 10000,
    }

    const targetScore = targetScores[args.targetRank]
    const gap = Math.max(0, targetScore - currentReputation)

    // Generate strategic actions ranked by impact
    const actions: WealthBoostAction[] = []

    // Badge hunting (highest impact)
    if (skills.length > 0 && totalBadges < skills.length * 2) {
      const potentialBadgeGain = (skills.length * 2 - totalBadges) * 50
      actions.push({
        action: 'earn_badges',
        impact: Math.min(potentialBadgeGain, gap),
        difficulty: 'hard',
        timeEstimate: '1-4 weeks',
        description: `Earn official/highlighted badges on ${skills.length} skills (50 points each)`,
      })
    }

    // Star optimization (high impact, easier)
    const currentStars = skills.reduce((sum, s) => sum + s.stats.stars, 0)
    const targetStars = Math.ceil(gap / 5)
    if (targetStars > currentStars) {
      actions.push({
        action: 'boost_stars',
        impact: Math.min((targetStars - currentStars) * 5, gap),
        difficulty: 'medium',
        timeEstimate: '1-2 weeks',
        description: `Improve quality to earn ${targetStars - currentStars} more stars (5 points each)`,
      })
    }

    // Install growth (medium impact)
    const currentInstalls = skills.reduce((sum, s) => sum + (s.stats.installsCurrent ?? 0), 0)
    const targetInstalls = Math.ceil(gap / 3)
    if (targetInstalls > currentInstalls) {
      actions.push({
        action: 'boost_installs',
        impact: Math.min((targetInstalls - currentInstalls) * 3, gap),
        difficulty: 'medium',
        timeEstimate: '2-4 weeks',
        description: `Promote skills to gain ${targetInstalls - currentInstalls} active installs (3 points each)`,
      })
    }

    // Publish new skills (strategic expansion)
    if (skills.length < 5) {
      const newSkillsNeeded = Math.min(5 - skills.length, Math.ceil(gap / 500))
      actions.push({
        action: 'publish_skills',
        impact: newSkillsNeeded * 500, // Estimated value per skill
        difficulty: 'hard',
        timeEstimate: '1-8 weeks',
        description: `Publish ${newSkillsNeeded} new high-quality skills`,
      })
    }

    // Soul creation (diversification)
    if (souls.length < 3) {
      const newSoulsNeeded = Math.min(3 - souls.length, Math.ceil(gap / 200))
      actions.push({
        action: 'publish_souls',
        impact: newSoulsNeeded * 200, // Estimated value per soul
        difficulty: 'easy',
        timeEstimate: '1-2 days',
        description: `Create ${newSoulsNeeded} AI personality souls`,
      })
    }

    // Download campaigns (volume approach)
    const targetDownloads = Math.ceil(gap)
    actions.push({
      action: 'boost_downloads',
      impact: Math.min(targetDownloads, gap),
      difficulty: 'medium',
      timeEstimate: '2-8 weeks',
      description: `Generate ${targetDownloads} additional downloads through promotion`,
    })

    // Sort by impact/difficulty ratio
    const sortedActions = actions.sort((a, b) => {
      const difficultyWeight = { easy: 1, medium: 2, hard: 3 }
      const ratioA = a.impact / difficultyWeight[a.difficulty]
      const ratioB = b.impact / difficultyWeight[b.difficulty]
      return ratioB - ratioA
    })

    return {
      currentReputation,
      targetReputation: targetScore,
      gap,
      currentRank: getCurrentRank(currentReputation),
      targetRank: args.targetRank,
      recommendedActions: sortedActions.slice(0, 5),
      estimatedTimeToTarget: estimateTimeToTarget(gap, sortedActions),
    }
  },
})

/**
 * Simulate wealth acceleration to preview outcomes
 */
export const simulateWealthBoost = query({
  args: {
    userId: v.id('users'),
    actions: v.array(
      v.object({
        action: v.string(),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Get current stats
    const skills = await ctx.db
      .query('skills')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    const souls = await ctx.db
      .query('souls')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    let currentReputation = 0

    for (const skill of skills) {
      const badges = await ctx.db
        .query('skillBadges')
        .withIndex('by_skill', (q) => q.eq('skillId', skill._id))
        .collect()

      currentReputation +=
        skill.stats.downloads * 1 +
        skill.stats.stars * 5 +
        (skill.stats.installsCurrent ?? 0) * 3 +
        (skill.stats.installsAllTime ?? 0) * 1 +
        badges.length * 50
    }

    for (const soul of souls) {
      currentReputation += soul.stats.downloads * 1 + soul.stats.stars * 5
    }

    // Simulate actions
    let projectedReputation = currentReputation

    for (const action of args.actions) {
      switch (action.action) {
        case 'earn_badges':
          projectedReputation += action.quantity * 50
          break
        case 'boost_stars':
          projectedReputation += action.quantity * 5
          break
        case 'boost_installs':
          projectedReputation += action.quantity * 3
          break
        case 'boost_downloads':
          projectedReputation += action.quantity * 1
          break
        case 'publish_skills':
          projectedReputation += action.quantity * 500 // Estimated avg skill value
          break
        case 'publish_souls':
          projectedReputation += action.quantity * 200 // Estimated avg soul value
          break
      }
    }

    return {
      currentReputation,
      currentRank: getCurrentRank(currentReputation),
      projectedReputation,
      projectedRank: getCurrentRank(projectedReputation),
      gain: projectedReputation - currentReputation,
      willReachDiamond: projectedReputation >= 10000,
      willReachPlatinum: projectedReputation >= 5000,
    }
  },
})

/**
 * Get achievement milestones with bonus reputation
 */
export const getAchievements = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const skills = await ctx.db
      .query('skills')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    const souls = await ctx.db
      .query('souls')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    const totalDownloads = skills.reduce((sum, s) => sum + s.stats.downloads, 0) +
      souls.reduce((sum, s) => sum + s.stats.downloads, 0)

    const totalStars = skills.reduce((sum, s) => sum + s.stats.stars, 0) +
      souls.reduce((sum, s) => sum + s.stats.stars, 0)

    const totalBadges = (
      await Promise.all(
        skills.map((s) => ctx.db.query('skillBadges').withIndex('by_skill', (q) => q.eq('skillId', s._id)).collect()),
      )
    )
      .flat()
      .length

    const achievements: Achievement[] = [
      {
        id: 'first_skill',
        name: 'First Step',
        description: 'Publish your first skill',
        reputationBonus: 100,
        requirement: 'Publish 1 skill',
        unlocked: skills.length >= 1,
      },
      {
        id: 'five_skills',
        name: 'Portfolio Builder',
        description: 'Maintain 5 active skills',
        reputationBonus: 500,
        requirement: 'Publish 5 skills',
        unlocked: skills.length >= 5,
      },
      {
        id: 'first_star',
        name: 'Community Approved',
        description: 'Earn your first star',
        reputationBonus: 50,
        requirement: 'Earn 1 star',
        unlocked: totalStars >= 1,
      },
      {
        id: 'hundred_stars',
        name: 'Star Power',
        description: 'Earn 100 stars across all assets',
        reputationBonus: 1000,
        requirement: 'Earn 100 stars',
        unlocked: totalStars >= 100,
      },
      {
        id: 'first_badge',
        name: 'Badge Collector',
        description: 'Earn your first badge',
        reputationBonus: 250,
        requirement: 'Earn 1 badge',
        unlocked: totalBadges >= 1,
      },
      {
        id: 'five_badges',
        name: 'Elite Status',
        description: 'Earn 5 badges',
        reputationBonus: 1500,
        requirement: 'Earn 5 badges',
        unlocked: totalBadges >= 5,
      },
      {
        id: 'thousand_downloads',
        name: 'Popular Creator',
        description: 'Reach 1,000 downloads',
        reputationBonus: 500,
        requirement: '1,000 downloads',
        unlocked: totalDownloads >= 1000,
      },
      {
        id: 'soul_creator',
        name: 'Soul Shaper',
        description: 'Create your first soul',
        reputationBonus: 100,
        requirement: 'Publish 1 soul',
        unlocked: souls.length >= 1,
      },
      {
        id: 'diversified',
        name: 'Diversified Portfolio',
        description: 'Have both skills and souls',
        reputationBonus: 300,
        requirement: '3+ skills and 2+ souls',
        unlocked: skills.length >= 3 && souls.length >= 2,
      },
      {
        id: 'platinum_reach',
        name: 'Platinum Achiever',
        description: 'Reach Platinum rank',
        reputationBonus: 2000,
        requirement: '5,000 reputation',
        unlocked: false, // Calculated from reputation
      },
      {
        id: 'diamond_reach',
        name: 'Diamond Legend',
        description: 'Reach Diamond rank',
        reputationBonus: 5000,
        requirement: '10,000 reputation',
        unlocked: false, // Calculated from reputation
      },
    ]

    const unlockedAchievements = achievements.filter((a) => a.unlocked)
    const lockedAchievements = achievements.filter((a) => !a.unlocked)
    const totalBonusEarned = unlockedAchievements.reduce((sum, a) => sum + a.reputationBonus, 0)
    const potentialBonus = lockedAchievements.reduce((sum, a) => sum + a.reputationBonus, 0)

    return {
      achievements,
      unlockedCount: unlockedAchievements.length,
      totalCount: achievements.length,
      totalBonusEarned,
      potentialBonus,
      nextAchievement: lockedAchievements[0],
    }
  },
})

/**
 * Get a personalized wealth acceleration strategy
 */
export const getPersonalizedStrategy = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const skills = await ctx.db
      .query('skills')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    const souls = await ctx.db
      .query('souls')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    // Calculate current state
    let currentReputation = 0
    let totalBadges = 0
    let skillsWithoutBadges = 0
    let skillsWithoutStars = 0

    for (const skill of skills) {
      const badges = await ctx.db
        .query('skillBadges')
        .withIndex('by_skill', (q) => q.eq('skillId', skill._id))
        .collect()

      totalBadges += badges.length

      if (badges.length === 0) skillsWithoutBadges++
      if (skill.stats.stars === 0) skillsWithoutStars++

      currentReputation +=
        skill.stats.downloads * 1 +
        skill.stats.stars * 5 +
        (skill.stats.installsCurrent ?? 0) * 3 +
        (skill.stats.installsAllTime ?? 0) * 1 +
        badges.length * 50
    }

    for (const soul of souls) {
      currentReputation += soul.stats.downloads * 1 + soul.stats.stars * 5
    }

    const currentRank = getCurrentRank(currentReputation)

    // Generate personalized strategy
    const strategy: string[] = []

    // Priority 1: Quick wins
    if (souls.length === 0) {
      strategy.push('🚀 QUICK WIN: Publish 1-2 souls (200-400 points, 1-2 days effort)')
    }

    // Priority 2: Badge hunting
    if (skillsWithoutBadges > 0 && currentRank !== 'diamond') {
      strategy.push(
        `🏆 HIGH IMPACT: Work towards badges on ${skillsWithoutBadges} skills (${skillsWithoutBadges * 50} points potential)`,
      )
    }

    // Priority 3: Quality improvement
    if (skillsWithoutStars > 0) {
      strategy.push(`⭐ QUALITY BOOST: Improve ${skillsWithoutStars} skills to earn stars (5 points each)`)
    }

    // Priority 4: Scale
    if (skills.length < 5 && currentRank !== 'diamond') {
      strategy.push(`📦 SCALE: Publish ${5 - skills.length} more skills to diversify (500 points per skill avg)`)
    }

    // Priority 5: Promotion
    strategy.push('📣 PROMOTE: Share your best skills to boost downloads and installs')

    // Calculate paths to next ranks
    const pathToPlatinum = 5000 - currentReputation
    const pathToDiamond = 10000 - currentReputation

    return {
      currentReputation,
      currentRank,
      strategy,
      pathToPlatinum: pathToPlatinum > 0 ? pathToPlatinum : 0,
      pathToDiamond: pathToDiamond > 0 ? pathToDiamond : 0,
      estimatedWeeksToPlatinum: Math.ceil(Math.max(pathToPlatinum, 0) / 500), // Assuming 500 rep/week
      estimatedWeeksToDiamond: Math.ceil(Math.max(pathToDiamond, 0) / 500),
      keyMetrics: {
        totalSkills: skills.length,
        totalSouls: souls.length,
        totalBadges,
        skillsNeedingBadges: skillsWithoutBadges,
        skillsNeedingStars: skillsWithoutStars,
      },
    }
  },
})

// Helper functions

function getCurrentRank(reputation: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  if (reputation >= 10000) return 'diamond'
  if (reputation >= 5000) return 'platinum'
  if (reputation >= 2000) return 'gold'
  if (reputation >= 500) return 'silver'
  return 'bronze'
}

function estimateTimeToTarget(gap: number, actions: WealthBoostAction[]): string {
  if (gap === 0) return 'Already achieved!'

  // Calculate based on top 3 actions
  const topActions = actions.slice(0, 3)
  const totalImpact = topActions.reduce((sum, a) => sum + a.impact, 0)

  if (totalImpact >= gap) {
    const maxTime = Math.max(
      ...topActions.map((a) => {
        const match = a.timeEstimate.match(/(\d+)-?(\d+)?/)
        return match ? parseInt(match[2] || match[1]) : 4
      }),
    )
    return `${maxTime} weeks (following top recommendations)`
  }

  return '8-12 weeks (requires multiple strategies)'
}
