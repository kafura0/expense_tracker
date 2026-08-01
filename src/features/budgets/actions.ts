'use server'

import { revalidatePath } from 'next/cache'
import { upsertBudget as upsertBudgetRepo, deleteBudget as deleteBudgetRepo } from '@/entities/budget/repository'
import type { BudgetScope } from '@/entities/budget/repository'

export interface SaveBudgetInput {
  scope: BudgetScope
  category_id: string
  amount_cents: number
}

export async function saveBudget(input: SaveBudgetInput) {
  try {
    const data = await upsertBudgetRepo({
      scope: input.scope,
      category_id: input.category_id,
      amount_cents: input.amount_cents,
    })
    revalidatePath('/categories')
    revalidatePath('/')
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to save budget' }
  }
}

export async function removeBudget(id: string) {
  try {
    await deleteBudgetRepo(id)
    revalidatePath('/categories')
    revalidatePath('/')
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete budget' }
  }
}
