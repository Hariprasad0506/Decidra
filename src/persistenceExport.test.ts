import { describe, expect, it } from 'vitest'
import { CSV_HEADERS, buildCsv, csvFileName, escapeCsvCell } from './csvExport'
import { sampleFeatures } from './data/sampleFeatures'
import type { PmDecision } from './pmDecision'
import { buildStakeholderSummary } from './stakeholderSummary'
import { STORAGE_KEY, loadState, saveState } from './storage'
import type { KeyValueStorage, SavedState } from './storage'
import type { Feature } from './types'

// An in-memory stand-in for localStorage.
function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

// A storage that throws on every call, like a blocked or full localStorage.
const brokenStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => {
    throw new Error('SecurityError')
  },
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'F-100',
    name: 'Test feature',
    description: '',
    status: 'Idea',
    reach: 1000,
    impact: 2,
    confidence: 80,
    effort: 2,
    evidenceNote: 'Interviews with 12 members.',
    dependencyNote: '',
    ...overrides,
  }
}

const sampleState: SavedState = {
  features: sampleFeatures,
  decisions: {
    'F-001': { kind: 'manual', priority: 1, reason: 'Retention is the Q3 goal.' },
    'F-003': { kind: 'accepted' },
  },
  nextIdNumber: 7,
}

describe('saving and restoring', () => {
  it('reports empty when nothing is saved, so the sample data is used', () => {
    expect(loadState(memoryStorage())).toEqual({ status: 'empty' })
  })

  it('restores exactly what was saved', () => {
    const storage = memoryStorage()
    expect(saveState(storage, sampleState)).toEqual({ ok: true })
    const loaded = loadState(storage)
    expect(loaded).toEqual({ status: 'restored', state: sampleState, skipped: 0 })
  })

  it('restores an empty backlog instead of bringing the sample data back', () => {
    const storage = memoryStorage()
    saveState(storage, { features: [], decisions: {}, nextIdNumber: 4 })
    const loaded = loadState(storage)
    expect(loaded.status).toBe('restored')
    if (loaded.status === 'restored') expect(loaded.state.features).toEqual([])
  })

  it('does not throw when storage is blocked or full', () => {
    expect(loadState(brokenStorage).status).toBe('unreadable')
    expect(loadState(null).status).toBe('unreadable')
    expect(saveState(brokenStorage, sampleState).ok).toBe(false)
    expect(saveState(null, sampleState).ok).toBe(false)
  })

  it('treats damaged or unknown data as unreadable', () => {
    for (const raw of ['not json{', 'null', '[]', '{"version":99,"features":[]}', '{"version":1}']) {
      expect(loadState(memoryStorage({ [STORAGE_KEY]: raw })).status).toBe('unreadable')
    }
  })

  it('skips broken features and decisions but keeps the rest', () => {
    const raw = JSON.stringify({
      version: 1,
      features: [
        makeFeature({ id: 'F-001' }),
        { ...makeFeature({ id: 'F-002' }), effort: 0 },
        { ...makeFeature({ id: 'F-003' }), impact: 7 },
        makeFeature({ id: 'F-001', name: 'Duplicate ID' }),
        'nonsense',
      ],
      decisions: {
        'F-001': { kind: 'manual', priority: 9, reason: 'Capped to the feature count.' },
        'F-002': { kind: 'accepted' }, // feature was skipped, so the decision goes too
      },
      nextIdNumber: 1,
    })
    const loaded = loadState(memoryStorage({ [STORAGE_KEY]: raw }))
    expect(loaded.status).toBe('restored')
    if (loaded.status !== 'restored') return
    expect(loaded.skipped).toBe(4)
    expect(loaded.state.features.map((f) => f.id)).toEqual(['F-001'])
    expect(loaded.state.decisions).toEqual({
      'F-001': { kind: 'manual', priority: 1, reason: 'Capped to the feature count.' },
    })
    // A too-low saved counter is raised so an existing ID is never reused.
    expect(loaded.state.nextIdNumber).toBe(2)
  })
})

