export interface Rule {
  number: number
  name: string
  // Rule encoded as 8 bits (for 3-cell neighborhood)
  pattern: boolean[]
}

export interface StartCondition {
  name: string
  // Function that returns initial row given width
  generate: (width: number) => boolean[]
}

export interface Simulation {
  id: string
  name: string
  description: string
  rule: Rule
  startCondition: StartCondition
  defaultSteps: number
}

export interface SimulationState {
  simulation: Simulation
  grid: boolean[][]
  currentStep: number
}

export interface ViewState {
  offsetX: number
  offsetY: number
  scale: number
}
