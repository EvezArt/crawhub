/**
 * Wealth & Asset Tracking System
 *
 * This module helps users locate, track, and analyze all valuable assets and resources
 * in their environment. It provides comprehensive analytics on:
 * - Skills owned (primary wealth assets)
 * - Downloads accumulated (engagement value)
 * - Stars received (reputation value)
 * - Installs (adoption value)
 * - Badges and achievements (status symbols)
 */

import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { query } from './_generated/server'

/**
 * Asset summary for a user showing all their valuable resources
 */
export interface UserAssetSummary {
  userId: Id<'users'>
  totalSkills: number
  totalSouls: number
  totalDownloads: number
  totalStars: number
  totalInstallsCurrent: number
  totalInstallsAllTime: number
  totalBadges: number
  totalComments: number
  reputationScore: number
  wealthRank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  skills: Array<{
    skillId: Id<'skills'>
    slug: string
    displayName: string
    downloads: number
    stars: number
    installsCurrent: number
    installsAllTime: number
    badges: string[]
    value: number // Calculated asset value
  }>
  souls: Array<{
    soulId: Id<'souls'>
    slug: string
    displayName: string
    downloads: number
    stars: number
    value: number
  }>
  missingOpportunities: string[]
  recommendations: string[]
}

/**
 * Get comprehensive asset summary for a user
 * Shows all wealth and valuable resources they've accumulated
 */
export const getUserAssets = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args): Promise<UserAssetSummary> => {
    // Fetch all skills owned by user
    const skills = await ctx.db
      .query('skills')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    // Fetch all souls owned by user
    const souls = await ctx.db
      .query('souls')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    // Calculate totals
    let totalDownloads = 0
    let totalStars = 0
    let totalInstallsCurrent = 0
    let totalInstallsAllTime = 0
    let totalBadges = 0

    // Process skills and calculate their value
    const skillAssets = await Promise.all(
      skills.map(async (skill) => {
        // Get badges for this skill
        const badges = await ctx.db
          .query('skillBadges')
          .withIndex('by_skill', (q) => q.eq('skillId', skill._id))
          .collect()

        const badgeTypes = badges.map((b) => b.kind)
        totalBadges += badges.length

        const downloads = skill.stats.downloads
        const stars = skill.stats.stars
        const installsCurrent = skill.stats.installsCurrent ?? 0
        const installsAllTime = skill.stats.installsAllTime ?? 0

        totalDownloads += downloads
        totalStars += stars
        totalInstallsCurrent += installsCurrent
        totalInstallsAllTime += installsAllTime

        // Calculate asset value (weighted scoring)
        // Downloads: 1 point each
        // Stars: 5 points each (more valuable)
        // Current installs: 3 points each (active users)
        // All-time installs: 1 point each
        // Badges: 50 points each (special achievements)
        const value =
          downloads * 1 +
          stars * 5 +
          installsCurrent * 3 +
          installsAllTime * 1 +
          badges.length * 50

        return {
          skillId: skill._id,
          slug: skill.slug,
          displayName: skill.displayName,
          downloads,
          stars,
          installsCurrent,
          installsAllTime,
          badges: badgeTypes,
          value,
        }
      }),
    )

    // Process souls
    const soulAssets = souls.map((soul) => {
      const downloads = soul.stats.downloads
      const stars = soul.stats.stars

      totalDownloads += downloads
      totalStars += stars

      // Souls have similar but simpler valuation
      const value = downloads * 1 + stars * 5

      return {
        soulId: soul._id,
        slug: soul.slug,
        displayName: soul.displayName,
        downloads,
        stars,
        value,
      }
    })

    // Get comment count (another form of engagement value)
    const commentsReceived = await ctx.db
      .query('comments')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    const totalComments = commentsReceived.length

    // Calculate overall reputation score
    const reputationScore =
      totalDownloads * 1 +
      totalStars * 5 +
      totalInstallsCurrent * 3 +
      totalInstallsAllTime * 1 +
      totalBadges * 50 +
      totalComments * 2

    // Determine wealth rank based on reputation
    let wealthRank: UserAssetSummary['wealthRank'] = 'bronze'
    if (reputationScore >= 10000) wealthRank = 'diamond'
    else if (reputationScore >= 5000) wealthRank = 'platinum'
    else if (reputationScore >= 2000) wealthRank = 'gold'
    else if (reputationScore >= 500) wealthRank = 'silver'

    // Identify missing opportunities
    const missingOpportunities: string[] = []
    if (skills.length === 0) {
      missingOpportunities.push('No skills published - publish your first skill to start building wealth')
    }
    if (souls.length === 0) {
      missingOpportunities.push('No souls published - share your AI personality to diversify assets')
    }
    if (totalStars === 0 && skills.length > 0) {
      missingOpportunities.push('No stars received - improve skill quality to attract stars')
    }
    if (totalInstallsCurrent === 0 && skills.length > 0) {
      missingOpportunities.push('No active installations - promote your skills to users')
    }
    if (totalBadges === 0 && skills.length > 0) {
      missingOpportunities.push('No badges earned - achieve special status for highlighted/official badges')
    }

    // Generate recommendations
    const recommendations: string[] = []
    const sortedSkills = [...skillAssets].sort((a, b) => b.value - a.value)

    if (sortedSkills.length > 0) {
      const topSkill = sortedSkills[0]
      recommendations.push(
        `Your most valuable asset is "${topSkill.displayName}" (${topSkill.value} points) - focus on maintaining it`,
      )
    }

    if (sortedSkills.some((s) => s.stars === 0)) {
      recommendations.push('Some skills have no stars - improve quality and request community feedback')
    }

    if (sortedSkills.some((s) => s.badges.length === 0)) {
      recommendations.push('Work towards earning badges - they significantly boost asset value')
    }

    if (skills.length < 3) {
      recommendations.push('Publish more skills to diversify your asset portfolio')
    }

    if (totalInstallsCurrent < totalInstallsAllTime * 0.3) {
      recommendations.push('Retention is low - improve skill reliability to keep users engaged')
    }

    return {
      userId: args.userId,
      totalSkills: skills.length,
      totalSouls: souls.length,
      totalDownloads,
      totalStars,
      totalInstallsCurrent,
      totalInstallsAllTime,
      totalBadges,
      totalComments,
      reputationScore,
      wealthRank,
      skills: skillAssets.sort((a, b) => b.value - a.value), // Sort by value
      souls: soulAssets.sort((a, b) => b.value - a.value),
      missingOpportunities,
      recommendations,
    }
  },
})