function parseCsvRow(line: string): string[] {
  return [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'))
}

describe('CSV export', () => {
  it('quotes every cell and doubles quotes inside', () => {
    expect(escapeCsvCell('plain')).toBe('"plain"')
    expect(escapeCsvCell('say "hi", then go')).toBe('"say ""hi"", then go"')
    expect(escapeCsvCell('line one\nline two')).toBe('"line one\nline two"')
    expect(escapeCsvCell(1066.5)).toBe('"1066.5"')
  })

  it('stops spreadsheet formulas from running', () => {
    for (const text of ['=SUM(A1:A2)', '+1+1', '-2+3', '@cmd', '\tx', '\rx']) {
      expect(escapeCsvCell(text)).toBe(`"'${text}"`)
    }
    expect(escapeCsvCell('a=b')).toBe('"a=b"')
  })

  it('has every required column and one row per feature in suggested-rank order', () => {
    const csv = buildCsv(sampleFeatures, sampleState.decisions)
    const lines = csv.split('\r\n')
    expect(parseCsvRow(lines[0])).toEqual([...CSV_HEADERS])
    expect(lines).toHaveLength(sampleFeatures.length + 1)

    const rows = lines.slice(1).map(parseCsvRow)
    // Reminders 1,666.67, Planner 1,066.67, Videos 437.50
    expect(rows.map((r) => r[1])).toEqual([
      'Workout Reminder Notifications',
      'Beginner Workout Planner',
      'Exercise Demonstration Videos',
    ])
    const planner = rows[1]
    expect(planner).toEqual([
      'F-001',
      'Beginner Workout Planner',
      'A guided weekly plan that helps new members start training with confidence.',
      '2000',
      '2',
      '80',
      '3',
      '1066.67',
      '2',
      '1',
      'Exit surveys show many new members leave because they do not know where to start.',
      'None',
      'Retention is the Q3 goal.',
    ])
    expect(rows[0][9]).toBe('1') // accepted, so PM priority follows the suggested rank
    expect(rows[2][9]).toBe('Not decided')
    expect(rows[2][11]).toBe('Dependency or strategic override')
  })

  it('exports dangerous text from the backlog safely', () => {
    const csv = buildCsv(
      [makeFeature({ name: '=HYPERLINK("http://evil")', evidenceNote: 'Said "yes", twice' })],
      { 'F-100': { kind: 'manual', priority: 1, reason: '@risk' } },
    )
    const row = parseCsvRow(csv.split('\r\n')[1])
    expect(row[1]).toBe(`'=HYPERLINK("http://evil")`)
    expect(row[10]).toBe('Said "yes", twice')
    expect(row[12]).toBe("'@risk")
  })

  it('names the file with the date', () => {
    expect(csvFileName(new Date(2026, 9, 3))).toBe('decidra-backlog-2026-10-03.csv')
  })
})

describe('stakeholder summary', () => {
  it('names the top features, scores, assumptions and overrides', () => {
    const summary = buildStakeholderSummary(sampleFeatures, sampleState.decisions)
    expect(summary).toContain('1. Workout Reminder Notifications: score 1,666.67')
    expect(summary).toContain('2. Beginner Workout Planner: score 1,066.67')
    expect(summary).toContain('3. Exercise Demonstration Videos: score 437.50')
    expect(summary).toContain('- Exercise Demonstration Videos: Dependency or strategic override')
    expect(summary).toContain(
      '- Beginner Workout Planner: suggested #2, set to priority #1. Reason: Retention is the Q3 goal.',
    )
  })

  it('gives exactly the same text every time', () => {
    const decisions: Record<string, PmDecision> = { 'F-002': { kind: 'accepted' } }
    expect(buildStakeholderSummary(sampleFeatures, decisions)).toBe(
      buildStakeholderSummary([...sampleFeatures], { ...decisions }),
    )
    expect(buildStakeholderSummary(sampleFeatures, decisions)).toContain(
      'None. The PM decisions so far follow the suggested ranks.',
    )
  })

  it('handles an empty backlog and no decisions', () => {
    expect(buildStakeholderSummary([], {})).toBe(
      'The backlog is empty, so there is nothing to summarize yet.',
    )
    expect(buildStakeholderSummary(sampleFeatures, {})).toContain('No PM decisions have been made yet.')
  })
})
