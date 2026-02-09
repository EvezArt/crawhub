/**
 * Tests for Multi-Currency Support System
 */

import { convexTest } from 'convex-test'
import { expect, it } from 'vitest'
import schema from './schema'
import {
  getValuationInCurrency,
  getAllCurrencyValuations,
  getSupportedCurrencies,
  compareAcrossCurrencies,
  convertUSDToCurrency,
  convertCurrencyToUSD,
  convertCurrency,
  CURRENCY_EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
  CURRENCY_NAMES,
} from './multiCurrency'

it('should convert USD to EUR correctly', () => {
  const usd = 100
  const eur = convertUSDToCurrency(usd, 'EUR')
  expect(eur).toBeCloseTo(92, 0) // 100 USD ≈ 92 EUR
})

it('should convert USD to JPY correctly', () => {
  const usd = 100
  const jpy = convertUSDToCurrency(usd, 'JPY')
  expect(jpy).toBeCloseTo(14850, 0) // 100 USD ≈ 14,850 JPY
})

it('should convert EUR back to USD correctly', () => {
  const eur = 92
  const usd = convertCurrencyToUSD(eur, 'EUR')
  expect(usd).toBeCloseTo(100, 0)
})

it('should convert between EUR and GBP correctly', () => {
  const eur = 100
  const gbp = convertCurrency(eur, 'EUR', 'GBP')
  // 100 EUR → USD → GBP
  // 100 / 0.92 = 108.7 USD
  // 108.7 * 0.79 = 85.87 GBP
  expect(gbp).toBeCloseTo(85.87, 1)
})

it('should get valuation in EUR for user portfolio', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'euruser',
      displayName: 'EUR User',
      githubId: 60001,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill with 1000 reputation points (= $10 USD)
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'test-skill',
      displayName: 'Test Skill',
      ownerUserId: userId,
      stats: {
        downloads: 1000,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })
  })

  // Get valuation in EUR
  const valuation = await t.query(getValuationInCurrency, {
    userId,
    currency: 'EUR',
  })

  expect(valuation.currency).toBe('EUR')
  expect(valuation.currencySymbol).toBe('€')
  expect(valuation.currencyName).toBe('Euro')
  expect(valuation.reputationPoints).toBe(1000)

  // 1000 points = $10 USD
  // $10 USD * 0.92 = €9.20 EUR
  expect(valuation.reputationValue).toBeCloseTo(9.2, 1)

  // Total includes skill base ($5 USD) + reputation ($10 USD) = $15 USD
  // $15 * 0.92 = €13.80
  expect(valuation.totalValue).toBeCloseTo(13.8, 1)
})

it('should get valuation in JPY for user portfolio', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'jpyuser',
      displayName: 'JPY User',
      githubId: 60002,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill with 1000 reputation points
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'japan-skill',
      displayName: 'Japan Skill',
      ownerUserId: userId,
      stats: {
        downloads: 1000,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })
  })

  // Get valuation in JPY
  const valuation = await t.query(getValuationInCurrency, {
    userId,
    currency: 'JPY',
  })

  expect(valuation.currency).toBe('JPY')
  expect(valuation.currencySymbol).toBe('¥')
  expect(valuation.currencyName).toBe('Japanese Yen')

  // 1000 points = $10 USD
  // $10 * 148.5 = ¥1,485
  expect(valuation.reputationValue).toBeCloseTo(1485, 0)

  // Total: $15 * 148.5 = ¥2,227.50
  expect(valuation.totalValue).toBeCloseTo(2227.5, 0)
})

