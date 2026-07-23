import { describe, it, expect } from 'vitest'
import { cn } from '@/shared/lib/utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2')
    expect(result).toBe('class1 class2')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'active', false && 'inactive')
    expect(result).toBe('base active')
  })

  it('should handle undefined and null', () => {
    const result = cn('base', undefined, null, 'extra')
    expect(result).toBe('base extra')
  })

  it('should merge Tailwind classes correctly', () => {
    const result = cn('px-4 py-2', 'px-8')
    expect(result).toBe('py-2 px-8') // px-8 overrides px-4
  })

  it('should handle empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle single class', () => {
    const result = cn('single-class')
    expect(result).toBe('single-class')
  })

  it('should handle array of classes', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('should handle object syntax', () => {
    const result = cn({
      'class1': true,
      'class2': false,
      'class3': true,
    })
    expect(result).toBe('class1 class3')
  })

  it('should not deduplicate non-Tailwind classes', () => {
    // cn() merges Tailwind classes but doesn't deduplicate regular classes
    const result = cn('class1', 'class1', 'class2')
    expect(result).toBe('class1 class1 class2')
  })

  it('should handle complex Tailwind merges', () => {
    const result = cn(
      'bg-red-500 text-white',
      'bg-blue-500'
    )
    expect(result).toBe('text-white bg-blue-500') // bg-blue-500 overrides bg-red-500
  })
})
