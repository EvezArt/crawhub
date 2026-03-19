#!/usr/bin/env bun
/**
 * Security Scanner - Detect exposed wallets, private keys, and sensitive data
 *
 * This script scans the repository for:
 * - Cryptocurrency wallet addresses (Ethereum, Bitcoin, etc.)
 * - Private keys and seed phrases
 * - API keys and secrets
 * - Other sensitive patterns
 */

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

interface SecurityFinding {
  file: string
  line: number
  column: number
  pattern: string
  match: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  context: string
}

const SECURITY_PATTERNS = [
  // Cryptocurrency Wallets
  {
    name: 'Ethereum Address',
    pattern: /\b0x[a-fA-F0-9]{40}\b/g,
    severity: 'high' as const,
    description: 'Ethereum wallet address detected',
  },
  {
    name: 'Bitcoin Address (P2PKH)',
    pattern: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
    severity: 'high' as const,
    description: 'Bitcoin P2PKH address detected',
  },
  {
    name: 'Bitcoin Address (Bech32)',
    pattern: /\bbc1[a-z0-9]{39,59}\b/g,
    severity: 'high' as const,
    description: 'Bitcoin Bech32 address detected',
  },
  {
    name: 'Solana Address',
    pattern: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
    severity: 'medium' as const,
    description: 'Possible Solana address detected',
  },

  // Private Keys and Seeds
  {
    name: 'Private Key (Hex)',
    pattern: /\b(private[_-]?key|privkey)\s*[:=]\s*['\"]?[a-fA-F0-9]{64}['\"]?/gi,
    severity: 'critical' as const,
    description: 'Hexadecimal private key detected',
  },
  {
    name: 'Seed Phrase',
    pattern: /\b(seed[_-]?phrase|mnemonic)\s*[:=]\s*['\"]([a-z]+\s+){11,23}[a-z]+['\"]?/gi,
    severity: 'critical' as const,
    description: 'BIP39 seed phrase detected',
  },
  {
    name: 'Private Key Reference',
    pattern:
      /\b(private[_-]?key|secret[_-]?key)\s*[:=]\s*['\"][^'\"]{20,}['\"](?!\s*\/\/\s*(example|placeholder|test))/gi,
    severity: 'high' as const,
    description: 'Private key assignment detected',
  },

  // API Keys and Secrets
  {
    name: 'Generic API Key',
    pattern:
      /\b(api[_-]?key|apikey)\s*[:=]\s*['\"][a-zA-Z0-9_\-]{20,}['\"](?!\s*\/\/\s*(example|placeholder|test))/gi,
    severity: 'high' as const,
    description: 'API key detected',
  },
  {
    name: 'AWS Access Key',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    severity: 'critical' as const,
    description: 'AWS Access Key ID detected',
  },
  {
    name: 'AWS Secret Key',
    pattern: /\baws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9\/+=]{40}['\"]?/gi,
    severity: 'critical' as const,
    description: 'AWS Secret Access Key detected',
  },
  {
    name: 'OpenAI API Key',
    pattern: /\bsk-[a-zA-Z0-9]{20,}/g,
    severity: 'critical' as const,
    description: 'OpenAI API key detected',
  },
  {
    name: 'GitHub Token',
    pattern: /\bgh[pousr]_[a-zA-Z0-9]{36,}/g,
    severity: 'critical' as const,
    description: 'GitHub personal access token detected',
  },
  {
    name: 'JWT Token',
    pattern: /\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g,
    severity: 'medium' as const,
    description: 'JWT token detected',
  },

  // Generic Secrets
  {
    name: 'Password in Code',
    pattern: /\bpassword\s*[:=]\s*['\"][^'\"]{6,}['\"](?!\s*\/\/\s*(example|placeholder|test))/gi,
    severity: 'high' as const,
    description: 'Hardcoded password detected',
  },
  {
    name: 'Database Connection String',
    pattern: /\b(mongodb|postgres|mysql):\/\/[^:]+:[^@]+@[^\/]+/gi,
    severity: 'critical' as const,
    description: 'Database connection string with credentials detected',
  },

  // Transaction/Accounting Logic Errors
  {
    name: 'Negative Debit (Logic Error)',
    pattern: /\b(debit|charge|subtract|remove|decrease)\s*[:\(=]\s*-\d+/gi,
    severity: 'high' as const,
    description: 'Debit operation using negative number (should be positive)',
  },
  {
    name: 'Negative Credit (Logic Error)',
    pattern: /\b(credit|add|deposit|increase)\s*[:\(=]\s*-\d+/gi,
    severity: 'medium' as const,
    description: 'Credit operation using negative number (may be incorrect)',
  },
  {
    name: 'Double Negative in Transaction',
    pattern: /\b(balance|amount|total|value)\s*[-+]=\s*-\s*-/gi,
    severity: 'medium' as const,
    description: 'Double negative in transaction calculation',
  },
  {
    name: 'Suspicious Transaction Pattern',
    pattern: /\b(debt|owed|owing)\s*[:\(=]\s*-\d+(?!\s*\/\/.*correct|expected)/gi,
    severity: 'medium' as const,
    description: 'Debt represented as negative (may cause confusion)',
  },
  {
    name: 'Incorrect Balance Calculation',
    pattern: /\bbalance\s*[-+]=\s*-.*(?:debit|charge|subtract)/gi,
    severity: 'high' as const,
    description: 'Suspicious balance calculation with negative debit',
  },
]

const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  'test-results',
  'playwright-report',
  '.tanstack',
  '.nitro',
  '.output',
]

const EXCLUDED_FILES = ['package-lock.json', 'bun.lock', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store']

const SCANNABLE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.env',
  '.env.local',
  '.env.example',
  '.md',
  '.txt',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.config',
  '.sh',
  '.bash',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.swift',
]

function shouldScanFile(filename: string): boolean {
  if (EXCLUDED_FILES.includes(filename)) return false
  return SCANNABLE_EXTENSIONS.some((ext) => filename.endsWith(ext))
}

function* walkDirectory(dir: string, baseDir: string): Generator<string> {
  const files = readdirSync(dir)

  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(file)) {
        yield* walkDirectory(fullPath, baseDir)
      }
    } else if (shouldScanFile(file)) {
      yield fullPath
    }
  }
}

function scanFile(filePath: string, baseDir: string): SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const relativePath = relative(baseDir, filePath)

  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (const rule of SECURITY_PATTERNS) {
      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum]
        const matches = line.matchAll(rule.pattern)

        for (const match of matches) {
          if (match.index !== undefined) {
            // Skip if it looks like a comment or documentation
            const trimmedLine = line.trim()
            if (
              trimmedLine.startsWith('//') ||
              trimmedLine.startsWith('#') ||
              trimmedLine.startsWith('*')
            ) {
              // Still report it but with lower severity if it's in comments
              if (rule.severity === 'critical' || rule.severity === 'high') {
                continue // Skip critical/high findings in comments
              }
            }

            findings.push({
              file: relativePath,
              line: lineNum + 1,
              column: match.index + 1,
              pattern: rule.name,
              match: match[0].length > 50 ? match[0].substring(0, 47) + '...' : match[0],
              severity: rule.severity,
              context: line.trim().substring(0, 100),
            })
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ${relativePath}:`, error)
  }

  return findings
}

function printReport(findings: SecurityFinding[]) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔒 SECURITY SCAN REPORT')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (findings.length === 0) {
    console.log('✅ No security issues detected!\n')
    return
  }

  const bySeverity = {
    critical: findings.filter((f) => f.severity === 'critical'),
    high: findings.filter((f) => f.severity === 'high'),
    medium: findings.filter((f) => f.severity === 'medium'),
    low: findings.filter((f) => f.severity === 'low'),
  }

  console.log('📊 SUMMARY:')
  console.log(`   🔴 Critical: ${bySeverity.critical.length}`)
  console.log(`   🟠 High:     ${bySeverity.high.length}`)
  console.log(`   🟡 Medium:   ${bySeverity.medium.length}`)
  console.log(`   🔵 Low:      ${bySeverity.low.length}`)
  console.log(`   📝 Total:    ${findings.length}\n`)

  for (const [severity, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue

    const icon =
      severity === 'critical'
        ? '🔴'
        : severity === 'high'
          ? '🟠'
          : severity === 'medium'
            ? '🟡'
            : '🔵'

    console.log(`\n${icon} ${severity.toUpperCase()} SEVERITY (${items.length} findings):`)
    console.log('─'.repeat(60))

    for (const finding of items) {
      console.log(`\n  📁 File: ${finding.file}:${finding.line}:${finding.column}`)
      console.log(`  🔍 Pattern: ${finding.pattern}`)
      console.log(`  💬 Match: ${finding.match}`)
      console.log(`  📝 Context: ${finding.context}`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⚠️  RECOMMENDATIONS:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (bySeverity.critical.length > 0 || bySeverity.high.length > 0) {
    console.log('1. 🚨 IMMEDIATE ACTION REQUIRED:')
    console.log('   - Review and remove all exposed private keys, API keys, and secrets')
    console.log('   - Rotate any compromised credentials immediately')
    console.log(
      '   - Check git history for exposed secrets: git log --all --full-history -S "pattern"',
    )
    console.log('   - Consider using git-filter-repo to remove secrets from history\n')
  }

  console.log('2. 📋 BEST PRACTICES:')
  console.log('   - Use environment variables for all secrets (.env files)')
  console.log('   - Add .env to .gitignore (already done)')
  console.log('   - Use secret management tools (AWS Secrets Manager, HashiCorp Vault, etc.)')
  console.log('   - Never commit .env.local files')
  console.log('   - Use .env.example with placeholder values only\n')

  console.log('3. 🔧 PREVENTION:')
  console.log('   - Set up pre-commit hooks to prevent secret commits')
  console.log('   - Use tools like git-secrets or gitleaks')
  console.log('   - Enable GitHub secret scanning')
  console.log('   - Regular security audits with this script\n')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

function main() {
  const baseDir = process.cwd()
  console.log(`\n🔍 Scanning repository: ${baseDir}`)
  console.log(`📂 Excluded directories: ${EXCLUDED_DIRS.join(', ')}`)
  console.log(`📄 Scanning file types: ${SCANNABLE_EXTENSIONS.join(', ')}\n`)

  const allFindings: SecurityFinding[] = []
  let filesScanned = 0

  for (const filePath of walkDirectory(baseDir, baseDir)) {
    filesScanned++
    const findings = scanFile(filePath, baseDir)
    allFindings.push(...findings)
  }

  console.log(`✓ Scanned ${filesScanned} files\n`)
  printReport(allFindings)

  // Exit with error code if critical or high severity issues found
  const hasCriticalIssues = allFindings.some(
    (f) => f.severity === 'critical' || f.severity === 'high',
  )

  if (hasCriticalIssues) {
    process.exit(1)
  }
}

main()
