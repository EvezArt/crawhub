# Wealth Tracking Quick Reference

## TL;DR

ClawHub now has a comprehensive system to track all your valuable assets and help you accumulate maximum wealth.

```bash
# Query your complete asset portfolio
convex.query(api.wealthTracking.getUserAssets, { userId })

# See where you rank
convex.query(api.wealthTracking.getWealthLeaderboard, { limit: 100 })

# Find market opportunities
convex.query(api.wealthTracking.discoverOpportunities, {})

# Track your growth
convex.query(api.wealthTracking.getWealthHistory, { userId, days: 30 })
```

## What Assets Are Tracked?

- 💎 **Skills** - Your primary wealth (each skill has value)
- 👤 **Souls** - AI personalities you've published
- ⬇️ **Downloads** - 1 point each
- ⭐ **Stars** - 5 points each (quality indicator)
- 📦 **Installs** - 3 points each (active users)
- 🏆 **Badges** - 50 points each (huge value!)
- 💬 **Comments** - 2 points each (engagement)

## Wealth Ranks

Your reputation score determines your rank:

| Rank | Score | Status |
|------|-------|--------|
| 🥉 Bronze | 0-499 | Starting out |
| 🥈 Silver | 500-1,999 | Established |
| 🥇 Gold | 2,000-4,999 | Valued creator |
| 💎 Platinum | 5,000-9,999 | Elite |
| 💠 Diamond | 10,000+ | Legendary |

## Missing Resources Detected

The system automatically tells you what's missing:

- ❌ No skills published → Start building wealth
- ❌ No souls published → Diversify assets
- ❌ No stars received → Improve quality
- ❌ No installations → Promote better
- ❌ No badges earned → Work towards achievements
- ❌ Low retention → Keep users engaged

## Top Strategies

1. **Quality > Quantity** - Stars are worth 5× downloads
2. **Badge Hunting** - Each badge = 50 points (massive boost!)
3. **Keep Users Active** - Current installs = 3× value
4. **Diversify** - Multiple skills spread risk
5. **Find Gaps** - Use opportunity scanner for untapped niches

## Example: Check Your Wealth

```typescript
const myAssets = await convex.query(api.wealthTracking.getUserAssets, {
  userId: myUserId
})

console.log(`You have ${myAssets.totalSkills} skills`)
console.log(`Reputation: ${myAssets.reputationScore}`)
console.log(`Rank: ${myAssets.wealthRank}`)
console.log(`Most valuable: ${myAssets.skills[0]?.displayName}`)

// See what you're missing
console.log('Missing:', myAssets.missingOpportunities)

// Get advice
console.log('Recommendations:', myAssets.recommendations)
```

## Example: Find Opportunities

```typescript
const opportunities = await convex.query(
  api.wealthTracking.discoverOpportunities,
  {}
)

// Find the best opportunity
const best = opportunities.opportunities[0]
console.log(`Target category: ${best.category}`)
console.log(`Competition: ${best.competition}`)
console.log(`Avg downloads: ${best.avgDownloadsPerSkill}`)
```

## Example: Track Growth

```typescript
const history = await convex.query(api.wealthTracking.getWealthHistory, {
  userId: myUserId,
  days: 30
})

console.log(`Total growth: ${history.totalGrowth.downloads} downloads`)
console.log(`Daily rate: ${history.currentRate?.downloadsPerDay}/day`)
```

## Integration with Security Scanner

The wealth tracking system complements the security scanner:

```bash
# Step 1: Scan before publishing (protect assets)
bun run security:scan

# Step 2: Publish your skill (build wealth)
clawhub publish

# Step 3: Track its value
# Use getUserAssets to see contribution
```

## Quick Wins

### Get Your First Star
- Improve skill quality
- Ask community for feedback
- Provide excellent documentation

### Earn Your First Badge
- Create high-quality, unique skills
- Contribute consistently
- Build trust with community
- Request official/highlighted status

### Reach Silver Rank (500 points)
- Publish 2-3 quality skills
- Get ~50 downloads total
- Earn ~20 stars
- Stay active

### Reach Gold Rank (2,000 points)
- Maintain 5+ quality skills
- Achieve ~200 downloads
- Earn ~80 stars
- Get first badge

## Common Questions

### Q: Why is my reputation low?
A: Focus on stars (5× value) and badges (50× value) rather than just downloads.

### Q: How do I increase retention?
A: Keep skills updated, fix bugs quickly, respond to feedback, maintain quality.

### Q: Should I publish many skills or focus on one?
A: Quality first, then diversify. One great skill (with badges) beats ten mediocre ones.

### Q: How do badges work?
A: Badges are earned through special achievements and community recognition. Each adds 50 points.

### Q: Can I track competitors?
A: Yes! Use `getWealthLeaderboard` to see top performers and study their strategies.

## Full Documentation

See [docs/wealth-tracking.md](./wealth-tracking.md) for complete details on:
- All queries and parameters
- Detailed valuation formulas
- Advanced strategies
- Integration guides
- API examples
- Best practices

## Related Systems

- **Security Scanner**: Protect your assets before publishing
- **Transaction System**: Powers the underlying stats tracking
- **Skill Stats**: Individual skill performance metrics

---

**Remember**: Wealth in ClawHub = Quality × Engagement × Recognition

Focus on creating value, engaging your community, and earning recognition through quality work!
