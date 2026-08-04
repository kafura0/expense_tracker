import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'

describe('Button', () => {
  it('renders a button with the label', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('disables the button while loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Click' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="Nothing here" description="Add an expense to begin." />)
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument()
    expect(screen.getByText('Add an expense to begin.')).toBeInTheDocument()
  })

  it('renders the action button and fires onClick', async () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Nothing here"
        description="Add an expense to begin."
        action={{ label: 'Add Expense', onClick }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add Expense' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Skeleton', () => {
  it('renders a shimmer div with the given class', () => {
    const { container } = render(<Skeleton className="h-6 w-40" />)
    const el = container.querySelector('.animate-shimmer')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('h-6')
  })
})
