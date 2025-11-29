import type { Simulation, StartCondition } from './types'
import { createRule } from './engine'

// Start conditions
const singleCell: StartCondition = {
  name: 'Single Cell',
  generate: (width: number) => {
    const row = new Array(width).fill(false)
    row[Math.floor(width / 2)] = true
    return row
  },
}

const randomFill: StartCondition = {
  name: 'Random (50%)',
  generate: (width: number) => {
    return Array.from({ length: width }, () => Math.random() > 0.5)
  },
}

const randomSparse: StartCondition = {
  name: 'Random (10%)',
  generate: (width: number) => {
    return Array.from({ length: width }, () => Math.random() > 0.9)
  },
}

const alternating: StartCondition = {
  name: 'Alternating',
  generate: (width: number) => {
    return Array.from({ length: width }, (_, i) => i % 2 === 0)
  },
}

// ~25% random density - good for Rule 110 glider emergence
const random25: StartCondition = {
  name: 'Random (25%)',
  generate: (width: number) => {
    return Array.from({ length: width }, () => Math.random() < 0.25)
  },
}

// Periodic pattern that generates gliders in Rule 110
// Based on the "ether" background pattern with perturbations
const gliderSeeds: StartCondition = {
  name: 'Glider Seeds',
  generate: (width: number) => {
    const row = new Array(width).fill(false)
    // Create several spaced seed clusters that will produce gliders
    const seeds = [
      [1, 1, 1, 0, 0, 1], // produces A-type glider
      [1, 1, 1, 1, 0, 1, 1], // produces different glider
      [1, 0, 0, 1, 1, 1], // another seed
    ]
    const center = Math.floor(width / 2)
    // Place seeds at intervals
    let pos = center - 200
    for (let s = 0; s < 5; s++) {
      const seed = seeds[s % seeds.length]!
      for (let i = 0; i < seed.length; i++) {
        if (pos + i >= 0 && pos + i < width) {
          row[pos + i] = seed[i] === 1
        }
      }
      pos += 80 // spacing between seeds
    }
    return row
  },
}

// Right edge seed - creates gliders moving left
const rightEdgeSeed: StartCondition = {
  name: 'Right Edge',
  generate: (width: number) => {
    const row = new Array(width).fill(false)
    // Place cells near right edge - they'll generate leftward-moving structures
    for (let i = 0; i < 20; i++) {
      row[width - 1 - i] = Math.random() < 0.4
    }
    return row
  },
}

// Particle collision - two groups that will generate colliding gliders
const particleCollision: StartCondition = {
  name: 'Particle Collision',
  generate: (width: number) => {
    const row = new Array(width).fill(false)
    const center = Math.floor(width / 2)
    // Left particle source - will generate rightward-moving structures
    for (let i = 0; i < 15; i++) {
      row[center - 300 + i] = [1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1][i] === 1
    }
    // Right particle source - will generate leftward-moving structures
    for (let i = 0; i < 15; i++) {
      row[center + 285 + i] = [1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1][i] === 1
    }
    return row
  },
}

// Multiple collision sites
const multiCollision: StartCondition = {
  name: 'Multi Collision',
  generate: (width: number) => {
    const row = new Array(width).fill(false)
    // Create several collision pairs across the width
    const pattern = [1, 1, 1, 0, 1, 0, 1, 1]
    const spacing = Math.floor(width / 6)
    for (let site = 0; site < 5; site++) {
      const pos = spacing * (site + 0.5)
      for (let i = 0; i < pattern.length; i++) {
        const idx = Math.floor(pos) + i
        if (idx >= 0 && idx < width) {
          row[idx] = pattern[i] === 1
        }
      }
    }
    return row
  },
}

// Particle beam - dense stream of particles
const particleBeam: StartCondition = {
  name: 'Particle Beam',
  generate: (width: number) => {
    const row = new Array(width).fill(false)
    // Create a "beam" of regularly spaced particle seeds on the right
    // These will create a stream of leftward-moving gliders
    for (let i = 0; i < 30; i++) {
      const pos = width - 50 - i * 20
      if (pos >= 0 && pos + 5 < width) {
        // Small seed pattern
        row[pos] = true
        row[pos + 1] = true
        row[pos + 2] = true
        row[pos + 4] = true
      }
    }
    return row
  },
}

