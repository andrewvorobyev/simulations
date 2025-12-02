import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  type CelestialBody,
  SUN,
  PLANETS,
  SCALE,
  getOrbitalPosition,
  getRotationAngle,
} from './solarSystem'
import {
  createPlanetMesh,
  createParticleSun,
  createMoonMesh,
  createRingParticles,
  updateSunCorona,
  updateRingParticles,
  type RingParticleData,
  type PlanetMeshData,
} from './planetRenderer'

interface PlanetData {
  body: CelestialBody
  mesh: THREE.Mesh
  meshData: PlanetMeshData
  orbitLine?: THREE.Line
  axisLine?: THREE.Line
  moons: MoonData[]
  ringData?: RingParticleData
  moonOrbitScale: (semiMajorAxis: number) => number
  moonPeriodScale: number
}

interface MoonData {
  body: CelestialBody
  mesh: THREE.Mesh
  orbitLine?: THREE.Line
}

interface SunData {
  core: THREE.Points
  corona: THREE.Points
  corePositions: Float32Array
  coronaPositions: Float32Array
  coronaVelocities: Float32Array
}

export class SolarRenderer {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls

  private sunData: SunData | null = null
  private sunLight: THREE.PointLight | null = null
  private sunRadius = 0
  private planets: PlanetData[] = []

  private time = 0 // simulation time in days
  private speedFactor = 1 // days per second
  private showOrbits = true
  private showLabels = true
  private showAxes = false
  private trueSpeed = false // When false, limit moon orbital speed
  private sunAxisLine: THREE.Line | null = null

  private followTarget: string | null = null
  private cameraOffset = new THREE.Vector3(30, 15, 30)

  private labels: Map<string, HTMLDivElement> = new Map()
  private container: HTMLElement

  // FPS tracking
  private fps = 0
  private frameCount = 0
  private fpsTime = 0

  constructor(container: HTMLElement) {
    this.container = container

    // Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000008)

    // Add starfield
    this.createStarfield()

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    )
    this.camera.position.set(200, 100, 200)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(this.renderer.domElement)

    // Controls with faster zoom
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 1
    this.controls.maxDistance = 5000
    this.controls.zoomSpeed = 3.0
    this.controls.rotateSpeed = 1.0
    this.controls.panSpeed = 2.0

    // Ambient light for base visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15)
    this.scene.add(ambientLight)

    // Handle resize
    window.addEventListener('resize', () => this.onResize())

    // Create solar system
    this.createSolarSystem()

