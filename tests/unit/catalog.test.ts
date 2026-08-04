import { describe, it, expect } from 'vitest'
import {
  CATEGORY_CATALOG,
  categoryCatalogByKind,
  findCatalogCategory,
  findCatalogCategoryByName,
} from '@/entities/category/catalog'

describe('category catalog', () => {
  it('contains only unique keys', () => {
    const keys = CATEGORY_CATALOG.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('contains only valid kinds', () => {
    for (const c of CATEGORY_CATALOG) {
      expect(['income', 'expense']).toContain(c.kind)
    }
  })

  it('has both income and expense categories', () => {
    expect(categoryCatalogByKind('income').length).toBeGreaterThan(0)
    expect(categoryCatalogByKind('expense').length).toBeGreaterThan(0)
    expect(CATEGORY_CATALOG.length).toBe(
      categoryCatalogByKind('income').length + categoryCatalogByKind('expense').length
    )
  })

  it('findCatalogCategory returns the matching option', () => {
    expect(findCatalogCategory('fixed-expenses')?.name).toBe('Fixed Expenses')
  })

  it('findCatalogCategory returns undefined for unknown key', () => {
    expect(findCatalogCategory('nope')).toBeUndefined()
  })

  it('findCatalogCategoryByName matches case-insensitively', () => {
    expect(findCatalogCategoryByName('FIXED EXPENSES')?.key).toBe('fixed-expenses')
  })

  it('findCatalogCategoryByName returns undefined for unknown name', () => {
    expect(findCatalogCategoryByName('Unknown')).toBeUndefined()
  })
})
