# Wealth Acceleration Guide: Reach Diamond & Platinum Ranks

## Quick Start - Path to Ranks

### Target Ranks
- 💎 **Platinum**: 5,000 reputation points
- 💠 **Diamond**: 10,000 reputation points

### Fastest Strategies

```typescript
// Get your personalized acceleration plan
const strategy = await convex.query(api.wealthAcceleration.getPersonalizedStrategy, {
  userId: myUserId
})

// Calculate exact path to target rank
const plan = await convex.query(api.wealthAcceleration.getWealthAccelerationPlan, {
  userId: myUserId,
  targetRank: 'diamond' // or 'platinum'
})

// Simulate different actions to preview outcomes
const simulation = await convex.query(api.wealthAcceleration.simulateWealthBoost, {
  userId: myUserId,
  actions: [
    { action: 'earn_badges', quantity: 5 },  // +250 points
    { action: 'boost_stars', quantity: 100 }, // +500 points
  ]
})
```

## The Wealth Acceleration System

### Core Queries

#### 1. `getWealthAccelerationPlan`
**Purpose**: Calculate the fastest path to your target rank

**Parameters**:
- `userId`: Your user ID
- `targetRank`: 'silver' | 'gold' | 'platinum' | 'diamond'

**Returns**:
```typescript
{
  currentReputation: number,
  targetReputation: number,
  gap: number,  // Points needed
  currentRank: string,
  targetRank: string,
  recommendedActions: [
    {
      action: string,
      impact: number,
      difficulty: 'easy' | 'medium' | 'hard',
      timeEstimate: string,
      description: string
    }
  ],
  estimatedTimeToTarget: string
}
```

#### 2. `simulateWealthBoost`
**Purpose**: Preview outcomes before taking action

**Parameters**:
- `userId`: Your user ID
- `actions`: Array of actions with quantities

**Returns**:
```typescript
{
  currentReputation: number,
  currentRank: string,
  projectedReputation: number,
  projectedRank: string,
  gain: number,
  willReachDiamond: boolean,
  willReachPlatinum: boolean
}
```

#### 3. `getAchievements`
**Purpose**: See achievement milestones with bonus reputation

**Returns**:
```typescript
{
  achievements: Achievement[],
  unlockedCount: number,
  totalCount: number,
  totalBonusEarned: number,
  potentialBonus: number,
  nextAchievement: Achievement
}
```

#### 4. `getPersonalizedStrategy`
**Purpose**: Get custom strategy based on your current assets

**Returns**:
```typescript
{
  currentReputation: number,
  currentRank: string,
  strategy: string[],  // Prioritized action items
  pathToPlatinum: number,
  pathToDiamond: number,
  estimatedWeeksToPlatinum: number,
  estimatedWeeksToDiamond: number,
  keyMetrics: {
    totalSkills: number,
    totalSouls: number,
    totalBadges: number,
    skillsNeedingBadges: number,
    skillsNeedingStars: number
  }
}
```

## Wealth Boost Actions

### High Impact Actions (Ranked by ROI)

| Action | Points | Difficulty | Time | Best For |
|--------|--------|-----------|------|----------|
| **Earn Badges** | 50 each | Hard | 1-4 weeks | Biggest single boost |
| **Boost Stars** | 5 each | Medium | 1-2 weeks | Quality improvement |
| **Boost Installs** | 3 each | Medium | 2-4 weeks | Active user growth |
| **Publish Skills** | ~500 each | Hard | 1-8 weeks | Portfolio expansion |
| **Publish Souls** | ~200 each | Easy | 1-2 days | Quick wins |
| **Boost Downloads** | 1 each | Medium | 2-8 weeks | Volume approach |

### Action Strategies

#### 1. Badge Hunting (Highest Impact)
**Reputation Gain**: 50 points per badge

**How to earn badges**:
- **Official Badge**: Create high-quality, unique skills
- **Highlighted Badge**: Get featured by community/admins
- **Redaction Approved**: Follow quality standards

**Example Impact**:
- 5 badges = 250 points
- 10 badges = 500 points
- 20 badges = 1,000 points

**Timeline**: 1-4 weeks per badge

#### 2. Star Optimization (High Impact, Easier)
**Reputation Gain**: 5 points per star