// Particle gun - creates periodic glider emissions
const particleGun: StartCondition = {
  name: 'Particle Gun',
  generate: (width: number) => {
    const row = new Array(width).fill(false)
    // A specific pattern that repeatedly emits gliders
    const gunPattern = [1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1]
    const start = width - 100
    for (let i = 0; i < gunPattern.length; i++) {
      if (start + i < width) {
        row[start + i] = gunPattern[i] === 1
      }
    }
    return row
  },
}

// Predefined simulations
export const simulations: Simulation[] = [
  {
    id: 'rule110-gliders',
    name: 'Rule 110 - Gliders',
    description: 'Best for seeing gliders emerge from sparse random start',
    rule: createRule(110),
    startCondition: random25,
    defaultSteps: 800,
  },
  {
    id: 'rule110-seeds',
    name: 'Rule 110 - Glider Seeds',
    description: 'Specific patterns that produce interacting gliders',
    rule: createRule(110),
    startCondition: gliderSeeds,
    defaultSteps: 1000,
  },
  {
    id: 'rule110-collision',
    name: 'Rule 110 - Particle Collision',
    description: 'Two particle sources creating head-on collisions',
    rule: createRule(110),
    startCondition: particleCollision,
    defaultSteps: 1200,
  },
  {
    id: 'rule110-beam',
    name: 'Rule 110 - Particle Beam',
    description: 'Stream of particles moving left, interacting',
    rule: createRule(110),
    startCondition: particleBeam,
    defaultSteps: 800,
  },
  {
    id: 'rule110-gun',
    name: 'Rule 110 - Particle Gun',
    description: 'Pattern that emits periodic glider streams',
    rule: createRule(110),
    startCondition: particleGun,
    defaultSteps: 1000,
  },
  {
    id: 'rule110-multi',
    name: 'Rule 110 - Multi Collision',
    description: 'Multiple collision sites across the grid',
    rule: createRule(110),
    startCondition: multiCollision,
    defaultSteps: 800,
  },
  {
    id: 'rule110-edge',
    name: 'Rule 110 - Edge Start',
    description: 'Gliders emerging from right edge, moving left',
    rule: createRule(110),
    startCondition: rightEdgeSeed,
    defaultSteps: 600,
  },
  {
    id: 'rule110-single',
    name: 'Rule 110 - Single Cell',
    description: 'Classic triangular growth pattern',
    rule: createRule(110),
    startCondition: singleCell,
    defaultSteps: 500,
  },
  {
    id: 'rule110-random',
    name: 'Rule 110 - Dense Random',
    description: 'Rule 110 with 50% random - chaotic interaction',
    rule: createRule(110),
    startCondition: randomFill,
    defaultSteps: 500,
  },
  {
    id: 'rule30-single',
    name: 'Rule 30 - Single Cell',
    description: 'Chaotic rule used for randomness generation',
    rule: createRule(30),
    startCondition: singleCell,
    defaultSteps: 500,
  },
  {
    id: 'rule90-single',
    name: 'Rule 90 - Single Cell',
    description: 'Produces Sierpinski triangle pattern',
    rule: createRule(90),
    startCondition: singleCell,
    defaultSteps: 500,
  },
  {
    id: 'rule184-random',
    name: 'Rule 184 - Traffic Flow',
    description: 'Models traffic flow and particle dynamics',
    rule: createRule(184),
    startCondition: randomSparse,
    defaultSteps: 500,
  },
  {
    id: 'rule54-single',
    name: 'Rule 54 - Single Cell',
    description: 'Complex behavior with triangular patterns',
    rule: createRule(54),
    startCondition: singleCell,
    defaultSteps: 500,
  },
  {
    id: 'rule150-alternating',
    name: 'Rule 150 - Alternating',
    description: 'XOR-based rule with interesting patterns',
    rule: createRule(150),
    startCondition: alternating,
    defaultSteps: 500,
  },
  {
    id: 'rule22-single',
    name: 'Rule 22 - Single Cell',
    description: 'Creates nested triangular structures',
    rule: createRule(22),
    startCondition: singleCell,
    defaultSteps: 500,
  },
]

export function getSimulation(id: string): Simulation | undefined {
  return simulations.find((s) => s.id === id)
}
