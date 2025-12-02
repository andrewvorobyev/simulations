import { SolarRenderer } from './renderer3d'
import { PLANETS } from './solarSystem'
import './solar.css'

interface SolarSettings {
  speedFactor: number
  showOrbits: boolean
  showLabels: boolean
  showAxes: boolean
  trueSpeed: boolean // When false, limit moon orbital speed for visualization
}

const STORAGE_KEY = 'solar-settings'

function loadSettings(): SolarSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return { ...getDefaultSettings(), ...JSON.parse(saved) }
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultSettings()
}

function getDefaultSettings(): SolarSettings {
  return {
    speedFactor: 10,
    showOrbits: true,
    showLabels: true,
    showAxes: false,
    trueSpeed: false, // Default to limited speed for better visualization
  }
}

function saveSettings(settings: SolarSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

class SolarApp {
  private renderer: SolarRenderer | null = null
  private settings: SolarSettings

  constructor() {
    this.settings = loadSettings()
    this.render()
    this.setupRenderer()
    this.setupEventListeners()
  }

  private render(): void {
    const app = document.querySelector<HTMLDivElement>('#app')!
    app.innerHTML = `
      <div class="solar-container">
        <div class="solar-controls">
          <div class="control-row">
            <label>
              Speed: <input type="range" id="input-speed" min="0.1" max="200" step="0.1" value="${this.settings.speedFactor}" />
              <input type="number" id="input-speed-value" min="0.1" max="200" step="0.1" value="${this.settings.speedFactor}" style="width: 60px" />
              <span id="speed-display">days/sec</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="input-orbits" ${this.settings.showOrbits ? 'checked' : ''} /> Orbits
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="input-labels" ${this.settings.showLabels ? 'checked' : ''} /> Labels
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="input-axes" ${this.settings.showAxes ? 'checked' : ''} /> Axes
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="input-true-speed" ${this.settings.trueSpeed ? 'checked' : ''} /> Fast Moons
            </label>
          </div>
          <div class="control-row">
            <label>
              Target:
              <button id="btn-prev-target" class="nav-btn">◀</button>
              <select id="select-focus">
                <option value="">Free Camera</option>
                <option value="Sun">Sun</option>
                ${PLANETS.map((p) => `<option value="${p.name}">${p.name}</option>`).join('')}
              </select>
              <button id="btn-next-target" class="nav-btn">▶</button>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="input-follow" /> Follow
            </label>
            <button id="btn-reset">Reset Time</button>
            <span class="time-display" id="time-display">Day: 0</span>
            <span class="fps-display" id="fps-display">-- FPS</span>
            <a href="/" class="back-link">← 1D</a>
            <a href="/life" class="back-link">Life →</a>
          </div>
        </div>
        <div class="solar-canvas" id="canvas-container"></div>
        <div class="solar-info">
          <h3>Solar System</h3>
          <p>Real orbital mechanics with elliptical orbits and accurate tilts.</p>
          <ul>
            <li>Scroll to zoom (fast), drag to rotate</li>
            <li>← → arrows to cycle targets with auto-follow</li>
            <li>Rings rotate with Keplerian dynamics</li>
          </ul>
        </div>
      </div>
    `
  }

  private setupRenderer(): void {
    const container = document.getElementById('canvas-container')!
    this.renderer = new SolarRenderer(container)
    // Apply saved settings
    this.renderer.setSpeedFactor(this.settings.speedFactor)
    this.renderer.setShowOrbits(this.settings.showOrbits)
    this.renderer.setShowLabels(this.settings.showLabels)
    this.renderer.setShowAxes(this.settings.showAxes)
    this.renderer.setTrueSpeed(this.settings.trueSpeed)
    this.startTimeDisplay()
  }

  private setupEventListeners(): void {
    const speedSlider = document.getElementById('input-speed') as HTMLInputElement
    const speedNumber = document.getElementById('input-speed-value') as HTMLInputElement
    const speedDisplay = document.getElementById('speed-display')!
    const selectFocus = document.getElementById('select-focus') as HTMLSelectElement
    const inputFollow = document.getElementById('input-follow') as HTMLInputElement
    const btnPrevTarget = document.getElementById('btn-prev-target')!
    const btnNextTarget = document.getElementById('btn-next-target')!

    // Build targets list: Free Camera, Sun, then all planets
    const targets = ['', 'Sun', ...PLANETS.map((p) => p.name)]

    const navigateTarget = (direction: number) => {
      const currentIndex = targets.indexOf(selectFocus.value)
      const newIndex = (currentIndex + direction + targets.length) % targets.length
      const newValue = targets[newIndex] ?? ''
      selectFocus.value = newValue

      if (newValue) {
        // Auto-enable follow when navigating to a target
        inputFollow.checked = true
        this.renderer?.focusOnPlanet(newValue)
        this.renderer?.setFollowTarget(newValue)
      } else {
        // Free camera - disable follow
        inputFollow.checked = false
        this.renderer?.setFollowTarget(null)
      }
    }

    btnPrevTarget.addEventListener('click', () => navigateTarget(-1))
    btnNextTarget.addEventListener('click', () => navigateTarget(1))

    // Keyboard navigation with arrow keys
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigateTarget(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigateTarget(1)
      }
    })

    const updateSpeed = (value: number) => {
      this.settings.speedFactor = value
      this.renderer?.setSpeedFactor(this.settings.speedFactor)
      speedDisplay.textContent = `${this.settings.speedFactor.toFixed(1)} days/sec`
      saveSettings(this.settings)
    }

    speedSlider.addEventListener('input', () => {
      const value = parseFloat(speedSlider.value)
      speedNumber.value = value.toString()
      updateSpeed(value)
    })

    speedNumber.addEventListener('input', () => {
      const value = Math.max(0.1, Math.min(200, parseFloat(speedNumber.value) || 0.1))
      speedSlider.value = value.toString()
      updateSpeed(value)
    })

    document.getElementById('input-orbits')!.addEventListener('change', (e) => {
      this.settings.showOrbits = (e.target as HTMLInputElement).checked
      this.renderer?.setShowOrbits(this.settings.showOrbits)
      saveSettings(this.settings)
    })

    document.getElementById('input-labels')!.addEventListener('change', (e) => {
      this.settings.showLabels = (e.target as HTMLInputElement).checked
      this.renderer?.setShowLabels(this.settings.showLabels)
      saveSettings(this.settings)
    })

    document.getElementById('input-axes')!.addEventListener('change', (e) => {
      this.settings.showAxes = (e.target as HTMLInputElement).checked
      this.renderer?.setShowAxes(this.settings.showAxes)
      saveSettings(this.settings)
    })

    document.getElementById('input-true-speed')!.addEventListener('change', (e) => {
      this.settings.trueSpeed = (e.target as HTMLInputElement).checked
      this.renderer?.setTrueSpeed(this.settings.trueSpeed)
      saveSettings(this.settings)
    })

    selectFocus.addEventListener('change', () => {
      const value = selectFocus.value
      if (value) {
        this.renderer?.focusOnPlanet(value)
        if (inputFollow.checked) {
          this.renderer?.setFollowTarget(value)
        }
      } else {
        this.renderer?.setFollowTarget(null)
        inputFollow.checked = false
      }
    })

    inputFollow.addEventListener('change', () => {
      const value = selectFocus.value
      if (inputFollow.checked && value) {
        this.renderer?.setFollowTarget(value)
      } else {
        this.renderer?.setFollowTarget(null)
      }
    })

    document.getElementById('btn-reset')!.addEventListener('click', () => {
      this.renderer?.setTime(0)
    })
  }

  private startTimeDisplay(): void {
    const timeDisplay = document.getElementById('time-display')!
    const fpsDisplay = document.getElementById('fps-display')!

    const updateTime = () => {
      if (this.renderer) {
        const days = this.renderer.getTime()
        const years = days / 365.25
        if (years >= 1) {
          timeDisplay.textContent = `Year: ${years.toFixed(2)} | Day: ${days.toFixed(0)}`
        } else {
          timeDisplay.textContent = `Day: ${days.toFixed(0)}`
        }

        const fps = this.renderer.getFps()
        fpsDisplay.textContent = `${fps.toFixed(0)} FPS`
      }
      requestAnimationFrame(updateTime)
    }

    updateTime()
  }
}

export function initSolar(): void {
  new SolarApp()
}
