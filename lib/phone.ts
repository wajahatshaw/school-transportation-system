/**
 * Phone normalization + validation utilities.
 *
 * Goal: accept common user input formats (spaces/dashes/parentheses),
 * normalize to a consistent string, and validate with a conservative rule:
 * - 7 to 15 digits (E.164 max length), optional leading +
 *
 * Notes:
 * - We do NOT guess country codes. If user provides `+` / `00`, we preserve it.
 * - If user provides a local number, we keep digits-only (no +).
 */

export type PhoneNormalizeResult =
  | { ok: true; normalized: string }
  | { ok: false; normalized: string; error: string }

export const DEFAULT_MIN_PHONE_DIGITS = 7
export const DEFAULT_MAX_PHONE_DIGITS = 15

function digitsOnly(input: string): string {
  return (input ?? '').replace(/\D/g, '')
}

export function normalizePhoneNumber(
  input: string,
  opts?: { maxDigits?: number }
): string {
  const raw = (input ?? '').trim()
  if (!raw) return ''

  // Convert leading 00 to +
  const withPlus = raw.startsWith('00') ? `+${raw.slice(2)}` : raw

  // Keep a single leading + if provided; remove all other non-digits
  const hasPlus = withPlus.startsWith('+')
  const digits = digitsOnly(withPlus)

  if (!digits) return ''
  const maxDigits = opts?.maxDigits
  const clamped = typeof maxDigits === 'number' ? digits.slice(0, maxDigits) : digits
  return hasPlus ? `+${clamped}` : clamped
}

export function validateAndNormalizePhoneNumber(
  input: string,
  opts?: { minDigits?: number; maxDigits?: number }
): PhoneNormalizeResult {
  const normalized = normalizePhoneNumber(input, { maxDigits: opts?.maxDigits })
  if (!normalized) return { ok: true, normalized: '' } // optional field

  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized
  const minDigits = opts?.minDigits ?? DEFAULT_MIN_PHONE_DIGITS
  const maxDigits = opts?.maxDigits ?? DEFAULT_MAX_PHONE_DIGITS

  if (digits.length < minDigits) {
    return { ok: false, normalized, error: 'Phone number is too short' }
  }
  if (digits.length > maxDigits) {
    return { ok: false, normalized, error: `Phone number must be ${maxDigits} digits or less` }
  }
  return { ok: true, normalized }
}

// ============================================================================
// US-specific formatting helpers (requested UI format)
// - Display: "+1 (248) 555-1212" (partial as user types)
// - Store:   "+12485551212"
// ============================================================================

export type UsPhoneInputResult = {
  display: string
  e164: string // '' when empty
  nationalDigits: string // up to 10 digits
}

/**
 * Takes any input (digits, +, spaces, parentheses) and returns:
 * - display string in +1 (XXX) XXX-XXXX style (supports partial typing)
 * - normalized E.164 +1XXXXXXXXXX (only when 10 digits present)
 */
export function formatUsPhoneInput(input: string): UsPhoneInputResult {
  const rawDigits = digitsOnly(input)

  // Accept pasted "+1..." by dropping a leading 1 if present
  const digits =
    rawDigits.length > 0 && rawDigits.startsWith('1') ? rawDigits.slice(1) : rawDigits

  const national = digits.slice(0, 10)

  if (!national) {
    return { display: '', e164: '', nationalDigits: '' }
  }

  const a = national.slice(0, 3)
  const b = national.slice(3, 6)
  const c = national.slice(6, 10)

  let display = '+1'
  if (a.length > 0) display += ` (${a}`
  if (a.length === 3) display += ')'
  if (b.length > 0) display += ` ${b}`
  if (b.length === 3 && c.length > 0) display += `-${c}`
  if (b.length < 3 && c.length > 0) display += ` ${c}`

  const e164 = national.length === 10 ? `+1${national}` : ''
  return { display, e164, nationalDigits: national }
}

export function validateUsPhone(input: string): { ok: true; e164: string } | { ok: false; error: string } {
  const { e164, nationalDigits } = formatUsPhoneInput(input)
  if (!nationalDigits) return { ok: true, e164: '' } // optional
  if (nationalDigits.length < 10) return { ok: false, error: 'Enter a valid 10-digit US phone number' }
  return { ok: true, e164 }
}


