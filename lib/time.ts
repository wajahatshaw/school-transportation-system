export type TimeHHMM = string

export type TimeOption = {
  value: TimeHHMM
  label: string
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTimeHHMM(value: string): value is TimeHHMM {
  return HHMM_RE.test(value)
}

export function normalizeTimeHHMM(input: string | null | undefined): TimeHHMM | '' {
  const v = (input ?? '').trim()
  if (!v) return ''
  return isValidTimeHHMM(v) ? v : ''
}

export function formatTimeLabel(value: TimeHHMM | '' | null | undefined): string {
  const v = normalizeTimeHHMM(value)
  if (!v) return ''

  const [hh, mm] = v.split(':').map(Number)
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const hour12 = ((hh + 11) % 12) + 1
  return `${hour12}:${String(mm).padStart(2, '0')} ${ampm}`
}

export function getTimeOptions(stepMinutes: number = 15): TimeOption[] {
  const step = Number.isFinite(stepMinutes) && stepMinutes > 0 ? stepMinutes : 15
  const options: TimeOption[] = []

  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    const hh = Math.floor(minutes / 60)
    const mm = minutes % 60
    const value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    options.push({ value, label: formatTimeLabel(value) })
  }

  return options
}

export type TimeValidationResult =
  | { ok: true; normalized: TimeHHMM | '' }
  | { ok: false; error: string }

export function validateTimeHHMM(input: string | null | undefined): TimeValidationResult {
  const v = (input ?? '').trim()
  if (!v) return { ok: true, normalized: '' } // optional fields
  if (!isValidTimeHHMM(v)) return { ok: false, error: 'Invalid time format' }
  return { ok: true, normalized: v }
}


