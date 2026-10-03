// Regression tests for the two problems found during Phase 6 quality assurance.
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { capManualPriorities } from './pmDecision'
import type { PmDecision } from './pmDecision'
import { loadState, saveState } from './storage'
import type { KeyValueStorage } from './storage'
import { sampleFeatures } from './data/sampleFeatures'

function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

describe('manual priority after a feature is deleted', () => {
  it('lowers a manual priority that is now above the number of features', () => {
    const decisions: Record<string, PmDecision> = {
      'F-002': { kind: 'manual', priority: 3, reason: 'Last on purpose.' },
      'F-003': { kind: 'accepted' },
    }
    expect(capManualPriorities(decisions, 2)).toEqual({
      'F-002': { kind: 'manual', priority: 2, reason: 'Last on purpose.' },
      'F-003': { kind: 'accepted' },
    })
  })

  it('leaves priorities that are still in range alone', () => {
    const decisions: Record<string, PmDecision> = {
      'F-001': { kind: 'manual', priority: 2, reason: 'Fine.' },
    }
    expect(capManualPriorities(decisions, 2)).toEqual(decisions)
  })

  it('shows the same decision before and after a reload', () => {
    // Three features, F-002 set to #3, then F-001 is deleted: this mirrors App's delete handler.
    const remaining = sampleFeatures.filter((f) => f.id !== 'F-001')
    const afterDelete = capManualPriorities(
      { 'F-002': { kind: 'manual', priority: 3, reason: 'Last on purpose.' } },
      remaining.length,
    )
    const storage = memoryStorage()
    saveState(storage, { features: remaining, decisions: afterDelete, nextIdNumber: 4 })
    const loaded = loadState(storage)
    expect(loaded.status).toBe('restored')
    if (loaded.status === 'restored') expect(loaded.state.decisions).toEqual(afterDelete)
  })
})

describe('responsive layout', () => {
  it('keeps hidden table labels inside the table scroll area (no sideways page scroll on tablets)', () => {
    const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
    const rule = css.match(/\.table-wrap\s*\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toMatch(/position:\s*relative/)
    expect(rule).toMatch(/overflow-x:\s*auto/)
  })
})
