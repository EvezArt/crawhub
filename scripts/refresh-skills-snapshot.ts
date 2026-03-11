#!/usr/bin/env -S node --import tsx
/**
 * Refresh skills snapshot script
 * Writes a machine-readable snapshot of skills to .crawfather/skills-snapshot.json
 * This allows local agents in Codespaces to read skill data from the filesystem
 * without needing network access.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'
// Import types and helpers
import type { Doc } from '../convex/_generated/dataModel'
import { CRAWFATHER_SKILL } from '../src/lib/crawfather-skill'
import type { SkillRecord } from '../src/lib/types/skill'
import { toSkillRecord } from '../src/lib/types/skill'

type SkillWithOwner = {
  skill: Doc<'skills'>
  owner: { handle?: string } | null
  latestVersion: { version: string } | null
}

async function refreshSkillsSnapshot() {
  console.log('Refreshing skills snapshot...')

  const convexUrl = process.env.VITE_CONVEX_URL?.trim()
  if (!convexUrl) {
    console.error('Error: VITE_CONVEX_URL environment variable is not set')
    console.error('Please set it in your .env.local file or environment')
    process.exit(1)
  }

  try {
    const convex = new ConvexHttpClient(convexUrl)

    console.log('Fetching skills from Convex...')
    const skills = (await convex.query(api.skills.list, {
      limit: 200,
    })) as SkillWithOwner[]

    console.log(`Fetched ${skills.length} skills`)

    // Convert to SkillRecord format
    const skillRecords: SkillRecord[] = skills
      .filter((item) => item.skill && !item.skill.softDeletedAt)
      .map((item) => {
        const ownerHandle = item.owner?.handle ?? undefined
        const latestVersion = item.latestVersion?.version ?? undefined
        return toSkillRecord(item.skill, ownerHandle, latestVersion)
      })

    // Add CrawFather skill
    skillRecords.push(CRAWFATHER_SKILL)

    // Create .crawfather directory if it doesn't exist
    const snapshotDir = join(process.cwd(), '.crawfather')
    mkdirSync(snapshotDir, { recursive: true })

    // Write snapshot file
    const snapshotPath = join(snapshotDir, 'skills-snapshot.json')
    const snapshot = {
      skills: skillRecords,
      total: skillRecords.length,
      timestamp: Date.now(),
      generatedAt: new Date().toISOString(),
    }

    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8')

    console.log(`✓ Skills snapshot written to ${snapshotPath}`)
    console.log(`  Total skills: ${skillRecords.length}`)
    console.log('  Done!')
  } catch (error) {
    console.error('Error refreshing skills snapshot:', error)
    if (error instanceof Error) {
      console.error(error.message)
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run the script
refreshSkillsSnapshot()
