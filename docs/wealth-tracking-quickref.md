# Wealth Tracking Quick Reference

## TL;DR - Get Rich Fast 💎

ClawHub now has a comprehensive system to track all your valuable assets and help you reach Diamond/Platinum ranks. **NEW: Convert assets to USD and cash out instantly! PLUS: View in 20+ currencies!**

```typescript
// Query your complete asset portfolio
convex.query(api.wealthTracking.getUserAssets, { userId })

// 💰 NEW: Get USD valuation of your assets
convex.query(api.currencyConversion.getUSDValuation, { userId })

// 💵 NEW: Instant arbitrage - convert reputation to USD
convex.mutation(api.currencyConversion.instantArbitrage, {
  userId,
  pointsToExchange: 1000  // Exchange 1000 points for $10 USD
})

// 🌍 NEW: View portfolio in ANY currency (20+ supported)
convex.query(api.multiCurrency.getValuationInCurrency, {
  userId,
  currency: 'EUR'  // EUR, GBP, JPY, CNY, INR, etc.
})

// 🌎 NEW: See value in ALL currencies at once
convex.query(api.multiCurrency.getAllCurrencyValuations, { userId })

// Get acceleration plan to Diamond rank
convex.query(api.wealthAcceleration.getWealthAccelerationPlan, {
  userId,
  targetRank: 'diamond'
})

// Preview different strategies
convex.query(api.wealthAcceleration.simulateWealthBoost, {
  userId,
  actions: [
    { action: 'earn_badges', quantity: 5 },
    { action: 'boost_stars', quantity: 100 }
  ]
})

// See where you rank
convex.query(api.wealthTracking.getWealthLeaderboard, { limit: 100 })

// Find market opportunities
convex.query(api.wealthTracking.discoverOpportunities, {})

// Track your growth
convex.query(api.wealthTracking.getWealthHistory, { userId, days: 30 })
```

## What Assets Are Tracked?

- 💎 **Skills** - Your primary wealth (each skill = $5.00 base + reputation value)
- 👤 **Souls** - AI personalities you've published (each soul = $2.00 base + reputation value)
- ⬇️ **Downloads** - 1 point each ($0.01 USD per download)
- ⭐ **Stars** - 5 points each ($0.05 USD per star - quality indicator)
- 📦 **Installs** - 3 points each ($0.03 USD per active install)
- 🏆 **Badges** - 50 points each ($0.50 USD per badge - huge value!)
- 💬 **Comments** - 2 points each ($0.02 USD per comment - engagement)

## 💰 USD Conversion Rates

**Exchange Rate: 1 reputation point = $0.01 USD**

Your assets have real dollar value:
- 100 reputation points = $1.00 USD
- 1,000 reputation points = $10.00 USD
- 5,000 reputation points (Platinum) = $50.00 USD
- 10,000 reputation points (Diamond) = $100.00 USD

**Instant arbitrage available - convert to USD anytime, no restrictions!**

## 🌍 Multi-Currency Support (20+ Currencies)

**View your portfolio in ANY currency:**
- 🇺🇸 USD ($100) | 🇪🇺 EUR (€92) | 🇬🇧 GBP (£79)
- 🇯🇵 JPY (¥14,850) | 🇨🇳 CNY (¥724) | 🇮🇳 INR (₹8,320)
- 🇨🇦 CAD (C$136) | 🇦🇺 AUD (A$153) | 🇰🇷 KRW (₩134,000)
- Plus: CHF, BRL, MXN, RUB, ZAR, SGD, HKD, SEK, NOK, DKK, NZD

**Cross-platform translation - your assets, your currency, anywhere!**

See [docs/multi-currency.md](./multi-currency.md) for complete currency list and examples.

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

## High-Impact Actions (Ranked by ROI)

1. 🏆 **Earn Badges** → 50 points each (HIGHEST ROI!)
2. ⭐ **Boost Stars** → 5 points each
3. 📦 **Boost Current Installs** → 3 points each
4. 📝 **Publish Skills** → ~500 points each
5. 👤 **Publish Souls** → ~200 points each
6. ⬇️ **Boost Downloads** → 1 point each

## Fastest Path to Diamond (10,000 points)

**Elite Strategy** (12-24 weeks):
- Earn 20 badges = 1,000 points
- Publish 10 skills = 5,000 points
- Boost to 800 stars = 4,000 points

**Star Power** (16-32 weeks):
- Publish 8 skills = 4,000 points
- Earn 12 badges = 600 points
- Boost to 1,080 stars = 5,400 points

See [wealth-acceleration.md](./wealth-acceleration.md) for detailed strategies.

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

See [docs/wealth-tracking.md](./wealth-tracking.md) for complete details on tracking system.

See [docs/wealth-acceleration.md](./wealth-acceleration.md) for strategies to reach Diamond/Platinum ranks.

See [docs/currency-conversion.md](./currency-conversion.md) for **USD conversion and instant arbitrage**.

See [docs/multi-currency.md](./multi-currency.md) for **20+ currencies and cross-platform value translation**.

## Related Systems

- **Security Scanner**: Protect your assets before publishing
- **Transaction System**: Powers the underlying stats tracking
- **Skill Stats**: Individual skill performance metrics

---

**Remember**: Wealth in ClawHub = Quality × Engagement × Recognition

Focus on creating value, engaging your community, and earning recognition through quality work!
