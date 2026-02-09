import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function mergeClassNames(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Legacy alias for backwards compatibility
export const cn = mergeClassNames
