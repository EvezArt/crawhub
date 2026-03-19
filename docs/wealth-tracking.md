# Wealth & Asset Tracking System

## Overview

The Wealth & Asset Tracking System helps users locate, analyze, and maximize all valuable resources in their ClawHub environment. It provides comprehensive analytics on skills, souls, engagement metrics, and growth opportunities.

## Core Concepts

### Assets & Valuables

In ClawHub, "wealth" consists of several types of valuable resources:

1. **Skills** - Your primary wealth assets
   - Each published skill is a valuable asset
   - Value increases with usage (downloads, installs, stars)

2. **Souls** - AI personality assets
   - Shareable system lore with value
   - Generates downloads and stars

3. **Engagement Metrics** - Social capital
   - **Downloads**: 1 point each (demand indicator)
   - **Stars**: 5 points each (quality indicator)
   - **Current Installs**: 3 points each (active users)
   - **All-time Installs**: 1 point each (reach indicator)
   - **Comments**: 2 points each (engagement)

4. **Badges** - Status symbols
   - **Official Badge**: 50 points (Verified/endorsed)
   - **Highlighted Badge**: 50 points (Featured content)
   - **Deprecated Badge**: Special status
   - **Redaction Approved**: Special status

5. **Reputation Score** - Total wealth measurement
   - Calculated from all assets and engagement
   - Determines your wealth rank

### Wealth Ranks

Based on reputation score:

- **Bronze** (0-499): Starting tier
- **Silver** (500-1,999): Established contributor
- **Gold** (2,000-4,999): Valued creator
- **Platinum** (5,000-9,999): Elite contributor
- **Diamond** (10,000+): Legendary status

## Available Queries

### 1. getUserAssets

Get comprehensive asset summary for a user.

```typescript
// Query
await convex.query(api.wealthTracking.getUserAssets, {
  userId: "user-id-here"
})

// Returns
{
  userId: Id<'users'>,
  totalSkills: number,
  totalSouls: number,
  totalDownloads: number,
  totalStars: number,
  totalInstallsCurrent: number,
  totalInstallsAllTime: number,
  totalBadges: number,
  totalComments: number,
  reputationScore: number,
  wealthRank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
  skills: Array<{
    skillId: Id<'skills'>,
    slug: string,
    displayName: string,
    downloads: number,
    stars: number,
    installsCurrent: number,
    installsAllTime: number,
    badges: string[],
    value: number  // Calculated asset value
  }>,
  souls: Array<{...}>,
  missingOpportunities: string[],
  recommendations: string[]
}
```

**Use Cases:**
- View your complete asset portfolio
- Identify your most valuable assets
- Discover missing opportunities
- Get personalized recommendations

### 2. getWealthLeaderboard

See top users ranked by total wealth.

```typescript
// Query
await convex.query(api.wealthTracking.getWealthLeaderboard, {
  limit: 100  // Optional, defaults to 100
})

// Returns
[{
  userId: Id<'users'>,
  handle: string,
  displayName: string,
  totalSkills: number,
  totalSouls: number,
  totalDownloads: number,
  totalStars: number,
  totalInstallsCurrent: number,
  totalInstallsAllTime: number,
  totalBadges: number,
  reputationScore: number
}]
```

**Use Cases:**
- Competitive tracking
- Find top contributors
- Benchmark your performance
- Identify success patterns

### 3. discoverOpportunities

Find underserved categories and market gaps.

```typescript
// Query
await convex.query(api.wealthTracking.discoverOpportunities, {})

// Returns
{
  opportunities: Array<{
    category: string,
    totalSkills: number,
    totalDownloads: number,
    avgDownloadsPerSkill: number,
    competition: 'low' | 'medium' | 'high',
    recommendation: string
  }>,
  totalCategories: number,
  analysisDate: number
}
```

**Use Cases:**
- Find low-competition, high-demand niches
- Identify market gaps to fill
- Strategic skill development planning
- Maximize asset accumulation potential

### 4. getWealthHistory

Track wealth accumulation over time.

```typescript
// Query
await convex.query(api.wealthTracking.getWealthHistory, {
  userId: "user-id-here",
  days: 30  // Optional, defaults to 30
})

// Returns
{
  userId: Id<'users'>,
  periodDays: number,
  history: Array<{
    date: number,
    downloads: number,
    installs: number,
    cumulativeDownloads: number,
    cumulativeInstalls: number
  }>,
  totalGrowth: {
    downloads: number,
    installs: number
  },
  currentRate: {
    downloadsPerDay: number,
    installsPerDay: number
  } | null
}
```

**Use Cases:**
- Track growth trends
- Measure accumulation rate
- Analyze performance patterns
- Plan growth strategies

## Asset Valuation Formula

Each asset type contributes to your total reputation score:

```
Reputation Score =
  (Downloads × 1) +
  (Stars × 5) +
  (Current Installs × 3) +
  (All-time Installs × 1) +
  (Badges × 50) +
  (Comments × 2)

Individual Asset Value =
  (Downloads × 1) +
  (Stars × 5) +
  (Current Installs × 3) +
  (All-time Installs × 1) +
  (Badges × 50)
```

### Why These Weights?

- **Downloads (×1)**: Base engagement metric
- **Stars (×5)**: Quality indicator - highly valued
- **Current Installs (×3)**: Active users - most valuable
- **All-time Installs (×1)**: Historical reach
- **Badges (×50)**: Special achievements - extremely valuable
- **Comments (×2)**: Community engagement

## Strategies for Wealth Accumulation

### 1. Quality Over Quantity
- Focus on creating high-quality skills that earn stars
- Stars are worth 5× more than downloads
- Aim for badges (50× multiplier)

