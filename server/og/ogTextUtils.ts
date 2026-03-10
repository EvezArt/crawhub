/**
 * Shared utilities for OG (Open Graph) SVG text rendering
 */

export function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function glyphWidthFactor(char: string) {
  if (char === ' ') return 0.28
  if (char === '…') return 0.62
  if (/[ilI.,:;|!'"`]/.test(char)) return 0.28
  if (/[mwMW@%&]/.test(char)) return 0.9
  if (/[A-Z]/.test(char)) return 0.68
  if (/[0-9]/.test(char)) return 0.6
  return 0.56
}

export function estimateTextWidth(value: string, fontSize: number) {
  let width = 0
  for (const char of value) width += glyphWidthFactor(char) * fontSize
  return width
}

export function truncateToWidth(value: string, maxWidth: number, fontSize: number) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (estimateTextWidth(trimmed, fontSize) <= maxWidth) return trimmed

  const ellipsis = '…'
  const ellipsisWidth = estimateTextWidth(ellipsis, fontSize)
  let out = ''
  for (const char of trimmed) {
    const next = out + char
    if (estimateTextWidth(next, fontSize) + ellipsisWidth > maxWidth) break
    out = next
  }
  return `${out.replace(/\s+$/g, '').replace(/[.。,;:!?]+$/g, '')}${ellipsis}`
}

export function wrapText(value: string, maxWidth: number, fontSize: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  function pushLine(line: string) {
    if (!line) return
    lines.push(line)
  }

  function splitLongWord(word: string) {
    if (estimateTextWidth(word, fontSize) <= maxWidth) return [word]
    const parts: string[] = []
    let remaining = word
    while (remaining && estimateTextWidth(remaining, fontSize) > maxWidth) {
      let chunk = ''
      for (const char of remaining) {
        const next = chunk + char
        if (estimateTextWidth(`${next}…`, fontSize) > maxWidth) break
        chunk = next
      }
      if (!chunk) break
      parts.push(`${chunk}…`)
      remaining = remaining.slice(chunk.length)
    }
    if (remaining) parts.push(remaining)
    return parts
  }

  for (const word of words) {
    if (estimateTextWidth(word, fontSize) > maxWidth) {
      if (current) {
        pushLine(current)
        current = ''
        if (lines.length >= maxLines - 1) break
      }
      const parts = splitLongWord(word)
      for (const part of parts) {
        pushLine(part)
        if (lines.length >= maxLines) break
      }
      current = ''
      if (lines.length >= maxLines - 1) break
      continue
    }

    const next = current ? `${current} ${word}` : word
    if (estimateTextWidth(next, fontSize) <= maxWidth) {
      current = next
      continue
    }
    pushLine(current)
    current = word
    if (lines.length >= maxLines - 1) break
  }
  if (lines.length < maxLines && current) pushLine(current)
  if (lines.length > maxLines) lines.length = maxLines

  const usedWords = lines.join(' ').split(/\s+/).filter(Boolean).length
  if (usedWords < words.length) {
    lines[lines.length - 1] = truncateToWidth(lines.at(-1) ?? '', maxWidth, fontSize)
  }
  return lines
}
