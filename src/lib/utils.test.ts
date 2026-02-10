import { describe, expect, it } from 'vitest'
import { cn, mergeClassNames } from './utils'

describe('mergeClassNames', () => {
  it('merges class names', () => {
    const maybe: string | undefined = undefined
    expect(mergeClassNames('a', maybe ? 'b' : undefined, 'c')).toBe('a c')
  })
})

describe('cn (alias)', () => {
  it('merges class names', () => {
    const maybe: string | undefined = undefined
    expect(cn('a', maybe ? 'b' : undefined, 'c')).toBe('a c')
  })
})