it('should get all currency valuations for portfolio', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'multiuser',
      displayName: 'Multi Currency User',
      githubId: 60003,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill with 500 reputation points
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'multi-skill',
      displayName: 'Multi Skill',
      ownerUserId: userId,
      stats: {
        downloads: 500,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })
  })

  // Get valuations in ALL currencies
  const allValuations = await t.query(getAllCurrencyValuations, { userId })

  expect(allValuations.userId).toBe(userId)
  expect(allValuations.baseCurrency).toBe('USD')
  expect(allValuations.reputationPoints).toBe(500)

  // Check that all currencies are present
  expect(allValuations.valuations.USD).toBeDefined()
  expect(allValuations.valuations.EUR).toBeDefined()
  expect(allValuations.valuations.GBP).toBeDefined()
  expect(allValuations.valuations.JPY).toBeDefined()
  expect(allValuations.valuations.CNY).toBeDefined()
  expect(allValuations.valuations.INR).toBeDefined()

  // Verify USD base
  // 500 points + skill base = $5 + $5 = $10 total
  expect(allValuations.valuations.USD.totalValue).toBeCloseTo(10, 1)

  // Verify EUR conversion
  // $10 * 0.92 = €9.20
  expect(allValuations.valuations.EUR.totalValue).toBeCloseTo(9.2, 1)

  // Verify JPY conversion
  // $10 * 148.5 = ¥1,485
  expect(allValuations.valuations.JPY.totalValue).toBeCloseTo(1485, 0)

  // Verify CNY conversion
  // $10 * 7.24 = ¥72.40
  expect(allValuations.valuations.CNY.totalValue).toBeCloseTo(72.4, 1)
})

it('should return list of supported currencies', async () => {
  const t = convexTest(schema)

  const result = await t.query(getSupportedCurrencies, {})

  expect(result.currencies).toBeDefined()
  expect(result.currencies.length).toBe(20) // 20 supported currencies
  expect(result.baseCurrency).toBe('USD')
  expect(result.totalSupported).toBe(20)

  // Check USD
  const usd = result.currencies.find((c) => c.code === 'USD')
  expect(usd).toBeDefined()
  expect(usd?.name).toBe('US Dollar')
  expect(usd?.symbol).toBe('$')
  expect(usd?.exchangeRate).toBe(1.0)

  // Check EUR
  const eur = result.currencies.find((c) => c.code === 'EUR')
  expect(eur).toBeDefined()
  expect(eur?.name).toBe('Euro')
  expect(eur?.symbol).toBe('€')
  expect(eur?.exchangeRate).toBe(0.92)

  // Check JPY
  const jpy = result.currencies.find((c) => c.code === 'JPY')
  expect(jpy).toBeDefined()
  expect(jpy?.name).toBe('Japanese Yen')
  expect(jpy?.symbol).toBe('¥')
  expect(jpy?.exchangeRate).toBe(148.5)
})

it('should compare portfolio across major currencies', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'compareuser',
      displayName: 'Compare User',
      githubId: 60004,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill worth $20 USD total
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'valuable-skill',
      displayName: 'Valuable Skill',
      ownerUserId: userId,
      stats: {
        downloads: 1500, // 1500 points = $15
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })
  })

  // Compare across default currencies (USD, EUR, GBP, JPY, CNY)
  const comparison = await t.query(compareAcrossCurrencies, {
    userId,
  })

  expect(comparison.comparisons).toBeDefined()
  expect(comparison.comparisons.length).toBe(5)

  // Check USD
  const usd = comparison.comparisons.find((c) => c.currency === 'USD')
  expect(usd).toBeDefined()
  expect(usd?.totalValue).toBeCloseTo(20, 1) // $5 skill + $15 reputation

  // Check EUR
  const eur = comparison.comparisons.find((c) => c.currency === 'EUR')
  expect(eur).toBeDefined()
  expect(eur?.totalValue).toBeCloseTo(18.4, 1) // $20 * 0.92
  expect(eur?.formattedTotal).toContain('€')

  // Check JPY
  const jpy = comparison.comparisons.find((c) => c.currency === 'JPY')
  expect(jpy).toBeDefined()
  expect(jpy?.totalValue).toBeCloseTo(2970, 0) // $20 * 148.5
  expect(jpy?.formattedTotal).toContain('¥')
})

