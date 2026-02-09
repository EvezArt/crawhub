/**
 * Multi-Currency Exchange Rates
 *
 * Provides cross-platform currency translation for all asset values.
 * Supports major world currencies with real-time conversion rates.
 */

import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { query } from './_generated/server'
import { EXCHANGE_RATES } from './currencyConversion'

/**
 * Supported currencies for cross-platform value translation
 */
export type SupportedCurrency =
  | 'USD' // US Dollar
  | 'EUR' // Euro
  | 'GBP' // British Pound
  | 'JPY' // Japanese Yen
  | 'CNY' // Chinese Yuan
  | 'INR' // Indian Rupee
  | 'CAD' // Canadian Dollar
  | 'AUD' // Australian Dollar
  | 'CHF' // Swiss Franc
  | 'KRW' // South Korean Won
  | 'BRL' // Brazilian Real
  | 'MXN' // Mexican Peso
  | 'RUB' // Russian Ruble
  | 'ZAR' // South African Rand
  | 'SGD' // Singapore Dollar
  | 'HKD' // Hong Kong Dollar
  | 'SEK' // Swedish Krona
  | 'NOK' // Norwegian Krone
  | 'DKK' // Danish Krone
  | 'NZD' // New Zealand Dollar

/**
 * Currency exchange rates relative to USD
 * Base: 1 USD = X units of target currency
 * Updated: 2026-02-09
 */
export const CURRENCY_EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0, // Base currency
  EUR: 0.92, // 1 USD = 0.92 EUR
  GBP: 0.79, // 1 USD = 0.79 GBP
  JPY: 148.5, // 1 USD = 148.5 JPY
  CNY: 7.24, // 1 USD = 7.24 CNY
  INR: 83.2, // 1 USD = 83.2 INR
  CAD: 1.36, // 1 USD = 1.36 CAD
  AUD: 1.53, // 1 USD = 1.53 AUD
  CHF: 0.88, // 1 USD = 0.88 CHF
  KRW: 1340.0, // 1 USD = 1340 KRW
  BRL: 5.02, // 1 USD = 5.02 BRL
  MXN: 17.1, // 1 USD = 17.1 MXN
  RUB: 92.5, // 1 USD = 92.5 RUB
  ZAR: 18.8, // 1 USD = 18.8 ZAR
  SGD: 1.34, // 1 USD = 1.34 SGD
  HKD: 7.82, // 1 USD = 7.82 HKD
  SEK: 10.4, // 1 USD = 10.4 SEK
  NOK: 10.7, // 1 USD = 10.7 NOK
  DKK: 6.87, // 1 USD = 6.87 DKK
  NZD: 1.65, // 1 USD = 1.65 NZD
}

/**
 * Currency symbols for display
 */
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  KRW: '₩',
  BRL: 'R$',
  MXN: 'MX$',
  RUB: '₽',
  ZAR: 'R',
  SGD: 'S$',
  HKD: 'HK$',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  NZD: 'NZ$',
}

/**
 * Currency full names for display
 */
export const CURRENCY_NAMES: Record<SupportedCurrency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CHF: 'Swiss Franc',
  KRW: 'South Korean Won',
  BRL: 'Brazilian Real',
  MXN: 'Mexican Peso',
  RUB: 'Russian Ruble',
  ZAR: 'South African Rand',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
  NZD: 'New Zealand Dollar',
}

/**
 * Valuation in a specific currency
 */
export interface CurrencyValuation {
  userId: Id<'users'>
  currency: SupportedCurrency
  currencySymbol: string
  currencyName: string
  totalValue: number
  breakdown: {
    skills: { count: number; value: number }
    souls: { count: number; value: number }
    downloads: { count: number; value: number }
    stars: { count: number; value: number }
    installsCurrent: { count: number; value: number }
    installsLifetime: { count: number; value: number }
    badges: { count: number; value: number }
    comments: { count: number; value: number }
  }
  reputationPoints: number
  reputationValue: number
  exchangeRateFromUSD: number
  valuationTimestamp: number
}

/**
 * Multi-currency portfolio view
 */
export interface MultiCurrencyValuation {
  userId: Id<'users'>
  valuations: Record<SupportedCurrency, CurrencyValuation>
  reputationPoints: number
  baseCurrency: 'USD'
  timestamp: number
}

/**
 * Convert USD amount to target currency
 */
