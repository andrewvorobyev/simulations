export type Grid = boolean[][]

export function createGrid(width: number, height: number, fillRatio = 0.3): Grid {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Math.random() < fillRatio)
  )
}

export function createEmptyGrid(width: number, height: number): Grid {
  return Array.from({ length: height }, () => Array(width).fill(false) as boolean[])
}

function countNeighbors(grid: Grid, x: number, y: number): number {
  const height = grid.length
  const width = grid[0]!.length
  let count = 0

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      // Wrapping boundaries
      const ny = (y + dy + height) % height
      const nx = (x + dx + width) % width
      if (grid[ny]![nx]) count++
    }
  }

  return count
}

export function step(grid: Grid, spawnChance = 0): Grid {
  const height = grid.length
  const width = grid[0]!.length
  const next = createEmptyGrid(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const neighbors = countNeighbors(grid, x, y)
      const alive = grid[y]![x]

      // Conway's rules
      if (alive) {
        next[y]![x] = neighbors === 2 || neighbors === 3
      } else {
        // Birth by neighbors OR random spawn
        next[y]![x] = neighbors === 3 || (spawnChance > 0 && Math.random() < spawnChance)
      }
    }
  }

  return next
}

export class GameOfLife {
  private width: number
  private height: number
  private depth: number
  private volume: Grid[]
  private generation: number = 0
  private spawnChance: number = 0

  constructor(width: number, height: number, depth: number, fillRatio = 0.3) {
    this.width = width
    this.height = height
    this.depth = depth

    // Initialize volume with empty grids
    // z=0 is current state, z=1 is previous, z=2 is older, etc.
    this.volume = Array.from({ length: depth }, () => createEmptyGrid(width, height))

    // Start with random initial state at z=0
    this.volume[0] = createGrid(width, height, fillRatio)
  }

  setSpawnChance(chance: number): void {
    this.spawnChance = Math.max(0, Math.min(1, chance))
  }

  getSpawnChance(): number {
    return this.spawnChance
  }

  tick(): void {
    this.generation++

    // Compute next state from current (z=0)
    const nextGrid = step(this.volume[0]!, this.spawnChance)

    // Shift all layers back in time (oldest falls off)
    for (let z = this.depth - 1; z > 0; z--) {
      this.volume[z] = this.volume[z - 1]!
    }

    // Place new state at z=0
    this.volume[0] = nextGrid
  }

  getVolume(): Grid[] {
    return this.volume
  }

  getGeneration(): number {
    return this.generation
  }

  getDimensions(): { width: number; height: number; depth: number } {
    return { width: this.width, height: this.height, depth: this.depth }
  }

  reset(fillRatio = 0.3): void {
    this.generation = 0
    this.volume = Array.from({ length: this.depth }, () => createEmptyGrid(this.width, this.height))
    this.volume[0] = createGrid(this.width, this.height, fillRatio)
  }
}
