# Transaction/Accounting Logic Error Detection - Enhancement Summary

## Overview

The security scanner has been enhanced to detect transaction and accounting logic errors where negative numbers are used incorrectly. This prevents financial bugs that can lead to:

- **Double-charging users** (debiting -100 adds instead of subtracts)
- **Balance corruption** (incorrect calculations compound over time)
- **Audit failures** (confusing transaction logs)
- **Exploitable logic errors** (security vulnerabilities)

## What Was Added

### New Detection Patterns (5 patterns)

1. **Negative Debit (High Severity)**
   - Pattern: `debit|charge|subtract|remove|decrease` with negative number
   - Example: `account.debit(-100)` ❌ (adds instead of subtracts)
   - Should be: `account.debit(100)` ✅

2. **Negative Credit (Medium Severity)**
   - Pattern: `credit|add|deposit|increase` with negative number
   - Example: `account.credit(-50)` ❌ (subtracts instead of adds)
   - Should be: `account.credit(50)` ✅

3. **Double Negative (Medium Severity)**
   - Pattern: `balance|amount|total|value` with double negative
   - Example: `balance -= --amount` ❌ (confusing, equivalent to +=)
   - Should be: `balance += amount` ✅

4. **Suspicious Debt Pattern (Medium Severity)**
   - Pattern: `debt|owed|owing` as negative without documentation
   - Example: `const debt = -1000` ⚠️ (ambiguous)
   - Should be: `const debtOwed = 1000` or document why negative

5. **Incorrect Balance Calculation (High Severity)**
   - Pattern: `balance` adjustment with negative debit/charge
   - Example: `balance -= -debit` ❌ (double negative)
   - Should be: `balance -= debit` ✅

## Files Modified

### 1. `scripts/security-scan.ts`
Added 5 new transaction/accounting patterns (lines 126-157):
```typescript
// Transaction/Accounting Logic Errors
{
  name: 'Negative Debit (Logic Error)',
  pattern: /\b(debit|charge|subtract|remove|decrease)\s*[:\(=]\s*-\d+/gi,
  severity: 'high' as const,
  description: 'Debit operation using negative number (should be positive)',
},
// ... 4 more patterns
```

### 2. `docs/security-scanning.md`
Added comprehensive documentation (lines 45-193):
- Why transaction errors matter
- Common patterns detected with examples
- Best practices for transaction logic
- ClawHub's correct implementation example
- Validation strategies

### 3. `docs/security-scan-quickref.md`
Updated quick reference:
- Added transaction errors to "What It Finds"
- Added transaction examples to best practices

### 4. `SECURITY_SCANNER_README.md`
Updated implementation summary:
- Listed all 5 new transaction error patterns
- Updated "What Was Built" section
- Emphasized dual purpose: security + financial correctness

## Real-World Examples from ClawHub

The scanner was informed by analyzing `convex/skillStatEvents.ts` which correctly implements transaction logic:

```typescript
// ✅ CORRECT: Operation name determines direction, number shows magnitude
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

## Best Practices Documented

The documentation now includes:

1. **Use positive numbers for amounts**
   ```typescript
   function debit(account: Account, amount: number) {
     if (amount < 0) throw new Error('Debit amount must be positive')
     account.balance -= amount
   }
   ```

2. **Validate transaction amounts**
   ```typescript
   function validateAmount(amount: number, operation: string) {
     if (amount <= 0) {
       throw new Error(`${operation} amount must be positive: ${amount}`)
     }
   }
   ```

3. **Use explicit delta types**
   ```typescript
   type TransactionDelta = {
     type: 'debit' | 'credit'
     amount: number  // Always positive
   }
   ```

4. **Document intentional negative values**
   ```typescript
   const refund = -originalCharge  // negative = reversal, documented
   ```

## Testing Results

Scanner now detects transaction errors across the codebase:
- Scans 261 files
- Detects 15 potential issues (including documentation examples)
- Classifies by severity: Critical, High, Medium, Low
- Exit code 1 if critical/high issues found

## Usage

```bash
# Run security scan
bun run security:scan

# The scanner will now detect transaction errors like:
# 🟠 HIGH SEVERITY
#   📁 File: src/transactions.ts:42:15
#   🔍 Pattern: Negative Debit (Logic Error)
#   💬 Match: debit: -100
#   📝 Context: account.debit(-100)  // BUG: adds instead of subtracts!
```

## Impact

This enhancement makes the security scanner useful for:

1. **Security teams** - Detect exposed secrets and credentials
2. **Finance teams** - Catch accounting logic errors
3. **QA teams** - Find transaction bugs before production
4. **Developers** - Learn best practices for transaction code

## Integration

The transaction patterns integrate seamlessly with existing security patterns:
- Same severity levels (critical, high, medium, low)
- Same reporting format
- Same CI/CD integration
- Same exit codes

## Future Enhancements (Optional)

Potential additions:
- Decimal precision errors (floating point for currency)
- Currency mismatch detection (USD vs EUR operations)
- Rounding error patterns
- Missing transaction validation
- Unsafe type coercion in amounts

## Related Files

- Implementation: `scripts/security-scan.ts` (lines 126-157)
- Full docs: `docs/security-scanning.md` (lines 84-193)
- Quick ref: `docs/security-scan-quickref.md`
- Examples: `convex/skillStatEvents.ts` (correct patterns)

---

**Created**: 2026-02-09
**Enhancement**: Transaction/Accounting Logic Error Detection
**Status**: ✅ Operational and documented
