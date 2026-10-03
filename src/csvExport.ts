// Builds the CSV export: one row per feature, in suggested-rank order.
// Plain functions with no React code, so they can be tested on their own.

import { checkBacklog } from './assumptionChecks'
import { finalPriority } from './pmDecision'
import type { PmDecision } from './pmDecision'
import { rankByRice } from './riceScoring'
import type { Feature } from './types'

export const CSV_HEADERS = [
  'Feature ID',
  'Feature name',
  'Description',
  'Reach (users per quarter)',
  'Impact',
  'Confidence (%)',
  'Effort (person-months)',
  'RICE score',
  'Suggested rank',
  'PM priority',
  'Evidence note',
  'Assumption flags',
  'Override reason',
] as const

// Spreadsheet apps treat a cell that starts with one of these as a formula, which a malicious or
// accidental value could use to run something. Such text gets a leading apostrophe so it stays text.
const FORMULA_START = /^[=+\-@\t\r]/

// Makes one value safe for a CSV cell: guards against formulas, then wraps it in double quotes
// and doubles any quotes inside, so commas and line breaks stay inside the cell.
export function escapeCsvCell(value: string | number): string {
  let text = typeof value === 'number' ? String(value) : value
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

// Rounds a score to two decimal places for the export, like the screen does (without commas).
function exportScore(score: number): string {
  return score.toFixed(2)
}

export function buildCsv(
  features: readonly Feature[],
  decisions: Readonly<Record<string, PmDecision>>,
): string {
  const flagsById = checkBacklog(features)
  const rows = rankByRice(features).map(({ item, result, rank }) => {
    const decision = decisions[item.id]
    const final = finalPriority(decision, rank)
    const flags = flagsById.get(item.id) ?? []
    return [
      item.id,
      item.name,
      item.description,
      item.reach,
      item.impact,
      item.confidence,
      item.effort,
      result.ok ? exportScore(result.score) : 'Not scored',
      rank ?? 'Not ranked',
      final ?? 'Not decided',
      item.evidenceNote,
      flags.length > 0 ? flags.map((flag) => flag.title).join('; ') : 'None',
      decision?.kind === 'manual' ? decision.reason : '',
    ]
  })

  // Windows-style line endings are what spreadsheet apps expect from CSV files.
  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

// A file name with today's date, like decidra-backlog-2026-10-03.csv.
export function csvFileName(today: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  return `decidra-backlog-${date}.csv`
}

// Starts the browser download. Returns false if the browser would not allow it.
export function downloadCsv(csv: string, fileName: string): boolean {
  try {
    // The byte-order mark at the start tells Excel the file is UTF-8, so curly quotes and accents show correctly.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch {
    return false
  }
}
