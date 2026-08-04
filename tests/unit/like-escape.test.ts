import { describe, it, expect } from 'vitest'
import { escapeLikePattern } from '@/shared/lib/like-escape'

describe('escapeLikePattern', () => {
  it('escapes percent signs', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%')
  })

  it('escapes underscores', () => {
    expect(escapeLikePattern('a_b')).toBe('a\\_b')
  })

  it('escapes backslashes first', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b')
  })

  it('escapes all metacharacters together', () => {
    expect(escapeLikePattern('50%_done\\')).toBe('50\\%\\_done\\\\')
  })

  it('leaves plain text unchanged', () => {
    expect(escapeLikePattern('plain text')).toBe('plain text')
  })

  it('handles empty string', () => {
    expect(escapeLikePattern('')).toBe('')
  })
})
