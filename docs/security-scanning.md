# Security Scanning Guide

This document describes the security scanning tools available in ClawHub to detect exposed wallets, private keys, and other sensitive information.

## Quick Start

Run the security scanner:

```bash
bun run security:scan
```

Or directly:

```bash
bun scripts/security-scan.ts
```

## What Does It Scan?

The security scanner checks your repository for:

### 🔐 Cryptocurrency Wallets
- **Ethereum addresses**: 0x followed by 40 hexadecimal characters
- **Bitcoin addresses**: P2PKH (starting with 1 or 3) and Bech32 (starting with bc1)
- **Solana addresses**: Base58 encoded addresses (32-44 characters)

### 🔑 Private Keys & Seeds
- **Hexadecimal private keys**: 64-character hex strings assigned to private key variables
- **Seed phrases**: BIP39 mnemonic phrases (12-24 words)
- **Private key assignments**: Any assignments to variables named `private_key`, `secret_key`, etc.

### 🎫 API Keys & Tokens
- **AWS Access Keys**: AKIA followed by 16 alphanumeric characters
- **AWS Secret Keys**: 40-character base64 strings assigned to AWS secret variables
- **OpenAI API Keys**: Keys starting with `sk-`
- **GitHub Tokens**: Personal access tokens (ghp_, gho_, ghs_, ghu_)
- **JWT Tokens**: Base64-encoded JSON Web Tokens
- **Generic API Keys**: Common API key patterns

### 🔒 Generic Secrets
- **Hardcoded passwords**: Password assignments in code
- **Database connection strings**: MongoDB, PostgreSQL, MySQL URLs with embedded credentials

### ⚖️ Transaction/Accounting Logic Errors
- **Negative debits**: Debit operations using negative numbers (e.g., `debit: -100` should be `debit: 100`)
- **Negative credits**: Credit operations using negative numbers (may indicate logic error)
- **Double negatives**: Transaction calculations with double negatives (e.g., `balance -= --amount`)
- **Suspicious debt patterns**: Debt represented as negative values without clear documentation
- **Incorrect balance calculations**: Balance adjustments using negative debits/credits

## Severity Levels

The scanner classifies findings by severity:

- **🔴 Critical**: Exposed private keys, AWS credentials, API keys that could lead to immediate compromise
- **🟠 High**: Cryptocurrency wallet addresses, hardcoded passwords, database credentials
- **🟡 Medium**: Possible wallet addresses (could be false positives), JWT tokens
- **🔵 Low**: Minor security concerns

## What Gets Excluded?

The scanner automatically excludes:

### Directories
- `node_modules/`
- `.git/`
- `dist/`, `build/`, `.output/`
- `coverage/`, `test-results/`, `playwright-report/`
- `.tanstack/`, `.nitro/`, `.next/`, `.cache/`

### Files
- Lock files: `package-lock.json`, `bun.lock`, `yarn.lock`, `pnpm-lock.yaml`
- System files: `.DS_Store`

### File Types Scanned
The scanner only checks relevant file types:
- Source code: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, etc.
- Configuration: `.json`, `.yaml`, `.yml`, `.toml`, `.ini`, `.conf`
- Environment: `.env`, `.env.example`, `.env.local`
- Documentation: `.md`, `.txt`
- Scripts: `.sh`, `.bash`

## Understanding Transaction Logic Errors

The scanner now detects common accounting/transaction logic errors where negative numbers are used incorrectly:

### Why This Matters

In financial and accounting systems, using negative numbers incorrectly can lead to:
- **Double-charging users**: Debiting `-100` when you meant to debit `100`
- **Balance corruption**: Incorrect balance calculations that compound over time
- **Audit failures**: Confusing transaction logs that don't match accounting principles
- **Security vulnerabilities**: Logic errors that can be exploited

### Common Patterns Detected

#### 1. Negative Debit (High Severity)
```typescript
// ❌ BAD - Debiting a negative number
account.debit(-100)  // This ADDS 100 instead of subtracting!

// ✅ GOOD - Debit with positive number
account.debit(100)   // Clearly subtracts 100
```

