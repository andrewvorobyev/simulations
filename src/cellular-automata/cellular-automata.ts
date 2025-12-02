import './cellular-automata.css'
import { Renderer } from './renderer'
import { runSimulation } from './engine'
import { simulations, getSimulation } from './simulations'
import type { Simulation } from './types'

class CellularAutomataApp {
  private renderer: Renderer | null = null
  private currentSimulation: Simulation | null = null
  private currentGrid: boolean[][] = []
  private gridWidth = 1001 // Odd number for centered single cell

  constructor() {
    this.render()
    this.setupEventListeners()
    // Load first simulation by default
    this.loadSimulation(simulations[0]!.id)
  }

  private render(): void {
    const app = document.querySelector<HTMLDivElement>('#app')!
    app.innerHTML = `
      <div class="controls">
        <div class="control-group">
          <label for="simulation-select">Simulation:</label>
          <select id="simulation-select">
            ${simulations.map((s) => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="control-group">
          <label for="steps-input">Steps:</label>
          <input type="number" id="steps-input" value="500" min="1" max="10000" />
        </div>
        <div class="control-group">
          <label for="width-input">Width:</label>
          <input type="number" id="width-input" value="1001" min="101" max="5001" step="100" />
        </div>
        <button id="run-btn">Run</button>
        <div class="spacer"></div>
        <button id="center-btn" class="secondary">Center View</button>
        <div class="nav-links">
          <a href="/" class="nav-link">Home</a>
          <span class="nav-current">1D Automata</span>
          <a href="/life" class="nav-link">3D Life</a>
          <a href="/solar" class="nav-link">Solar System</a>
        </div>
      </div>
      <div class="canvas-container">
        <canvas id="canvas"></canvas>
        <div class="simulation-info">
          <h3 id="sim-title">Select a simulation</h3>
          <p id="sim-description">Choose a simulation from the dropdown and click Run.</p>
        </div>
        <div class="zoom-controls">
          <button id="zoom-in">+</button>
          <button id="zoom-out">-</button>
        </div>
        <div class="grid-info" id="grid-info"></div>
      </div>
    `
  }

  private setupEventListeners(): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    this.renderer = new Renderer(canvas, () => this.updateGridInfo())

    document.getElementById('simulation-select')!.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement
      this.loadSimulation(select.value)
    })

    document.getElementById('run-btn')!.addEventListener('click', () => {
      this.runCurrentSimulation()
    })

    document.getElementById('center-btn')!.addEventListener('click', () => {
      this.renderer?.centerView()
    })

    document.getElementById('zoom-in')!.addEventListener('click', () => {
      const view = this.renderer?.getView()
      if (view) {
        this.renderer?.setScale(view.scale * 1.3)
      }
    })

    document.getElementById('zoom-out')!.addEventListener('click', () => {
      const view = this.renderer?.getView()
      if (view) {
        this.renderer?.setScale(view.scale / 1.3)
      }
    })

    // Allow Enter to run simulation
    document.getElementById('steps-input')!.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.runCurrentSimulation()
    })

    document.getElementById('width-input')!.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.runCurrentSimulation()
    })
  }

  private loadSimulation(id: string): void {
    const simulation = getSimulation(id)
    if (!simulation) return

    this.currentSimulation = simulation
    this.updateInfo()

    // Update steps input to simulation default
    const stepsInput = document.getElementById('steps-input') as HTMLInputElement
    stepsInput.value = simulation.defaultSteps.toString()
  }

  private updateInfo(): void {
    if (!this.currentSimulation) return

    document.getElementById('sim-title')!.textContent = this.currentSimulation.name
    document.getElementById('sim-description')!.textContent = this.currentSimulation.description
  }

  private updateGridInfo(): void {
    if (!this.renderer) return
    const size = this.renderer.getGridSize()
    const view = this.renderer.getView()
    const info = document.getElementById('grid-info')
    if (info && size.width > 0) {
      info.textContent = `${size.width} x ${size.height} | Zoom: ${view.scale.toFixed(1)}x`
    }
  }

  private runCurrentSimulation(): void {
    if (!this.currentSimulation) return

    const stepsInput = document.getElementById('steps-input') as HTMLInputElement
    const widthInput = document.getElementById('width-input') as HTMLInputElement
    const steps = parseInt(stepsInput.value, 10) || 500
    this.gridWidth = parseInt(widthInput.value, 10) || 1001

    // Ensure odd width for centered single cell
    if (this.gridWidth % 2 === 0) {
      this.gridWidth += 1
      widthInput.value = this.gridWidth.toString()
    }

    const runBtn = document.getElementById('run-btn') as HTMLButtonElement
    runBtn.disabled = true
    runBtn.textContent = 'Computing...'

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const initialRow = this.currentSimulation!.startCondition.generate(this.gridWidth)
      this.currentGrid = runSimulation(this.currentSimulation!.rule, initialRow, steps)

      this.renderer?.setGrid(this.currentGrid)
      this.renderer?.centerView()
      this.updateGridInfo()

      runBtn.disabled = false
      runBtn.textContent = 'Run'
    }, 10)
  }
}

export function initCellularAutomata(): void {
  new CellularAutomataApp()
}
