/**
 * Skills JSON API endpoint
 * Returns all skills in a machine-readable format for AI agents
 */

import { ConvexHttpClient } from 'convex/browser'
import { defineEventHandler, setHeader } from 'h3'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { CRAWFATHER_SKILL } from '../../../src/lib/crawfather-skill'
import type { SkillRecord } from '../../../src/lib/types/skill'
import { toSkillRecord } from '../../../src/lib/types/skill'

function getConvexUrl() {
  const url = process.env.VITE_CONVEX_URL?.trim()
  if (!url) {
    throw new Error('VITE_CONVEX_URL environment variable is not set')
  }
  return url
}

type SkillWithOwner = {
  skill: Doc<'skills'>
  owner: { handle?: string } | null
  latestVersion: { version: string } | null
}

export default defineEventHandler(async (event) => {
  try {
    const convex = new ConvexHttpClient(getConvexUrl())

    // Fetch all skills from Convex
    const skills = (await convex.query(api.skills.list, {
      limit: 200,
    })) as SkillWithOwner[]

    // Convert to SkillRecord format
    const skillRecords: SkillRecord[] = skills
      .filter((item) => item.skill && !item.skill.softDeletedAt)
      .map((item) => {
        const ownerHandle = item.owner?.handle ?? undefined
        const latestVersion = item.latestVersion?.version ?? undefined
        return toSkillRecord(item.skill, ownerHandle, latestVersion)
      })

    // Add CrawFather skill as a special entry
    skillRecords.push(CRAWFATHER_SKILL)

    // Set cache headers (cache for 5 minutes)
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=300')
    setHeader(event, 'Content-Type', 'application/json; charset=utf-8')

    return {
      skills: skillRecords,
      total: skillRecords.length,
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error('Error fetching skills:', error)
    setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
    return {
      error: 'Failed to fetch skills',
      message: error instanceof Error ? error.message : 'Unknown error',
      skills: [CRAWFATHER_SKILL],
      total: 1,
      timestamp: Date.now(),
    }
  }
})