#### 2. Negative Credit (Medium Severity)
```typescript
// ❌ SUSPICIOUS - Crediting a negative number
account.credit(-50)  // This SUBTRACTS 50 instead of adding!

// ✅ GOOD - Credit with positive number
account.credit(50)   // Clearly adds 50
```

#### 3. Double Negatives (Medium Severity)
```typescript
// ❌ BAD - Double negative is confusing
balance -= --amount  // Equivalent to balance += amount

// ✅ GOOD - Clear intention
balance += amount
```

#### 4. Debt Representation (Medium Severity)
```typescript
// ⚠️ SUSPICIOUS - Debt as negative
const debt = -1000  // Ambiguous: is this owed or credit?

// ✅ BETTER - Debt as positive with clear naming
const debtOwed = 1000  // Clear: user owes $1000
// Or document why negative is correct:
const debt = -1000  // negative = amount owed (by accounting convention)
```

### Best Practices for Transactions

1. **Use positive numbers for amounts**, let the operation determine the sign:
   ```typescript
   // Good pattern
   function debit(account: Account, amount: number) {
     if (amount < 0) throw new Error('Debit amount must be positive')
     account.balance -= amount
   }

   function credit(account: Account, amount: number) {
     if (amount < 0) throw new Error('Credit amount must be positive')
     account.balance += amount
   }
   ```

2. **Validate transaction amounts**:
   ```typescript
   function validateAmount(amount: number, operation: string) {
     if (amount <= 0) {
       throw new Error(`${operation} amount must be positive: ${amount}`)
     }
   }
   ```

3. **Use explicit delta types**:
   ```typescript
   type TransactionDelta = {
     type: 'debit' | 'credit'
     amount: number  // Always positive
   }
   ```

4. **Document intentional negative values**:
   ```typescript
   // When negative values ARE correct, document why:
   const refund = -originalCharge  // negative = reversal, documented
   ```

### Example: ClawHub's Stats System

ClawHub uses this pattern correctly in `convex/skillStatEvents.ts`:

```typescript
// Good: Operations use descriptive names, numbers show net effect
case 'star':
  result.stars += 1      // Clearly adds
  break
case 'unstar':
  result.stars -= 1      // Clearly subtracts
  break
case 'install_deactivate':
  result.installsCurrent -= 1  // Clearly reduces count
  break
```

The key: **operation name determines direction, number shows magnitude**.

## Understanding False Positives

Some findings may be false positives:

### Git Commit Hashes
Git commit SHAs (40 hex characters) can be flagged as Ethereum addresses or Solana addresses.

**How to identify**: Check if the match appears in:
- Test files (`.test.ts`, `.spec.ts`)
- Documentation (`docs/`)
- Git-related contexts

### Test Data
Test files often contain fake wallet addresses or mock credentials.

**Safe patterns**:
- Addresses like `0x0000000000000000000000000000000000000000`
- Repeated characters: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
- Obviously fake data in test fixtures

### Example Values
Documentation and example configurations may show placeholder values.

**Safe patterns**:
- Lines containing "example", "placeholder", or "test" in comments
- `.env.example` files with clear placeholder values
- README examples

## What To Do If Secrets Are Found

### Immediate Actions (Critical/High Severity)

1. **🚨 Rotate compromised credentials immediately**
   ```bash
   # Generate new API keys/secrets for affected services
   # Update environment variables
   # Revoke old credentials
   ```

2. **🔍 Check Git history**
   ```bash
   # Search for the exposed secret in history
   git log --all --full-history -S "your-secret-here"

   # Find commits that modified the file
   git log --all --full-history -- path/to/file
   ```

3. **🧹 Clean Git history (if necessary)**
   ```bash
   # WARNING: This rewrites history
   # Use git-filter-repo (recommended)
   git filter-repo --invert-paths --path path/to/secret-file

   # Or use BFG Repo-Cleaner
   bfg --delete-files secret-file.txt
   bfg --replace-text passwords.txt
   ```

