import { GameOfLife } from './gameOfLife'
import { Renderer3D } from './renderer3d'
import './life.css'

const BASE = import.meta.env.BASE_URL

class LifeApp {
  private game: GameOfLife | null = null
  private renderer: Renderer3D | null = null
  private animationId: number | null = null
  private isRunning = false
  private speed = 200 // ms per step

  // Default parameters
  private x = 30
  private y = 30
  private z = 30
  private K = 1
  private M = 0.3
  private spawnChance = 0 // Chance per empty cell to spawn per step
  private showBounds = true

  constructor() {
    this.parseUrlParams()
    this.render()
    this.setupGame()
  }

  private parseUrlParams(): void {
    const params = new URLSearchParams(window.location.search)
    this.x = parseInt(params.get('x') || '30', 10)
    this.y = parseInt(params.get('y') || '30', 10)
    this.z = parseInt(params.get('z') || '30', 10)
    this.K = parseFloat(params.get('K') || '1')
    this.M = parseFloat(params.get('M') || '0.3')
    this.spawnChance = parseFloat(params.get('spawn') || '0')

    // Clamp values
    this.x = Math.max(5, Math.min(100, this.x))
    this.y = Math.max(5, Math.min(100, this.y))
    this.z = Math.max(5, Math.min(100, this.z))
    this.K = Math.max(0.5, Math.min(5, this.K))
    this.M = Math.max(0.1, Math.min(0.9, this.M))
    this.spawnChance = Math.max(0, Math.min(0.1, this.spawnChance))
  }

  private render(): void {
    const app = document.querySelector<HTMLDivElement>('#app')!
    app.innerHTML = `
      <div class="life-container">
        <div class="life-controls">
          <div class="control-row">
            <label>
              X: <input type="number" id="input-x" value="${this.x}" min="5" max="100" />
            </label>
            <label>
              Y: <input type="number" id="input-y" value="${this.y}" min="5" max="100" />
            </label>
            <label>
              Z: <input type="number" id="input-z" value="${this.z}" min="5" max="100" />
            </label>
          </div>
          <div class="control-row">
            <label>
              K (cell size): <input type="number" id="input-k" value="${this.K}" min="0.5" max="5" step="0.1" />
            </label>
            <label>
              M (cube %): <input type="number" id="input-m" value="${this.M}" min="0.1" max="0.9" step="0.05" />
            </label>
            <label>
              Speed (ms): <input type="number" id="input-speed" value="${this.speed}" min="50" max="1000" step="50" />
            </label>
            <label>
              Spawn %: <input type="number" id="input-spawn" value="${this.spawnChance * 100}" min="0" max="10" step="0.1" />
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="input-bounds" ${this.showBounds ? 'checked' : ''} /> Bounds
            </label>
          </div>
          <div class="control-row">
            <button id="btn-start">Start</button>
            <button id="btn-step">Step</button>
            <button id="btn-reset">Reset</button>
            <button id="btn-apply">Apply Settings</button>
            <a href="${BASE}" class="back-link">Home</a>
            <a href="${BASE}cellular-automata" class="back-link">← 1D</a>
            <a href="${BASE}solar" class="back-link">Solar →</a>
          </div>
          <div class="info" id="info">
            Generation: 0 | Cells: ${this.x}×${this.y}×${this.z}
          </div>
        </div>
        <div class="life-canvas" id="canvas-container"></div>
      </div>
    `

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    document.getElementById('btn-start')!.addEventListener('click', () => this.toggleRunning())
    document.getElementById('btn-step')!.addEventListener('click', () => this.step())
    document.getElementById('btn-reset')!.addEventListener('click', () => this.reset())
    document.getElementById('btn-apply')!.addEventListener('click', () => this.applySettings())

    document.getElementById('input-speed')!.addEventListener('change', (e) => {
      this.speed = parseInt((e.target as HTMLInputElement).value, 10)
    })

    document.getElementById('input-spawn')!.addEventListener('change', (e) => {
      this.spawnChance = parseFloat((e.target as HTMLInputElement).value) / 100
      this.spawnChance = Math.max(0, Math.min(0.1, this.spawnChance))
      this.game?.setSpawnChance(this.spawnChance)
    })

    document.getElementById('input-bounds')!.addEventListener('change', (e) => {
      this.showBounds = (e.target as HTMLInputElement).checked
      this.renderer?.setShowBounds(this.showBounds)
    })
  }

