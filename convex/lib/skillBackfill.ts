import {
  getFrontmatterMetadata,
  getFrontmatterValue,
  type ParsedSkillFrontmatter,
  parseClawdisMetadata,
  parseFrontmatter,
} from './skills'

export type ParsedSkillData = {
  frontmatter: ParsedSkillFrontmatter
  metadata?: unknown
  clawdis?: unknown
}

export type SkillSummaryBackfillPatch = {
  summary?: string
  parsed?: ParsedSkillData
}

export function buildSkillSummaryBackfillPatch(args: {
  readmeText: string
  currentSummary?: string
  currentParsed?: ParsedSkillData
}): SkillSummaryBackfillPatch {
  const frontmatter = parseFrontmatter(args.readmeText)
  const summary = getFrontmatterValue(frontmatter, 'description') ?? undefined
  const metadata = getFrontmatterMetadata(frontmatter)
  const clawdis = parseClawdisMetadata(frontmatter)
  const parsed: ParsedSkillData = { frontmatter, metadata, clawdis }

  const patch: SkillSummaryBackfillPatch = {}
  if (summary && summary !== args.currentSummary) {
    patch.summary = summary
  }
  if (!deepEqual(parsed, args.currentParsed)) {
    patch.parsed = parsed
  }
  return patch
}

function deepEqual(value1: unknown, value2: unknown): boolean {
  if (value1 === value2) return true
  if (!value1 || !value2) return value1 === value2
  if (typeof value1 !== typeof value2) return false
  if (Array.isArray(value1) || Array.isArray(value2)) {
    if (!Array.isArray(value1) || !Array.isArray(value2)) return false
    if (value1.length !== value2.length) return false
    for (let i = 0; i < value1.length; i++) {
      if (!deepEqual(value1[i], value2[i])) return false
    }
    return true
  }
  if (typeof value1 === 'object' && typeof value2 === 'object') {
    const obj1 = value1 as Record<string, unknown>
    const obj2 = value2 as Record<string, unknown>
    const keys1 = Object.keys(obj1).sort()
    const keys2 = Object.keys(obj2).sort()
    if (keys1.length !== keys2.length) return false
    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) return false
      const key = keys1[i] as string
      if (!deepEqual(obj1[key], obj2[key])) return false
    }
    return true
  }
  return false
}
