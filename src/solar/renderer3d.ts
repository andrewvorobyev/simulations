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

interface RingParticle {
  baseAngle: number
  radius: number
  yOffset: number
  size: number
  rotationSpeed: number
}

interface PlanetMesh {
  body: CelestialBody
  mesh: THREE.Mesh
  orbitLine?: THREE.Line
  axisLine?: THREE.Line
  moons: MoonMesh[]
  rings?: THREE.InstancedMesh
  ringParticles?: RingParticle[]
}

interface MoonMesh {
  body: CelestialBody
  mesh: THREE.Mesh
  orbitLine?: THREE.Line
}

const RING_CUBES_COUNT = 5000

export class SolarRenderer {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls

  private sunMesh: THREE.Mesh | null = null
  private sunLight: THREE.PointLight | null = null
  private planets: PlanetMesh[] = []

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

  constructor(container: HTMLElement) {
    this.container = container

    // Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000011)

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
    this.controls.zoomSpeed = 3.0 // Much faster zoom
    this.controls.rotateSpeed = 1.0
    this.controls.panSpeed = 2.0

    // Ambient light (very dim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05)
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
    const vertices: number[] = []

    for (let i = 0; i < 10000; i++) {
      const r = 3000 + Math.random() * 2000
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      vertices.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      sizeAttenuation: false,
    })