### 2. Retention Matters
- Current installs are 3× more valuable than historical
- Keep users engaged with updates
- Monitor and improve retention rates

### 3. Diversification
- Publish multiple skills across categories
- Create souls in addition to skills
- Don't put all eggs in one basket

### 4. Market Research
- Use `discoverOpportunities` to find gaps
- Target low-competition, high-demand niches
- Analyze what top earners are doing

### 5. Badge Hunting
- Work towards official/highlighted status
- Each badge adds 50 points
- Badges significantly boost asset value

### 6. Community Engagement
- Encourage stars and comments
- Respond to feedback
- Build relationships with users

## Missing Opportunities Detection

The system automatically identifies gaps in your portfolio:

- **No skills published**: Start building wealth by publishing
- **No souls published**: Diversify with AI personalities
- **No stars received**: Focus on quality improvement
- **No active installations**: Improve promotion/reliability
- **No badges earned**: Work towards special achievements
- **Low retention**: Users installing but not staying

## Recommendations System

Personalized advice based on your current assets:

- **Top asset identification**: Focus on your most valuable skills
- **Quality improvements**: Skills lacking stars need attention
- **Badge opportunities**: Paths to earning special status
- **Diversification**: Suggestions to expand portfolio
- **Retention optimization**: Keep users engaged longer

## Example Workflows

### Workflow 1: New User Onboarding

```typescript
// Check current status
const assets = await convex.query(api.wealthTracking.getUserAssets, {
  userId: myUserId
})

// Review missing opportunities
console.log(assets.missingOpportunities)
// ["No skills published - publish your first skill to start building wealth"]

// Find market opportunities
const opportunities = await convex.query(
  api.wealthTracking.discoverOpportunities,
  {}
)

// Target a low-competition category
const bestOpportunity = opportunities.opportunities[0]
console.log(`Focus on: ${bestOpportunity.category}`)
```

### Workflow 2: Growth Optimization

```typescript
// Analyze current portfolio
const assets = await convex.query(api.wealthTracking.getUserAssets, {
  userId: myUserId
})

// Identify top-performing asset
const topSkill = assets.skills[0]
console.log(`Best asset: ${topSkill.displayName} (${topSkill.value} points)`)

// Track growth trends
const history = await convex.query(api.wealthTracking.getWealthHistory, {
  userId: myUserId,
  days: 90
})

// Calculate growth rate
const growthRate = history.currentRate?.downloadsPerDay ?? 0
console.log(`Growing at ${growthRate} downloads/day`)

// Follow recommendations
for (const rec of assets.recommendations) {
  console.log(`TODO: ${rec}`)
}
```

### Workflow 3: Competitive Analysis

```typescript
// See where you rank
const leaderboard = await convex.query(
  api.wealthTracking.getWealthLeaderboard,
  { limit: 100 }
)

const myRank = leaderboard.findIndex(u => u.userId === myUserId) + 1
console.log(`You rank #${myRank} out of ${leaderboard.length}`)

// Analyze top performers
const topUser = leaderboard[0]
console.log(`Top user has ${topUser.reputationScore} points`)
console.log(`You need ${topUser.reputationScore - myScore} more points`)

// Study their strategy
console.log(`They have:`)
console.log(`- ${topUser.totalSkills} skills`)
console.log(`- ${topUser.totalBadges} badges`)
console.log(`- ${topUser.totalStars} stars`)
```

## Integration with Existing Systems

### Security Scanner Integration

The wealth tracking system complements the security scanner:

```bash
# Before publishing a new skill (to grow wealth)
bun run security:scan

# Then track its value after publishing
# Use getUserAssets to see how it contributes
```

### Transaction System Integration

Works with the existing transaction/stats system:

- **skillStatEvents**: Events feed into calculations
- **skillDailyStats**: Powers wealth history tracking
- **stars/downloads tables**: Direct asset metrics

## CLI Usage (Future)

```bash
# View your assets
clawhub wealth show

# See leaderboard
clawhub wealth leaderboard

# Find opportunities
clawhub wealth discover

# Track growth
clawhub wealth history --days 30
```

## API Endpoints (Future)

```
GET /api/v1/wealth/assets/:userId
GET /api/v1/wealth/leaderboard
GET /api/v1/wealth/opportunities
GET /api/v1/wealth/history/:userId?days=30
```

## Best Practices

1. **Regular Monitoring**: Check assets weekly to track progress
2. **Opportunity Scanning**: Monthly review of market gaps
3. **Portfolio Balance**: Maintain diverse asset mix
4. **Quality Focus**: Better to have 1 great skill than 10 poor ones
5. **Badge Strategy**: Actively work towards achievements
6. **Community Building**: Engage with users for sustainable growth

## Troubleshooting

### Low Reputation Score
- Publish more skills
- Improve quality to earn stars
- Seek badges and special status
- Increase community engagement

### No Growth
- Check `missingOpportunities` for gaps
- Review `recommendations` for actions
- Analyze top performers on leaderboard
- Explore underserved categories

### Asset Depreciation
- Skills losing active installs
- Focus on retention and updates
- Re-promote to attract new users
- Consider deprecating low-value assets

## Future Enhancements

Potential additions to the system:

- **Asset Trading**: Transfer or sell skills between users
- **Investment Tracking**: Track ROI on time invested
- **Predictive Analytics**: Forecast future value
- **Portfolio Optimization**: AI-powered recommendations
- **Achievement System**: Unlock milestones for bonuses
- **Wealth Sharing**: Team/organization pooling

## Related Documentation

- [Security Scanner](./security-scanning.md) - Protect your assets
- [Transaction System](./skillStatEvents.ts) - How stats are tracked
- [Schema](./schema.ts) - Data structure reference