**How to boost stars**:
- Improve skill quality and documentation
- Request community feedback
- Fix bugs promptly
- Add valuable features
- Engage with users

**Example Impact**:
- 100 stars = 500 points
- 200 stars = 1,000 points
- 1,000 stars = 5,000 points (Platinum!)

**Timeline**: 1-2 weeks for quality improvements

#### 3. Install Growth (Medium Impact)
**Reputation Gain**: 3 points per current install

**How to boost installs**:
- Promote skills on social media
- Write tutorials and guides
- Create demo videos
- Engage in communities
- Improve onboarding

**Example Impact**:
- 100 installs = 300 points
- 500 installs = 1,500 points
- 1,667 installs = 5,000 points (Platinum!)

**Timeline**: 2-4 weeks

#### 4. Skill Publication (Strategic Growth)
**Reputation Gain**: ~500 points per quality skill

**How to maximize**:
- Focus on underserved niches
- Use `discoverOpportunities` to find gaps
- Create high-quality documentation
- Aim for immediate stars

**Example Impact**:
- 3 quality skills = 1,500 points
- 5 quality skills = 2,500 points
- 10 quality skills = 5,000 points (Platinum!)

**Timeline**: 1-8 weeks per skill

#### 5. Soul Creation (Quick Wins)
**Reputation Gain**: ~200 points per soul

**How to create**:
- Publish AI personalities (SOUL.md files)
- Share unique character templates
- Easy and fast to create

**Example Impact**:
- 3 souls = 600 points
- 5 souls = 1,000 points
- 10 souls = 2,000 points (Gold!)

**Timeline**: 1-2 days per soul

## Achievement System

### Achievement Milestones

Unlock achievements for bonus reputation:

| Achievement | Requirement | Bonus | Total Needed |
|-------------|------------|-------|--------------|
| First Step | 1 skill | +100 | 1 skill |
| Portfolio Builder | 5 skills | +500 | 5 skills |
| Community Approved | 1 star | +50 | 1 star |
| Star Power | 100 stars | +1,000 | 100 stars |
| Badge Collector | 1 badge | +250 | 1 badge |
| Elite Status | 5 badges | +1,500 | 5 badges |
| Popular Creator | 1,000 downloads | +500 | 1,000 downloads |
| Soul Shaper | 1 soul | +100 | 1 soul |
| Diversified Portfolio | 3 skills + 2 souls | +300 | 5 assets |
| Platinum Achiever | 5,000 reputation | +2,000 | Platinum rank |
| Diamond Legend | 10,000 reputation | +5,000 | Diamond rank |

**Total Achievement Bonuses**: 11,300 points

## Fastest Paths to Ranks

### Path to Platinum (5,000 points)

**Option 1: Badge Focus (4-12 weeks)**
- Earn 10 badges across 5 skills = 500 points
- Boost to 900 stars = 4,500 points
- **Total**: 5,000 points

**Option 2: Balanced Growth (6-16 weeks)**
- Publish 5 quality skills = 2,500 points
- Earn 5 badges = 250 points
- Boost to 450 stars = 2,250 points
- **Total**: 5,000 points

**Option 3: Volume + Quality (8-20 weeks)**
- Publish 7 quality skills = 3,500 points
- Earn 300 stars = 1,500 points
- **Total**: 5,000 points

### Path to Diamond (10,000 points)

**Option 1: Elite Strategy (12-24 weeks)**
- Earn 20 badges = 1,000 points
- Publish 10 quality skills = 5,000 points
- Boost to 800 stars = 4,000 points
- **Total**: 10,000 points

**Option 2: Star Power (16-32 weeks)**
- Publish 8 quality skills = 4,000 points
- Earn 12 badges = 600 points
- Boost to 1,080 stars = 5,400 points
- **Total**: 10,000 points

**Option 3: Scale + Quality (20-40 weeks)**
- Publish 15 quality skills = 7,500 points
- Earn 500 stars = 2,500 points
- **Total**: 10,000 points

## Example Workflows

### Workflow 1: Rapid Platinum Achievement