4. **🔒 Update security practices**
   - Add the file pattern to `.gitignore`
   - Use environment variables for all secrets
   - Consider pre-commit hooks

### Best Practices

#### Environment Variables
```bash
# .env.local (gitignored)
OPENAI_API_KEY=sk-proj-real-key-here
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

#### Example Files
```bash
# .env.example (committed)
OPENAI_API_KEY=your-openai-api-key-here
AWS_ACCESS_KEY_ID=your-aws-access-key-id
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

#### Code Patterns
```typescript
// ❌ BAD - Hardcoded secret
const apiKey = 'sk-proj-abc123xyz';

// ✅ GOOD - Environment variable
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not configured');
}
```

## Preventing Future Exposures

### Pre-commit Hooks

Install git-secrets or gitleaks:

```bash
# git-secrets
brew install git-secrets
git secrets --install
git secrets --register-aws

# gitleaks
brew install gitleaks
```

Create a pre-commit hook (`.git/hooks/pre-commit`):
```bash
#!/bin/sh
# Run security scan before commits
bun run security:scan
if [ $? -ne 0 ]; then
  echo "❌ Security scan failed! Commit blocked."
  exit 1
fi
```

### GitHub Secret Scanning

Enable GitHub's secret scanning in your repository:

1. Go to Settings → Security → Code security and analysis
2. Enable "Secret scanning"
3. Enable "Push protection" to prevent pushes with secrets

### Regular Audits

Schedule regular security scans:

```bash
# Add to your CI/CD pipeline
- name: Security Scan
  run: bun run security:scan

# Or run weekly via cron
0 0 * * 0 cd /path/to/repo && bun run security:scan
```

## Customizing the Scanner

The scanner is located at `scripts/security-scan.ts`. You can customize:

### Add New Patterns

```typescript
const SECURITY_PATTERNS = [
  // Add your custom pattern
  {
    name: 'Custom Secret Pattern',
    pattern: /your-regex-here/g,
    severity: 'high' as const,
    description: 'Description of what this detects'
  },
  // ... existing patterns
];
```

### Exclude Additional Files

```typescript
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  'your-custom-dir', // Add here
];

const EXCLUDED_FILES = [
  'package-lock.json',
  'your-file.json', // Add here
];
```

### Add File Extensions

```typescript
const SCANNABLE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.your-extension', // Add here
];
```

## Integration with Existing Security

### Moderation Flags

The repository already has moderation flags in `convex/lib/moderation.ts` that check for:
- Suspicious keywords (malware, stealer, phishing)
- Secrets (api key, token, password, private key)
- Crypto (wallet, seed phrase, mnemonic)
- Webhooks (Discord, Slack)

The security scanner complements these by:
- Scanning the entire repository (not just uploaded skills)
- Using more specific patterns for crypto wallets
- Providing detailed reporting and remediation guidance
- Checking Git history

### OWASP Top 10 Considerations

This scanner helps prevent:
- **A02:2021 – Cryptographic Failures**: Detects exposed keys and credentials
- **A04:2021 – Insecure Design**: Identifies hardcoded secrets
- **A05:2021 – Security Misconfiguration**: Catches committed environment files
- **A07:2021 – Identification and Authentication Failures**: Finds hardcoded passwords

## Exit Codes

The scanner returns:
- `0`: No critical or high severity issues found
- `1`: Critical or high severity issues detected (fails CI)

Use in CI/CD:
```yaml
# GitHub Actions
- name: Security Scan
  run: bun run security:scan
  # Fails the build if critical issues found
```

## Support

For questions or issues with the security scanner:
1. Check this documentation
2. Review the scanner source: `scripts/security-scan.ts`
3. Open an issue in the repository

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [git-secrets](https://github.com/awslabs/git-secrets)
- [gitleaks](https://github.com/gitleaks/gitleaks)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
