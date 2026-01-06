'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Label } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatTimeLabel, getTimeOptions } from '@/lib/time'

interface TimePickerProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
  stepMinutes?: number
  placeholder?: string
  className?: string
}

export function TimePicker({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  stepMinutes = 15,
  placeholder = 'Select time',
  className,
}: TimePickerProps) {
  const options = useMemo(() => getTimeOptions(stepMinutes), [stepMinutes])
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const selectedLabel = value ? formatTimeLabel(value) : ''

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(e.target as Node)) return
      setOpen(false)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </Label>

      <div className="relative">
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm',
            'border-slate-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-red-500 focus-visible:ring-red-500' : ''
          )}
        >
          <span className={cn(selectedLabel ? 'text-slate-900' : 'text-slate-500')}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', open ? 'rotate-180' : '')} />
        </button>

        {open && !disabled ? (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="max-h-64 overflow-y-auto py-1">
              <button
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-slate-50',
                  !value ? 'font-medium text-slate-900' : 'text-slate-700'
                )}
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                {placeholder}
              </button>
              {options.map((opt) => {
                const active = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-slate-50',
                      active ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-700'
                    )}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}