it('should compare portfolio across custom currency list', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'customuser',
      displayName: 'Custom User',
      githubId: 60005,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create minimal portfolio
  await t.run(async (ctx) => {
    await ctx.db.insert('skills', {
      slug: 'simple-skill',
      displayName: 'Simple Skill',
      ownerUserId: userId,
      stats: {
        downloads: 100,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })
  })

  // Compare across custom list: USD, GBP, INR
  const comparison = await t.query(compareAcrossCurrencies, {
    userId,
    currencies: ['USD', 'GBP', 'INR'],
  })

  expect(comparison.comparisons.length).toBe(3)

  // Verify only requested currencies
  const currencies = comparison.comparisons.map((c) => c.currency)
  expect(currencies).toContain('USD')
  expect(currencies).toContain('GBP')
  expect(currencies).toContain('INR')
  expect(currencies).not.toContain('EUR')
  expect(currencies).not.toContain('JPY')
})

it('should handle badges in multi-currency valuation', async () => {
  const t = convexTest(schema)

  // Create test user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      handle: 'badgeuser2',
      displayName: 'Badge User 2',
      githubId: 60006,
      stats: { downloads: 0, stars: 0, installs: 0 },
    })
  })

  // Create skill with badges
  const skillId = await t.run(async (ctx) => {
    const id = await ctx.db.insert('skills', {
      slug: 'badged-skill-2',
      displayName: 'Badged Skill 2',
      ownerUserId: userId,
      stats: {
        downloads: 0,
        stars: 0,
        installsCurrent: 0,
        installsAllTime: 0,
      },
    })

    // Add 2 badges (2 × 50 = 100 points = $1 USD)
    await ctx.db.insert('skillBadges', {
      skillId: id,
      kind: 'official',
      awardedByUserId: userId,
      awardedAt: Date.now(),
    })
    await ctx.db.insert('skillBadges', {
      skillId: id,
      kind: 'highlighted',
      awardedByUserId: userId,
      awardedAt: Date.now(),
    })

    return id
  })

  // Get valuation in EUR
  const eurValuation = await t.query(getValuationInCurrency, {
    userId,
    currency: 'EUR',
  })

  expect(eurValuation.breakdown.badges.count).toBe(2)
  // 2 badges = 100 points = $1 USD * 0.92 = €0.92
  expect(eurValuation.reputationValue).toBeCloseTo(0.92, 2)

  // Get valuation in INR
  const inrValuation = await t.query(getValuationInCurrency, {
    userId,
    currency: 'INR',
  })

  expect(inrValuation.breakdown.badges.count).toBe(2)
  // 2 badges = $1 USD * 83.2 = ₹83.20
  expect(inrValuation.reputationValue).toBeCloseTo(83.2, 1)
})

it('should handle all currency symbols correctly', () => {
  expect(CURRENCY_SYMBOLS.USD).toBe('$')
  expect(CURRENCY_SYMBOLS.EUR).toBe('€')
  expect(CURRENCY_SYMBOLS.GBP).toBe('£')
  expect(CURRENCY_SYMBOLS.JPY).toBe('¥')
  expect(CURRENCY_SYMBOLS.INR).toBe('₹')
  expect(CURRENCY_SYMBOLS.KRW).toBe('₩')
  expect(CURRENCY_SYMBOLS.RUB).toBe('₽')
})

it('should handle all currency names correctly', () => {
  expect(CURRENCY_NAMES.USD).toBe('US Dollar')
  expect(CURRENCY_NAMES.EUR).toBe('Euro')
  expect(CURRENCY_NAMES.GBP).toBe('British Pound')
  expect(CURRENCY_NAMES.JPY).toBe('Japanese Yen')
  expect(CURRENCY_NAMES.CNY).toBe('Chinese Yuan')
  expect(CURRENCY_NAMES.INR).toBe('Indian Rupee')
})

it('should have correct exchange rates for all currencies', () => {
  expect(CURRENCY_EXCHANGE_RATES.USD).toBe(1.0)
  expect(CURRENCY_EXCHANGE_RATES.EUR).toBeGreaterThan(0.8)
  expect(CURRENCY_EXCHANGE_RATES.EUR).toBeLessThan(1.0)
  expect(CURRENCY_EXCHANGE_RATES.JPY).toBeGreaterThan(100)
  expect(CURRENCY_EXCHANGE_RATES.INR).toBeGreaterThan(70)
  expect(CURRENCY_EXCHANGE_RATES.KRW).toBeGreaterThan(1000)
})