/**
 * Get all users ranked by total wealth/assets
 * Useful for leaderboards and competitive tracking
 */
export const getWealthLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    // Get all users with skills
    const allUsers = await ctx.db.query('users').collect()

    // Calculate wealth for each user
    const userWealth = await Promise.all(
      allUsers.map(async (user) => {
        const skills = await ctx.db
          .query('skills')
          .withIndex('by_owner', (q) => q.eq('ownerUserId', user._id))
          .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
          .collect()

        const souls = await ctx.db
          .query('souls')
          .withIndex('by_owner', (q) => q.eq('ownerUserId', user._id))
          .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
          .collect()

        const badges = await Promise.all(
          skills.map((s) => ctx.db.query('skillBadges').withIndex('by_skill', (q) => q.eq('skillId', s._id)).collect()),
        )

        const totalBadges = badges.flat().length

        const totalDownloads = skills.reduce((sum, s) => sum + s.stats.downloads, 0) +
          souls.reduce((sum, s) => sum + s.stats.downloads, 0)

        const totalStars = skills.reduce((sum, s) => sum + s.stats.stars, 0) +
          souls.reduce((sum, s) => sum + s.stats.stars, 0)

        const totalInstallsCurrent = skills.reduce((sum, s) => sum + (s.stats.installsCurrent ?? 0), 0)
        const totalInstallsAllTime = skills.reduce((sum, s) => sum + (s.stats.installsAllTime ?? 0), 0)

        const reputationScore =
          totalDownloads * 1 +
          totalStars * 5 +
          totalInstallsCurrent * 3 +
          totalInstallsAllTime * 1 +
          totalBadges * 50

        return {
          userId: user._id,
          handle: user.handle,
          displayName: user.displayName,
          totalSkills: skills.length,
          totalSouls: souls.length,
          totalDownloads,
          totalStars,
          totalInstallsCurrent,
          totalInstallsAllTime,
          totalBadges,
          reputationScore,
        }
      }),
    )

    // Filter out users with no wealth and sort
    const rankedUsers = userWealth
      .filter((u) => u.reputationScore > 0)
      .sort((a, b) => b.reputationScore - a.reputationScore)
      .slice(0, limit)

    return rankedUsers
  },
})

/**
 * Discover unclaimed resources or opportunities
 * Helps users find gaps in the ecosystem they can fill
 */
