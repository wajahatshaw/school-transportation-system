import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white',
        secondary: 'bg-slate-100 text-slate-900',
        success: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-600/20',
        warning: 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-600/20',
        danger: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-600/20',
        outline: 'border border-slate-300 text-slate-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