    const stars = new THREE.Points(geometry, material)
    this.scene.add(stars)
  }

  private createSolarSystem(): void {
    // Create Sun
    const sunRadius = SUN.radius * SCALE.SUN_SCALE
    const sunGeometry = new THREE.SphereGeometry(sunRadius, 32, 32)
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: SUN.color,
    })
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
    this.scene.add(this.sunMesh)

    // Sun light
    this.sunLight = new THREE.PointLight(0xffffff, 2, 0, 0.1)
    this.sunLight.position.set(0, 0, 0)
    this.scene.add(this.sunLight)

    // Sun axis line
    this.sunAxisLine = this.createAxisLine(SUN, sunRadius)
    this.scene.add(this.sunAxisLine)

    // Create label for Sun
    this.createLabel('Sun', new THREE.Vector3(0, sunRadius + 2, 0))

    // Create planets
    for (const planetData of PLANETS) {
      this.createPlanet(planetData)
    }
  }

  private createPlanet(body: CelestialBody): void {
    const radius = body.radius * SCALE.PLANET_SCALE
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.5), 32, 32)
    const material = new THREE.MeshPhongMaterial({
      color: body.color,
      shininess: 10,
    })

    const mesh = new THREE.Mesh(geometry, material)

    // Apply axial tilt
    mesh.rotation.z = (body.axialTilt * Math.PI) / 180

    this.scene.add(mesh)

    // Create orbit line
    const orbitLine = this.createOrbitLine(body, SCALE.AU_TO_UNITS)
    this.scene.add(orbitLine)

    // Create axis line
    const axisLine = this.createAxisLine(body, Math.max(radius, 0.5))
    this.scene.add(axisLine)

    // Create rings if planet has them
    let rings: THREE.InstancedMesh | undefined
    let ringParticles: RingParticle[] | undefined
    if (body.hasRings) {
      const result = this.createRings(body, radius)
      rings = result.mesh
      ringParticles = result.particles
      this.scene.add(rings)
    }

    // Create moons
    const moons: MoonMesh[] = []
    if (body.moons) {
      for (const moonData of body.moons) {
        const moonMesh = this.createMoon(moonData, mesh)
        moons.push(moonMesh)
      }
    }

    // Create label
    this.createLabel(body.name, mesh.position.clone())

    this.planets.push({
      body,
      mesh,
      orbitLine,
      axisLine,
      moons,
      rings,
      ringParticles,
    })
  }

  private createMoon(body: CelestialBody, parent: THREE.Mesh): MoonMesh {
    const radius = body.radius * SCALE.MOON_SCALE
    const geometry = new THREE.SphereGeometry(Math.max(radius, 0.8), 16, 16)
    const material = new THREE.MeshPhongMaterial({
      color: body.color,
      shininess: 5,
    })

    const mesh = new THREE.Mesh(geometry, material)
    this.scene.add(mesh)

    // Create orbit line relative to parent
    const orbitLine = this.createOrbitLine(body, SCALE.MOON_DISTANCE_SCALE, true)
    this.scene.add(orbitLine)

    return { body, mesh, orbitLine }
  }

  private createOrbitLine(body: CelestialBody, distanceScale: number, isMoon = false): THREE.Line {
    const points: THREE.Vector3[] = []
    const segments = 256 // More segments for smoother curves

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
      // Brighten planet orbits
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
    // Create a line representing the rotation axis
    // The line extends above and below the planet
    const axisLength = radius * 3

    const points = [
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0),
    ]

    const geometry = new THREE.BufferGeometry().setFromPoints(points)

    // Use a bright color for visibility
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
    })

    const line = new THREE.Line(geometry, material)

    // Apply axial tilt rotation
    const tiltRad = (body.axialTilt * Math.PI) / 180
    line.rotation.z = tiltRad

    // Initially hidden
    line.visible = this.showAxes

    return line
  }

  private createRings(
    body: CelestialBody,
    planetRadius: number
  ): { mesh: THREE.InstancedMesh; particles: RingParticle[] } {
    const innerRadius = planetRadius * (body.ringInnerRadius || 1.5)
    const outerRadius = planetRadius * (body.ringOuterRadius || 2.5)

    // Much smaller cubes for realistic rings
    const baseCubeSize = 0.02 * planetRadius

    const geometry = new THREE.BoxGeometry(baseCubeSize, baseCubeSize * 0.3, baseCubeSize)
    // Use MeshBasicMaterial for self-lit appearance (no shadows, always visible)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff, // Will be set per instance
      transparent: true,
      opacity: 0.95,
    })

    const mesh = new THREE.InstancedMesh(geometry, material, RING_CUBES_COUNT)

    const particles: RingParticle[] = []
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    // Ring density distribution - denser toward certain radii (like Saturn's gaps)
    const ringWidth = outerRadius - innerRadius

    // Number of radial stripes/spokes
    const numStripes = 24
    const stripeWidth = (Math.PI * 2) / numStripes

    for (let i = 0; i < RING_CUBES_COUNT; i++) {
      // Create ring structure with varying density
      // Use multiple passes for different ring bands
      let r: number
      const band = Math.random()
      if (band < 0.3) {
        // Inner dense ring (C ring - darker)
        r = innerRadius + Math.random() * ringWidth * 0.25
      } else if (band < 0.35) {
        // Cassini Division gap (very few particles)
        r = innerRadius + ringWidth * 0.25 + Math.random() * ringWidth * 0.05
      } else if (band < 0.7) {
        // B ring - brightest, densest
        r = innerRadius + ringWidth * 0.3 + Math.random() * ringWidth * 0.35
      } else if (band < 0.75) {
        // A ring gap
        r = innerRadius + ringWidth * 0.65 + Math.random() * ringWidth * 0.05
      } else if (band < 0.92) {
        // A ring
        r = innerRadius + ringWidth * 0.7 + Math.random() * ringWidth * 0.2
      } else {
        // F ring - outer thin ring
        r = innerRadius + ringWidth * 0.92 + Math.random() * ringWidth * 0.08
      }

      // Create stripe pattern - particles cluster near certain angles
      // This creates radial density waves / spoke patterns
      let baseAngle = Math.random() * Math.PI * 2

      // 30% chance to be in a stripe (denser region)
      if (Math.random() < 0.3) {
        const stripeIndex = Math.floor(Math.random() * numStripes)
        const stripeCenter = stripeIndex * stripeWidth
        // Cluster around stripe center with gaussian-like distribution
        baseAngle = stripeCenter + (Math.random() - 0.5) * stripeWidth * 0.6
      }

      // Very small vertical offset for thin ring plane
      const yOffset = (Math.random() - 0.5) * baseCubeSize * 0.4

      // Varying sizes for visual interest
      const sizeVar = 0.6 + Math.random() * 0.8

      // Rotation speed varies with radius (Kepler's 3rd law approximation)
      // Inner particles orbit faster
      const rotationSpeed = 0.1 / Math.sqrt(r / innerRadius)

      particles.push({
        baseAngle,
        radius: r,
        yOffset,
        size: sizeVar,
        rotationSpeed,
      })

      // Initial position
      position.set(Math.cos(baseAngle) * r, yOffset, Math.sin(baseAngle) * r)
      quaternion.setFromEuler(
        new THREE.Euler(Math.random() * 0.1, Math.random() * Math.PI * 2, Math.random() * 0.1)
      )
      scale.set(sizeVar, sizeVar, sizeVar)

      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(i, matrix)

      // Color variation based on ring region
      const baseColor = new THREE.Color(body.ringColor || 0xd4a574)
      const normalizedR = (r - innerRadius) / ringWidth

      // Different colors for different ring regions
      let brightness: number
      if (normalizedR < 0.25) {
        // C ring - darker, more brownish
        brightness = 0.6 + Math.random() * 0.2
        baseColor.lerp(new THREE.Color(0x8b7355), 0.3)
      } else if (normalizedR < 0.65) {
        // B ring - brightest, more golden
        brightness = 0.9 + Math.random() * 0.1
        baseColor.lerp(new THREE.Color(0xffd700), 0.15)
      } else if (normalizedR < 0.9) {
        // A ring - medium brightness
        brightness = 0.75 + Math.random() * 0.2
      } else {
        // F ring - slightly bluish tint
        brightness = 0.7 + Math.random() * 0.2
        baseColor.lerp(new THREE.Color(0xaabbcc), 0.2)
      }

      baseColor.multiplyScalar(brightness)
      mesh.setColorAt(i, baseColor)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true
    }

    return { mesh, particles }
  }

  private updateRings(planet: PlanetMesh, deltaTime: number): void {
    if (!planet.rings || !planet.ringParticles) return

    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    // Get planet tilt for ring orientation
    const tiltRad = (planet.body.axialTilt * Math.PI) / 180

    for (let i = 0; i < planet.ringParticles.length; i++) {
      const particle = planet.ringParticles[i]!

      // Update angle based on rotation speed and simulation speed
      particle.baseAngle += particle.rotationSpeed * deltaTime * this.speedFactor * 0.01

      // Calculate position in ring plane
      const x = Math.cos(particle.baseAngle) * particle.radius
      const z = Math.sin(particle.baseAngle) * particle.radius
      const y = particle.yOffset

      position.set(x, y, z)

      quaternion.setFromEuler(new THREE.Euler(0, particle.baseAngle, 0))
      scale.set(particle.size, particle.size, particle.size)

      matrix.compose(position, quaternion, scale)
      planet.rings.setMatrixAt(i, matrix)
    }

    planet.rings.instanceMatrix.needsUpdate = true

    // Position and orient rings with planet
    // Rings are in the equatorial plane, perpendicular to the rotation axis
    // The planet's axial tilt is applied around Z, so rings should also rotate around Z
    planet.rings.position.copy(planet.mesh.position)
    planet.rings.rotation.set(0, 0, tiltRad)
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
    if (sunLabel && this.sunMesh) {
      const pos = this.sunMesh.position.clone()
      const sunRadius = SUN.radius * SCALE.SUN_SCALE
      pos.y += sunRadius + 2
      this.updateLabelPosition(sunLabel, pos)
    }

    // Update planet labels
    for (const planet of this.planets) {
      const label = this.labels.get(planet.body.name)
      if (label) {
        const pos = planet.mesh.position.clone()
        const radius = planet.body.radius * SCALE.PLANET_SCALE
        pos.y += Math.max(radius, 0.5) + 1
        this.updateLabelPosition(label, pos)
      }
    }
  }

  private updateLabelPosition(label: HTMLDivElement, worldPos: THREE.Vector3): void {
    const vector = worldPos.clone()
    vector.project(this.camera)

    const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth
    const y = (vector.y * -0.5 + 0.5) * this.container.clientHeight

    // Check if in front of camera
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

    // Calculate delta time
    const deltaTime = (currentTime - this.lastTime) / 1000 // seconds
    this.lastTime = currentTime

    // Update simulation time
    this.time += deltaTime * this.speedFactor

    // Update positions
    this.updatePositions(deltaTime)

    // Follow target if set
    this.updateCameraFollow()

    this.updateLabels()

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private updatePositions(deltaTime: number): void {
    // Rotate Sun
    if (this.sunMesh) {
      this.sunMesh.rotation.y = getRotationAngle(SUN, this.time)
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

      // Update rings with rotation
      if (planet.rings && planet.ringParticles) {
        this.updateRings(planet, deltaTime)
      }

      // Update moons - they orbit in the planet's equatorial plane
      const tiltRad = (planet.body.axialTilt * Math.PI) / 180
      const cosTilt = Math.cos(tiltRad)
      const sinTilt = Math.sin(tiltRad)

      for (const moon of planet.moons) {
        // When not in true speed mode, limit moon orbital speed
        // by using a minimum effective orbital period of 10 days
        let moonTime = this.time
        if (!this.trueSpeed) {
          const minPeriod = 10 // minimum orbital period in days for visualization
          const actualPeriod = Math.abs(moon.body.orbitalPeriod)
          if (actualPeriod < minPeriod) {
            // Scale time so moon appears to have longer orbital period
            moonTime = this.time * (actualPeriod / minPeriod)
          }
        }

        const moonPos = getOrbitalPosition(moon.body, moonTime, SCALE.MOON_DISTANCE_SCALE)

        // Moon position in planet's reference frame (before tilt)
        const localX = moonPos.x
        const localY = moonPos.z // height above orbital plane
        const localZ = moonPos.y

        // Rotate around Z axis by planet's axial tilt
        const tiltedX = localX * cosTilt - localY * sinTilt
        const tiltedY = localX * sinTilt + localY * cosTilt
        const tiltedZ = localZ

        moon.mesh.position.set(
          planet.mesh.position.x + tiltedX,
          planet.mesh.position.y + tiltedY,
          planet.mesh.position.z + tiltedZ
        )
        moon.mesh.rotation.y = getRotationAngle(moon.body, moonTime)

        // Update moon orbit line position and tilt
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

    if (this.followTarget === 'Sun' && this.sunMesh) {
      targetPos = this.sunMesh.position.clone()
    } else {
      const planet = this.planets.find((p) => p.body.name === this.followTarget)
      if (planet) {
        targetPos = planet.mesh.position.clone()
      }
    }

    if (targetPos) {
      // Calculate movement delta from last frame
      const delta = targetPos.clone().sub(this.controls.target)

      // Move both target and camera by the same amount
      // This keeps the relative camera position while following the object
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

  setFollowTarget(name: string | null): void {
    this.followTarget = name

    if (name) {
      // Initial jump to target
      this.focusOnPlanet(name)
    }
  }

  getFollowTarget(): string | null {
    return this.followTarget
  }

  focusOnPlanet(name: string): void {
    if (name === 'Sun' && this.sunMesh) {
      this.controls.target.copy(this.sunMesh.position)
      const sunRadius = SUN.radius * SCALE.SUN_SCALE
      const distance = sunRadius * 3
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

    // Remove labels
    for (const label of this.labels.values()) {
      label.remove()
    }
    this.labels.clear()

    // Dispose geometries and materials
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
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