export const discoverOpportunities = query({
  args: {},
  handler: async (ctx) => {
    // Find underserved categories (skills with low competition but high demand)
    const allSkills = await ctx.db.query('skills').collect()

    // Analyze which skills are getting lots of downloads but few alternatives exist
    const skillsBySlugPrefix = new Map<string, Doc<'skills'>[]>()

    for (const skill of allSkills) {
      const prefix = skill.slug.split('-')[0] // First word of slug
      if (!skillsBySlugPrefix.has(prefix)) {
        skillsBySlugPrefix.set(prefix, [])
      }
      skillsBySlugPrefix.get(prefix)!.push(skill)
    }

    const opportunities: Array<{
      category: string
      totalSkills: number
      totalDownloads: number
      avgDownloadsPerSkill: number
      competition: 'low' | 'medium' | 'high'
      recommendation: string
    }> = []

    for (const [category, skills] of skillsBySlugPrefix.entries()) {
      const totalDownloads = skills.reduce((sum, s) => sum + s.stats.downloads, 0)
      const avgDownloads = skills.length > 0 ? totalDownloads / skills.length : 0

      let competition: 'low' | 'medium' | 'high' = 'high'
      if (skills.length <= 3) competition = 'low'
      else if (skills.length <= 10) competition = 'medium'

      let recommendation = ''
      if (competition === 'low' && avgDownloads > 10) {
        recommendation = `High demand, low competition - great opportunity!`
      } else if (competition === 'medium' && avgDownloads > 50) {
        recommendation = `Moderate competition with proven demand`
      } else if (competition === 'high' && avgDownloads > 100) {
        recommendation = `Saturated market but high volume potential`
      }

      if (recommendation) {
        opportunities.push({
          category,
          totalSkills: skills.length,
          totalDownloads,
          avgDownloadsPerSkill: Math.round(avgDownloads),
          competition,
          recommendation,
        })
      }
    }

    // Sort by opportunity score (high demand, low competition)
    const rankedOpportunities = opportunities.sort((a, b) => {
      const scoreA = a.avgDownloadsPerSkill / a.totalSkills
      const scoreB = b.avgDownloadsPerSkill / b.totalSkills
      return scoreB - scoreA
    })

    return {
      opportunities: rankedOpportunities.slice(0, 20),
      totalCategories: skillsBySlugPrefix.size,
      analysisDate: Date.now(),
    }
  },
})

/**
 * Track wealth accumulation over time
 * Shows how a user's assets have grown
 */
export const getWealthHistory = query({
  args: {
    userId: v.id('users'),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 30
    const now = Date.now()
    const startDate = now - days * 24 * 60 * 60 * 1000

    // Get user's skills
    const skills = await ctx.db
      .query('skills')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    // Get daily stats for all skills
    const dailyStats = await Promise.all(
      skills.map((skill) =>
        ctx.db
          .query('skillDailyStats')
          .withIndex('by_skill_day', (q) => q.eq('skillId', skill._id))
          .filter((q) => q.gte(q.field('day'), startDate))
          .collect(),
      ),
    )

    // Aggregate by day
    const statsByDay = new Map<
      number,
      {
        date: number
        downloads: number
        installs: number
        cumulativeDownloads: number
        cumulativeInstalls: number
      }
    >()

    let cumulativeDownloads = 0
    let cumulativeInstalls = 0

    // Sort all stats by day
    const allStats = dailyStats.flat().sort((a, b) => a.day - b.day)

    for (const stat of allStats) {
      cumulativeDownloads += stat.downloads
      cumulativeInstalls += stat.installs

      if (!statsByDay.has(stat.day)) {
        statsByDay.set(stat.day, {
          date: stat.day,
          downloads: 0,
          installs: 0,
          cumulativeDownloads: 0,
          cumulativeInstalls: 0,
        })
      }

      const dayStat = statsByDay.get(stat.day)!
      dayStat.downloads += stat.downloads
      dayStat.installs += stat.installs
      dayStat.cumulativeDownloads = cumulativeDownloads
      dayStat.cumulativeInstalls = cumulativeInstalls
    }

    // Convert to array and sort
    const history = Array.from(statsByDay.values()).sort((a, b) => a.date - b.date)

    return {
      userId: args.userId,
      periodDays: days,
      history,
      totalGrowth: {
        downloads: cumulativeDownloads,
        installs: cumulativeInstalls,
      },
      currentRate: history.length > 0 ? {
        downloadsPerDay: cumulativeDownloads / history.length,
        installsPerDay: cumulativeInstalls / history.length,
      } : null,
    }
  },
})
