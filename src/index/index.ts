import './index.css'

class IndexApp {
  constructor() {
    this.render()
  }

  private render(): void {
    const app = document.querySelector<HTMLDivElement>('#app')!
    app.innerHTML = `
      <div class="index-container">
        <header class="index-header">
          <h1>Simulations</h1>
          <p>A bunch of interactive simulations</p>
        </header>
        <div class="simulation-grid">
          <a href="/cellular-automata" class="simulation-card">
            <h2>1D Cellular Automata</h2>
            <p>Explore elementary cellular automata including Rule 110, Rule 30, and other fascinating patterns that emerge from simple rules.</p>
            <div class="card-footer">
              <span class="tag">1D Grid</span>
              <span class="arrow">&rarr;</span>
            </div>
          </a>
          <a href="/life" class="simulation-card">
            <h2>3D Game of Life</h2>
            <p>A three-dimensional extension of Conway's Game of Life. Watch cells live, die, and evolve in 3D space.</p>
            <div class="card-footer">
              <span class="tag">3D Volume</span>
              <span class="arrow">&rarr;</span>
            </div>
          </a>
          <a href="/solar" class="simulation-card">
            <h2>Solar System</h2>
            <p>An interactive 3D visualization of our solar system with accurate orbital mechanics, moons, rings, and asteroid belts.</p>
            <div class="card-footer">
              <span class="tag">3D Orbits</span>
              <span class="arrow">&rarr;</span>
            </div>
          </a>
        </div>
      </div>
    `
  }
}

export function initIndex(): void {
  new IndexApp()
}