```typescript
// Step 1: Get current status
const strategy = await convex.query(api.wealthAcceleration.getPersonalizedStrategy, {
  userId: myUserId
})

console.log(`Current: ${strategy.currentReputation} points`)
console.log(`Need: ${strategy.pathToPlatinum} points for Platinum`)
console.log(`Strategy:`, strategy.strategy)

// Step 2: Get detailed plan
const plan = await convex.query(api.wealthAcceleration.getWealthAccelerationPlan, {
  userId: myUserId,
  targetRank: 'platinum'
})

console.log('Top Actions:')
plan.recommendedActions.forEach(action => {
  console.log(`- ${action.description} (+${action.impact} points)`)
})

// Step 3: Simulate different scenarios
const scenario1 = await convex.query(api.wealthAcceleration.simulateWealthBoost, {
  userId: myUserId,
  actions: [
    { action: 'earn_badges', quantity: 10 },  // +500
    { action: 'boost_stars', quantity: 900 }, // +4,500
  ]
})

console.log(`Scenario 1: ${scenario1.projectedRank}`)
console.log(`Will reach Platinum: ${scenario1.willReachPlatinum}`)

// Step 4: Execute the plan!
// - Work on quality improvements
// - Seek badges from admins
// - Promote your skills
```

### Workflow 2: Diamond Achievement Sprint

```typescript
// Check achievements for bonus points
const achievements = await convex.query(api.wealthAcceleration.getAchievements, {
  userId: myUserId
})

console.log(`Unlocked: ${achievements.unlockedCount}/${achievements.totalCount}`)
console.log(`Earned bonus: ${achievements.totalBonusEarned}`)
console.log(`Potential bonus: ${achievements.potentialBonus}`)

// Simulate maximum effort
const maxEffort = await convex.query(api.wealthAcceleration.simulateWealthBoost, {
  userId: myUserId,
  actions: [
    { action: 'publish_skills', quantity: 10 },  // +5,000
    { action: 'earn_badges', quantity: 20 },     // +1,000
    { action: 'boost_stars', quantity: 800 },    // +4,000
  ]
})

console.log(`Max projection: ${maxEffort.projectedReputation} points`)
console.log(`Will reach Diamond: ${maxEffort.willReachDiamond}`)
```

## Tips for Success

### 1. Focus on High-ROI Actions
- Badges give 50× more value than downloads
- Stars give 5× more value than downloads
- Prioritize quality over quantity

### 2. Use Market Intelligence
```typescript
// Find opportunities
const opportunities = await convex.query(api.wealthTracking.discoverOpportunities, {})

// Target low-competition, high-demand niches
const bestOpp = opportunities.opportunities[0]
console.log(`Target: ${bestOpp.category}`)
```

### 3. Track Progress Weekly
```typescript
// Monitor growth
const history = await convex.query(api.wealthTracking.getWealthHistory, {
  userId: myUserId,
  days: 7
})

console.log(`Weekly gain: ${history.totalGrowth.downloads} downloads`)
```

### 4. Unlock Achievements Early
- Quick wins add up fast
- Some achievements unlock bonus multipliers
- Aim for diversified portfolio (skills + souls)

### 5. Community Engagement
- Stars come from quality + engagement
- Respond to feedback quickly
- Build relationships with users
- Share knowledge and help others

## Combining with Security Scanner

Protect your assets while building wealth:

```bash
# Before publishing (protect assets)
bun run security:scan

# After publishing (track value)
# Use wealth acceleration tools
```

## Success Metrics

Track these KPIs:
- ✅ Reputation score (weekly growth)
- ✅ Rank progression
- ✅ Badges earned per month
- ✅ Stars accumulated per week
- ✅ Active installs growth rate
- ✅ Achievement unlock rate

## Timeline Estimates

**Conservative** (following all recommendations):
- Bronze → Silver: 2-4 weeks
- Silver → Gold: 4-8 weeks
- Gold → Platinum: 8-16 weeks
- Platinum → Diamond: 16-32 weeks

**Aggressive** (maximum effort):
- Bronze → Silver: 1 week
- Silver → Gold: 2-3 weeks
- Gold → Platinum: 4-8 weeks
- Platinum → Diamond: 8-16 weeks

## Related Documentation

- [Wealth Tracking](./wealth-tracking.md) - Main tracking system
- [Wealth Quick Reference](./wealth-tracking-quickref.md) - Quick guide
- [Security Scanner](./security-scanning.md) - Protect your assets

---

**Remember**: Diamond and Platinum ranks are achievable with the right strategy. Focus on high-impact actions, unlock achievements, and maintain quality. You've got this! 💎💠