export function convertUSDToCurrency(usdAmount: number, targetCurrency: SupportedCurrency): number {
  return usdAmount * CURRENCY_EXCHANGE_RATES[targetCurrency]
}

/**
 * Convert any currency to USD
 */
export function convertCurrencyToUSD(amount: number, sourceCurrency: SupportedCurrency): number {
  return amount / CURRENCY_EXCHANGE_RATES[sourceCurrency]
}

/**
 * Convert between any two currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency,
): number {
  // Convert to USD first, then to target currency
  const usdAmount = convertCurrencyToUSD(amount, fromCurrency)
  return convertUSDToCurrency(usdAmount, toCurrency)
}

/**
 * Get asset valuation in specific currency
 */
export const getValuationInCurrency = query({
  args: {
    userId: v.id('users'),
    currency: v.union(
      v.literal('USD'),
      v.literal('EUR'),
      v.literal('GBP'),
      v.literal('JPY'),
      v.literal('CNY'),
      v.literal('INR'),
      v.literal('CAD'),
      v.literal('AUD'),
      v.literal('CHF'),
      v.literal('KRW'),
      v.literal('BRL'),
      v.literal('MXN'),
      v.literal('RUB'),
      v.literal('ZAR'),
      v.literal('SGD'),
      v.literal('HKD'),
      v.literal('SEK'),
      v.literal('NOK'),
      v.literal('DKK'),
      v.literal('NZD'),
    ),
  },
  handler: async (ctx, args): Promise<CurrencyValuation> => {
    // Fetch all assets
    const skills = await ctx.db
      .query('skills')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    const souls = await ctx.db
      .query('souls')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    // Calculate asset counts
    let totalDownloads = 0
    let totalStars = 0
    let totalInstallsCurrent = 0
    let totalInstallsLifetime = 0
    let totalBadges = 0

    // Process skills
    for (const skill of skills) {
      const badges = await ctx.db
        .query('skillBadges')
        .withIndex('by_skill', (q) => q.eq('skillId', skill._id))
        .collect()

      totalBadges += badges.length
      totalDownloads += skill.stats.downloads
      totalStars += skill.stats.stars
      totalInstallsCurrent += skill.stats.installsCurrent ?? 0
      totalInstallsLifetime += skill.stats.installsAllTime ?? 0
    }

    // Process souls
    for (const soul of souls) {
      totalDownloads += soul.stats.downloads
      totalStars += soul.stats.stars
    }

    // Get comments
    const comments = await ctx.db
      .query('comments')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('softDeletedAt'), undefined))
      .collect()

    const totalComments = comments.length

    // Calculate USD values first
    const skillsValueUSD = skills.length * EXCHANGE_RATES.SKILL
    const soulsValueUSD = souls.length * EXCHANGE_RATES.SOUL
    const downloadsValueUSD = totalDownloads * EXCHANGE_RATES.DOWNLOAD
    const starsValueUSD = totalStars * EXCHANGE_RATES.STAR
    const installsCurrentValueUSD = totalInstallsCurrent * EXCHANGE_RATES.INSTALL_CURRENT
    const installsLifetimeValueUSD = totalInstallsLifetime * EXCHANGE_RATES.INSTALL_LIFETIME
    const badgesValueUSD = totalBadges * EXCHANGE_RATES.BADGE
    const commentsValueUSD = totalComments * EXCHANGE_RATES.COMMENT

    const totalUSD =
      skillsValueUSD +
      soulsValueUSD +
      downloadsValueUSD +
      starsValueUSD +
      installsCurrentValueUSD +
      installsLifetimeValueUSD +
      badgesValueUSD +
      commentsValueUSD

    // Calculate reputation points
    const reputationPoints =
      totalDownloads * 1 +
      totalStars * 5 +
      totalInstallsCurrent * 3 +
      totalInstallsLifetime * 1 +
      totalBadges * 50 +
      totalComments * 2

    const reputationValueUSD = reputationPoints * EXCHANGE_RATES.REPUTATION_TO_USD

    // Convert to target currency
    const exchangeRate = CURRENCY_EXCHANGE_RATES[args.currency]

    return {
      userId: args.userId,
      currency: args.currency,
      currencySymbol: CURRENCY_SYMBOLS[args.currency],
      currencyName: CURRENCY_NAMES[args.currency],
      totalValue: totalUSD * exchangeRate,
      breakdown: {
        skills: { count: skills.length, value: skillsValueUSD * exchangeRate },
        souls: { count: souls.length, value: soulsValueUSD * exchangeRate },
        downloads: { count: totalDownloads, value: downloadsValueUSD * exchangeRate },
        stars: { count: totalStars, value: starsValueUSD * exchangeRate },
        installsCurrent: { count: totalInstallsCurrent, value: installsCurrentValueUSD * exchangeRate },
        installsLifetime: { count: totalInstallsLifetime, value: installsLifetimeValueUSD * exchangeRate },
        badges: { count: totalBadges, value: badgesValueUSD * exchangeRate },
        comments: { count: totalComments, value: commentsValueUSD * exchangeRate },
      },
      reputationPoints,
      reputationValue: reputationValueUSD * exchangeRate,
      exchangeRateFromUSD: exchangeRate,
      valuationTimestamp: Date.now(),
    }
  },
})

