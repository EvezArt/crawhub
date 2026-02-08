/**
 * CrawFather Survival Pack skill definition
 * This is a special skill that represents the CrawFather meta-agent
 */

import type { SkillRecord } from './types/skill'

/**
 * CrawFather Survival Pack skill record
 * This skill is always available and represents the CrawFather meta-agent
 */
export const CRAWFATHER_SKILL: SkillRecord = {
  _id: 'crawfather-survival-pack',
  _creationTime: Date.now(),
  meta: {
    id: 'crawfather-survival-pack',
    name: 'CrawFather Survival Pack',
    description:
      'CrawFather is a meta-agent that scans repositories and infrastructure, identifies monetizable work opportunities, and proposes concrete action plans. It analyzes codebases, issues, PRs, and agent capabilities to generate revenue-generating hypotheses.',
    category: 'meta-agent',
    tags: ['meta-agent', 'automation', 'monetization', 'analysis'],
    capability: {
      id: 'crawfather.meta_survival',
      verbs: ['scan', 'plan', 'propose', 'analyze', 'hypothesize'],
      resources: ['github', 'agents', 'skills', 'infrastructure', 'repositories'],
    },
    inputSchema: {
      type: 'object',
      properties: {
        contact: {
          type: 'string',
          description: 'Contact email or identifier for communication',
        },
        githubOrg: {
          type: 'string',
          description: 'GitHub organization to scan (optional)',
        },
        githubRepos: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific GitHub repositories to scan (optional)',
        },
      },
      required: ['contact'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        hypothesesRunId: {
          type: 'string',
          description: 'Unique identifier for the hypothesis generation run in OpenClaw',
        },
        eventStreamUrl: {
          type: 'string',
          description: 'URL to the event stream for this run',
        },
        status: {
          type: 'string',
          enum: ['queued', 'running', 'completed', 'failed'],
          description: 'Current status of the run',
        },
      },
      required: ['hypothesesRunId'],
    },
  },
  stats: {
    downloads: 0,
    stars: 0,
    installsAllTime: 0,
    versions: 1,
    comments: 0,
  },
  ownerUserId: 'system',
  ownerHandle: 'openclaw',
  latestVersionId: 'v1.0.0',
  latestVersion: '1.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