  private setupGame(): void {
    const container = document.getElementById('canvas-container')!

    this.game = new GameOfLife(this.x, this.y, this.z, 0.2)
    this.game.setSpawnChance(this.spawnChance)
    this.renderer = new Renderer3D(container, this.K, this.M)
    this.renderer.setupVolume(this.x, this.y, this.z)

    // Initial render
    this.updateDisplay()
  }

  private toggleRunning(): void {
    this.isRunning = !this.isRunning
    const btn = document.getElementById('btn-start')!
    btn.textContent = this.isRunning ? 'Pause' : 'Start'

    if (this.isRunning) {
      this.runLoop()
    } else if (this.animationId) {
      clearTimeout(this.animationId)
      this.animationId = null
    }
  }

  private runLoop(): void {
    if (!this.isRunning) return

    this.step()
    this.animationId = window.setTimeout(() => this.runLoop(), this.speed)
  }

  private step(): void {
    if (!this.game || !this.renderer) return

    this.game.tick()
    this.updateDisplay()
  }

  private updateDisplay(): void {
    if (!this.game || !this.renderer) return

    const volume = this.game.getVolume()
    const generation = this.game.getGeneration()
    this.renderer.updateVolume(volume)

    // Count alive cells
    let alive = 0
    for (const grid of volume) {
      for (const row of grid) {
        for (const cell of row) {
          if (cell) alive++
        }
      }
    }

    const info = document.getElementById('info')!
    info.textContent = `Generation: ${generation} | Alive: ${alive} | Volume: ${this.x}×${this.y}×${this.z}`
  }

  private reset(): void {
    if (!this.game) return

    this.game.reset(0.2)
    this.updateDisplay()
  }

  private applySettings(): void {
    // Stop if running
    if (this.isRunning) {
      this.toggleRunning()
    }

    // Get new values
    this.x = parseInt((document.getElementById('input-x') as HTMLInputElement).value, 10)
    this.y = parseInt((document.getElementById('input-y') as HTMLInputElement).value, 10)
    this.z = parseInt((document.getElementById('input-z') as HTMLInputElement).value, 10)
    this.K = parseFloat((document.getElementById('input-k') as HTMLInputElement).value)
    this.M = parseFloat((document.getElementById('input-m') as HTMLInputElement).value)

    // Clamp
    this.x = Math.max(5, Math.min(100, this.x))
    this.y = Math.max(5, Math.min(100, this.y))
    this.z = Math.max(5, Math.min(100, this.z))
    this.K = Math.max(0.5, Math.min(5, this.K))
    this.M = Math.max(0.1, Math.min(0.9, this.M))

    // Update URL
    const url = new URL(window.location.href)
    url.searchParams.set('x', this.x.toString())
    url.searchParams.set('y', this.y.toString())
    url.searchParams.set('z', this.z.toString())
    url.searchParams.set('K', this.K.toString())
    url.searchParams.set('M', this.M.toString())
    url.searchParams.set('spawn', this.spawnChance.toString())
    window.history.replaceState({}, '', url.toString())

    // Recreate game and renderer
    if (this.renderer) {
      this.renderer.dispose()
    }

    this.game = new GameOfLife(this.x, this.y, this.z, 0.2)
    this.game.setSpawnChance(this.spawnChance)

    const container = document.getElementById('canvas-container')!
    // Clear container
    container.innerHTML = ''

    this.renderer = new Renderer3D(container, this.K, this.M)
    this.renderer.setupVolume(this.x, this.y, this.z)
    this.updateDisplay()
  }
}

export function initLife(): void {
  new LifeApp()
}