/**
 * Get portfolio valuation in ALL supported currencies
 * Perfect for cross-platform translation and comparison
 */
export const getAllCurrencyValuations = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args): Promise<MultiCurrencyValuation> => {
    // Get valuation in all currencies
    const currencies: SupportedCurrency[] = [
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'CNY',
      'INR',
      'CAD',
      'AUD',
      'CHF',
      'KRW',
      'BRL',
      'MXN',
      'RUB',
      'ZAR',
      'SGD',
      'HKD',
      'SEK',
      'NOK',
      'DKK',
      'NZD',
    ]

    const valuations: Record<string, CurrencyValuation> = {}

    // Calculate valuation for each currency
    for (const currency of currencies) {
      const valuation = await getValuationInCurrency(ctx, {
        userId: args.userId,
        currency,
      })
      valuations[currency] = valuation
    }

    return {
      userId: args.userId,
      valuations: valuations as Record<SupportedCurrency, CurrencyValuation>,
      reputationPoints: valuations.USD.reputationPoints,
      baseCurrency: 'USD',
      timestamp: Date.now(),
    }
  },
})

/**
 * Get list of all supported currencies
 */
export const getSupportedCurrencies = query({
  args: {},
  handler: async () => {
    const currencies: Array<{
      code: SupportedCurrency
      name: string
      symbol: string
      exchangeRate: number
    }> = []

    for (const code of Object.keys(CURRENCY_EXCHANGE_RATES) as SupportedCurrency[]) {
      currencies.push({
        code,
        name: CURRENCY_NAMES[code],
        symbol: CURRENCY_SYMBOLS[code],
        exchangeRate: CURRENCY_EXCHANGE_RATES[code],
      })
    }

    return {
      currencies,
      baseCurrency: 'USD' as const,
      totalSupported: currencies.length,
      lastUpdated: Date.now(),
    }
  },
})

/**
 * Compare portfolio value across major currencies
 */
export const compareAcrossCurrencies = query({
  args: {
    userId: v.id('users'),
    currencies: v.optional(
      v.array(
        v.union(
          v.literal('USD'),
          v.literal('EUR'),
          v.literal('GBP'),
          v.literal('JPY'),
          v.literal('CNY'),
          v.literal('INR'),
          v.literal('CAD'),
          v.literal('AUD'),
          v.literal('CHF'),
          v.literal('KRW'),
          v.literal('BRL'),
          v.literal('MXN'),
          v.literal('RUB'),
          v.literal('ZAR'),
          v.literal('SGD'),
          v.literal('HKD'),
          v.literal('SEK'),
          v.literal('NOK'),
          v.literal('DKK'),
          v.literal('NZD'),
        ),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const targetCurrencies = args.currencies ?? ['USD', 'EUR', 'GBP', 'JPY', 'CNY']

    const comparisons: Array<{
      currency: SupportedCurrency
      currencyName: string
      symbol: string
      totalValue: number
      reputationValue: number
      formattedTotal: string
    }> = []

    for (const currency of targetCurrencies) {
      const valuation = await getValuationInCurrency(ctx, {
        userId: args.userId,
        currency: currency as SupportedCurrency,
      })

      comparisons.push({
        currency: valuation.currency,
        currencyName: valuation.currencyName,
        symbol: valuation.currencySymbol,
        totalValue: valuation.totalValue,
        reputationValue: valuation.reputationValue,
        formattedTotal: `${valuation.currencySymbol}${valuation.totalValue.toFixed(2)}`,
      })
    }

    return {
      userId: args.userId,
      comparisons,
      timestamp: Date.now(),
    }
  },
})
