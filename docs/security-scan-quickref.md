# Security Scanning Quick Reference

## TL;DR

```bash
# Scan your repository for exposed wallets, keys, and secrets
bun run security:scan
```

## What It Finds

- 🔐 Cryptocurrency wallets (Ethereum, Bitcoin, Solana)
- 🔑 Private keys and seed phrases
- 🎫 API keys (OpenAI, AWS, GitHub, etc.)
- 🔒 Hardcoded passwords and database credentials

## Exit Codes

- ✅ `0` = No critical issues (safe to commit)
- ❌ `1` = Critical/high severity issues found (DO NOT COMMIT)

## If Secrets Are Found

1. **STOP** - Do not commit or push
2. **Remove** the exposed secrets from your code
3. **Rotate** the compromised credentials immediately
4. **Check git history** - secrets may already be committed
5. **Use environment variables** instead

## Best Practices

```bash
# Good: Use environment variables
OPENAI_API_KEY=sk-... bun run dev

# Bad: Hardcode in source
const key = 'sk-...' // ❌ NEVER DO THIS
```

## Full Documentation

See [docs/security-scanning.md](./security-scanning.md) for complete details.

## Integration

### Pre-commit Hook

```bash
#!/bin/sh
bun run security:scan || exit 1
```

### CI/CD

```yaml
- name: Security Scan
  run: bun run security:scan
```

## Related

- Main security docs: [docs/security.md](./security.md)
- Moderation system: `convex/lib/moderation.ts`
- Git ignore rules: `.gitignore`
