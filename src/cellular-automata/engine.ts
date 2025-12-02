import type { Rule } from './types'

export function createRule(ruleNumber: number): Rule {
  // Convert rule number to 8-bit pattern
  // Each bit represents output for a specific 3-cell input pattern
  const pattern: boolean[] = []
  for (let i = 0; i < 8; i++) {
    pattern[i] = ((ruleNumber >> i) & 1) === 1
  }
  return {
    number: ruleNumber,
    name: `Rule ${ruleNumber}`,
    pattern,
  }
}

export function applyRule(rule: Rule, left: boolean, center: boolean, right: boolean): boolean {
  // Convert 3-cell neighborhood to index (0-7)
  const index = (left ? 4 : 0) + (center ? 2 : 0) + (right ? 1 : 0)
  return rule.pattern[index]!
}

export function computeNextGeneration(rule: Rule, currentRow: boolean[]): boolean[] {
  const width = currentRow.length
  const nextRow: boolean[] = new Array(width)

  for (let i = 0; i < width; i++) {
    // Fixed boundaries - edges treated as dead (false)
    const left = i > 0 ? currentRow[i - 1]! : false
    const center = currentRow[i]!
    const right = i < width - 1 ? currentRow[i + 1]! : false
    nextRow[i] = applyRule(rule, left, center, right)
  }

  return nextRow
}

export function runSimulation(
  rule: Rule,
  initialRow: boolean[],
  steps: number
): boolean[][] {
  const grid: boolean[][] = [initialRow]

  let currentRow = initialRow
  for (let i = 0; i < steps; i++) {
    currentRow = computeNextGeneration(rule, currentRow)
    grid.push(currentRow)
  }

  return grid
}