    // Start render loop
    this.animate()
  }

  private createStarfield(): void {
    const geometry = new THREE.BufferGeometry()
    const positions: number[] = []
    const colors: number[] = []

    for (let i = 0; i < 15000; i++) {
      const r = 3000 + Math.random() * 2000
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )

      // Vary star colors slightly
      const colorT = Math.random()
      if (colorT < 0.7) {
        colors.push(1, 1, 1) // White
      } else if (colorT < 0.85) {
        colors.push(1, 0.9, 0.8) // Warm
      } else {
        colors.push(0.8, 0.9, 1) // Cool
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      sizeAttenuation: false,
    })

    const stars = new THREE.Points(geometry, material)
    this.scene.add(stars)
  }

  private createSolarSystem(): void {
    // Create particle Sun
    this.sunRadius = SUN.radius * SCALE.SUN_SCALE
    this.sunData = createParticleSun(this.sunRadius)
    // Set rotation order for consistency with planets
    this.sunData.core.rotation.order = 'YXZ'
    this.sunData.core.rotation.z = (SUN.axialTilt * Math.PI) / 180
    this.scene.add(this.sunData.core)
    this.scene.add(this.sunData.corona)

    // Sun light - bright point light with no decay for distant planets
    this.sunLight = new THREE.PointLight(0xffffff, 3, 0, 0)
    this.sunLight.position.set(0, 0, 0)
    this.scene.add(this.sunLight)

    // Sun axis line
    this.sunAxisLine = this.createAxisLine(SUN, this.sunRadius)
    this.scene.add(this.sunAxisLine)

    // Create label for Sun
    this.createLabel('Sun', new THREE.Vector3(0, this.sunRadius + 2, 0))

    // Create planets
    for (const planetData of PLANETS) {
      this.createPlanet(planetData)
    }
  }

  private createPlanet(body: CelestialBody): void {
    const radius = Math.max(body.radius * SCALE.PLANET_SCALE, 0.5)
    const planetMeshData = createPlanetMesh(body, radius)

    // Set rotation order so tilt (Z) is applied first, then spin (Y)
    planetMeshData.mesh.rotation.order = 'ZXY'
    planetMeshData.mesh.rotation.z = (body.axialTilt * Math.PI) / 180

    this.scene.add(planetMeshData.mesh)

    // Create orbit line
    const orbitLine = this.createOrbitLine(body, SCALE.AU_TO_UNITS)
    this.scene.add(orbitLine)

    // Create axis line
    const axisLine = this.createAxisLine(body, radius)
    this.scene.add(axisLine)

    // Create rings if planet has them
    let ringData: RingParticleData | undefined

    if (body.hasRings) {
      const innerRadius = radius * (body.ringInnerRadius || 1.5)
      const outerRadius = radius * (body.ringOuterRadius || 2.5)
      ringData = createRingParticles(
        radius,
        innerRadius,
        outerRadius,
        body.ringColor || 0xc9b896,
        SCALE.RING_PARTICLES
      )
      this.scene.add(ringData.mesh)
    }

    // Calculate moon orbit scale function for this planet
    let moonOrbitScale: (semiMajorAxis: number) => number = () => 0
    let moonPeriodScale = 1

    if (body.moons && body.moons.length > 0) {
      const moonDistances = body.moons.map((m) => m.semiMajorAxis)
      const minDist = Math.min(...moonDistances)
      const maxDist = Math.max(...moonDistances)
      const minOrbit = radius * SCALE.MOON_ORBIT_MIN
      const maxOrbit = radius * SCALE.MOON_ORBIT_MAX

      if (maxDist === minDist) {
        const midOrbit = (minOrbit + maxOrbit) / 2
        moonOrbitScale = () => midOrbit
      } else {
        moonOrbitScale = (semiMajorAxis: number) => {
          const t = (semiMajorAxis - minDist) / (maxDist - minDist)
          return minOrbit + t * (maxOrbit - minOrbit)
        }
      }

      const moonPeriods = body.moons.map((m) => Math.abs(m.orbitalPeriod))
      const fastestPeriod = Math.min(...moonPeriods)
      if (fastestPeriod < SCALE.MOON_PERIOD_MIN) {
        moonPeriodScale = SCALE.MOON_PERIOD_MIN / fastestPeriod
      }
    }

    // Create moons (limited by MOON_DISPLAY_LIMIT)
    const moons: MoonData[] = []
    if (body.moons) {
      const moonsToShow = body.moons.slice(0, SCALE.MOON_DISPLAY_LIMIT)
      for (const moonBody of moonsToShow) {
        const moonData = this.createMoon(moonBody, moonOrbitScale)
        moons.push(moonData)
      }
    }

    // Create label
    this.createLabel(body.name, planetMeshData.mesh.position.clone())

    this.planets.push({
      body,
      mesh: planetMeshData.mesh,
      meshData: planetMeshData,
      orbitLine,
      axisLine,
      moons,
      ringData,
      moonOrbitScale,
      moonPeriodScale,
    })
  }

  private createMoon(
    body: CelestialBody,
    orbitScale: (semiMajorAxis: number) => number
  ): MoonData {
    const radius = Math.max(body.radius * SCALE.MOON_SCALE, 0.8)
    const mesh = createMoonMesh(body, radius)
    mesh.rotation.order = 'YXZ'
    this.scene.add(mesh)

    // Create orbit line using the planet-specific orbit scale
    const orbitLine = this.createMoonOrbitLine(body, orbitScale)
    this.scene.add(orbitLine)

    return { body, mesh, orbitLine }
  }

  private createMoonOrbitLine(
    body: CelestialBody,
    orbitScale: (semiMajorAxis: number) => number
  ): THREE.Line {
    const points: THREE.Vector3[] = []
    const segments = 128

    // Get the scaled orbital radius
    const scaledRadius = orbitScale(body.semiMajorAxis)

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      // Simple circular orbit approximation for moons (most are nearly circular)
      const x = scaledRadius * Math.cos(angle)
      const z = scaledRadius * Math.sin(angle)
      points.push(new THREE.Vector3(x, 0, z))
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)

    // Make moon orbits more visible
    const orbitColor = new THREE.Color(body.color)
    orbitColor.lerp(new THREE.Color(0xffffff), 0.4) // brighten toward white

    const material = new THREE.LineBasicMaterial({
      color: orbitColor,
      transparent: true,
      opacity: 0.5,
    })

    return new THREE.Line(geometry, material)
  }

  private createOrbitLine(body: CelestialBody, distanceScale: number, isMoon = false): THREE.Line {
    const points: THREE.Vector3[] = []
    const segments = 256

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.abs(body.orbitalPeriod)
      const pos = getOrbitalPosition(body, t, distanceScale)
      points.push(new THREE.Vector3(pos.x, pos.z, pos.y))
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)

    // Planet orbits are bright and prominent, moon orbits are subtle
    const orbitColor = new THREE.Color(body.color)
    if (isMoon) {
      orbitColor.multiplyScalar(0.3)
    } else {
      orbitColor.lerp(new THREE.Color(0xffffff), 0.3)
    }

    const material = new THREE.LineBasicMaterial({
      color: orbitColor,
      transparent: true,
      opacity: isMoon ? 0.3 : 0.9,
    })

    return new THREE.Line(geometry, material)
  }

  private createAxisLine(body: CelestialBody, radius: number): THREE.Line {
    const axisLength = radius * 3

    const points = [
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0),
    ]

    const geometry = new THREE.BufferGeometry().setFromPoints(points)

    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
    })

    const line = new THREE.Line(geometry, material)

    // Apply axial tilt rotation
    const tiltRad = (body.axialTilt * Math.PI) / 180
    line.rotation.z = tiltRad

    line.visible = this.showAxes

    return line
  }

  private createLabel(name: string, position: THREE.Vector3): void {
    const label = document.createElement('div')
    label.className = 'planet-label'
    label.textContent = name
    label.style.cssText = `
      position: absolute;
      color: white;
      font-size: 11px;
      font-family: monospace;
      pointer-events: none;
      text-shadow: 0 0 3px black, 0 0 5px black;
      white-space: nowrap;
    `
    this.container.appendChild(label)
    this.labels.set(name, label)
  }

  private updateLabels(): void {
    // Update Sun label
    const sunLabel = this.labels.get('Sun')
    if (sunLabel && this.sunData) {
      const pos = this.sunData.core.position.clone()
      pos.y += this.sunRadius + 2
      this.updateLabelPosition(sunLabel, pos)
    }

    // Update planet labels
    for (const planet of this.planets) {
      const label = this.labels.get(planet.body.name)
      if (label) {
        const pos = planet.mesh.position.clone()
        const radius = Math.max(planet.body.radius * SCALE.PLANET_SCALE, 0.5)
        pos.y += radius + 1
        this.updateLabelPosition(label, pos)
      }
    }
  }

  private updateLabelPosition(label: HTMLDivElement, worldPos: THREE.Vector3): void {
    const vector = worldPos.clone()
    vector.project(this.camera)

    const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth
    const y = (vector.y * -0.5 + 0.5) * this.container.clientHeight

    if (vector.z < 1 && this.showLabels) {
      label.style.display = 'block'
      label.style.left = `${x}px`
      label.style.top = `${y}px`
      label.style.transform = 'translate(-50%, -100%)'
    } else {
      label.style.display = 'none'
    }
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  private lastTime = 0
  private animate = (currentTime = 0): void => {
    requestAnimationFrame(this.animate)

    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime

    // FPS tracking
    this.frameCount++
    this.fpsTime += deltaTime
    if (this.fpsTime >= 1) {
      this.fps = this.frameCount / this.fpsTime
      this.frameCount = 0
      this.fpsTime = 0
    }

    this.time += deltaTime * this.speedFactor

    this.updatePositions(deltaTime)

    this.updateCameraFollow()

    this.updateLabels()

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private updatePositions(deltaTime: number): void {
    // Update Sun corona animation
    if (this.sunData) {
      updateSunCorona(this.sunData, this.sunRadius, deltaTime * 10, SCALE.SUN_CORONA_EXTENT)
      this.sunData.core.rotation.y = getRotationAngle(SUN, this.time)
    }

    // Update planets
    for (const planet of this.planets) {
      // Update planet position
      const pos = getOrbitalPosition(planet.body, this.time, SCALE.AU_TO_UNITS)
      planet.mesh.position.set(pos.x, pos.z, pos.y)

      // Update planet rotation
      const rotAngle = getRotationAngle(planet.body, this.time)
      planet.mesh.rotation.y = rotAngle

      // Update axis line position
      if (planet.axisLine) {
        planet.axisLine.position.copy(planet.mesh.position)
      }

      // Update rings
      if (planet.ringData) {
        updateRingParticles(
          planet.ringData,
          this.time,
          deltaTime,
          this.speedFactor,
          planet.body.ringWiggleAmplitude ?? 0.02,
          planet.body.ringWiggleSpeed ?? 1.0
        )
        const posAttr = planet.ringData.mesh.geometry.attributes.position
        if (posAttr) posAttr.needsUpdate = true

        // Position and tilt rings with planet
        const tiltRad = (planet.body.axialTilt * Math.PI) / 180
        planet.ringData.mesh.position.copy(planet.mesh.position)
        planet.ringData.mesh.rotation.set(0, 0, tiltRad)
      }

      // Update moons
      const tiltRad = (planet.body.axialTilt * Math.PI) / 180
      const cosTilt = Math.cos(tiltRad)
      const sinTilt = Math.sin(tiltRad)

      for (const moon of planet.moons) {
        const scaledRadius = planet.moonOrbitScale(moon.body.semiMajorAxis)
        const period = this.trueSpeed
          ? Math.abs(moon.body.orbitalPeriod)
          : Math.abs(moon.body.orbitalPeriod) * planet.moonPeriodScale
        const angle = ((2 * Math.PI * this.time) / period) % (2 * Math.PI)

        const localX = scaledRadius * Math.cos(angle)
        const localY = 0
        const localZ = scaledRadius * Math.sin(angle)

        const tiltedX = localX * cosTilt - localY * sinTilt
        const tiltedY = localX * sinTilt + localY * cosTilt
        const tiltedZ = localZ

        moon.mesh.position.set(
          planet.mesh.position.x + tiltedX,
          planet.mesh.position.y + tiltedY,
          planet.mesh.position.z + tiltedZ
        )
        moon.mesh.rotation.y = getRotationAngle(moon.body, this.time)

        if (moon.orbitLine) {
          moon.orbitLine.position.copy(planet.mesh.position)
          moon.orbitLine.rotation.set(0, 0, tiltRad)
        }
      }
    }
  }

  private updateCameraFollow(): void {
    if (!this.followTarget) return

    let targetPos: THREE.Vector3 | null = null

    if (this.followTarget === 'Sun' && this.sunData) {
      targetPos = this.sunData.core.position.clone()
    } else {
      const planet = this.planets.find((p) => p.body.name === this.followTarget)
      if (planet) {
        targetPos = planet.mesh.position.clone()
      }
    }

    if (targetPos) {
      const delta = targetPos.clone().sub(this.controls.target)
      this.controls.target.add(delta)
      this.camera.position.add(delta)
    }
  }

  setSpeedFactor(factor: number): void {
    this.speedFactor = factor
  }

  getSpeedFactor(): number {
    return this.speedFactor
  }

  setShowOrbits(show: boolean): void {
    this.showOrbits = show
    for (const planet of this.planets) {
      if (planet.orbitLine) {
        planet.orbitLine.visible = show
      }
      for (const moon of planet.moons) {
        if (moon.orbitLine) {
          moon.orbitLine.visible = show
        }
      }
    }
  }

  setShowLabels(show: boolean): void {
    this.showLabels = show
    for (const label of this.labels.values()) {
      label.style.display = show ? 'block' : 'none'
    }
  }

  setShowAxes(show: boolean): void {
    this.showAxes = show
    if (this.sunAxisLine) {
      this.sunAxisLine.visible = show
    }
    for (const planet of this.planets) {
      if (planet.axisLine) {
        planet.axisLine.visible = show
      }
    }
  }

  setTrueSpeed(trueSpeed: boolean): void {
    this.trueSpeed = trueSpeed
  }

  getTime(): number {
    return this.time
  }

  setTime(time: number): void {
    this.time = time
  }

  getFps(): number {
    return this.fps
  }

  setFollowTarget(name: string | null): void {
    this.followTarget = name

    if (name) {
      this.focusOnPlanet(name)
    }
  }

  getFollowTarget(): string | null {
    return this.followTarget
  }

  focusOnPlanet(name: string): void {
    if (name === 'Sun' && this.sunData) {
      this.controls.target.copy(this.sunData.core.position)
      const distance = this.sunRadius * 3
      this.camera.position.set(distance, distance * 0.5, distance)
    } else {
      const planet = this.planets.find((p) => p.body.name === name)
      if (planet) {
        this.controls.target.copy(planet.mesh.position)
        const radius = planet.body.radius * SCALE.PLANET_SCALE
        const distance = Math.max(radius * 8, 5)
        this.camera.position.copy(planet.mesh.position)
        this.camera.position.x += distance
        this.camera.position.y += distance * 0.5
        this.camera.position.z += distance
      }
    }
    this.controls.update()
  }

  dispose(): void {
    this.renderer.dispose()
    this.controls.dispose()

    for (const label of this.labels.values()) {
      label.remove()
    }
    this.labels.clear()

    this.scene.traverse((object) => {
      if (object instanceof THREE.Points || object instanceof THREE.Mesh) {
        object.geometry.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }
}
