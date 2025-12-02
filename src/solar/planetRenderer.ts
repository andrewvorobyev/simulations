import * as THREE from 'three'
import { type CelestialBody, SCALE } from './solarSystem'

export const BASE = import.meta.env.BASE_URL

// Planet mesh data structure
export interface PlanetMeshData {
  mesh: THREE.Mesh
  texture: THREE.Texture
  bumpMap: THREE.Texture | null
}

// Sun data structure - textured sphere with particle corona
interface SunParticleData {
  core: THREE.Mesh // Textured sphere
  corona: THREE.Points // Particle corona
  coronaPositions: Float32Array
  coronaVelocities: Float32Array
}

// Ring particle data structure
export interface RingParticleData {
  mesh: THREE.Points
  positions: Float32Array
  velocities: Float32Array
  baseY: Float32Array
  phases: Float32Array
  planetRadius: number
  rotationSpeed: number // base rotation speed from ring period
}

// Color palettes for different planet types
const PLANET_PALETTES: Record<string, { bands: number[]; weights: number[] }> = {
  Mercury: {
    bands: [0x8c8c8c, 0x6b6b6b, 0x9a9a9a, 0x7a7a7a],
    weights: [0.3, 0.3, 0.2, 0.2],
  },
  Venus: {
    bands: [0xe6c87a, 0xd4b56a, 0xf0d890, 0xc9a85a],
    weights: [0.3, 0.3, 0.2, 0.2],
  },
  Earth: {
    bands: [0x6b93d6, 0x4a7bc4, 0x8eb4e6, 0x3d6baa],
    weights: [0.4, 0.3, 0.2, 0.1],
  },
  Mars: {
    bands: [0xc1440e, 0xa83a0c, 0xd4520f, 0x8b3a0a, 0xb5450d],
    weights: [0.25, 0.25, 0.2, 0.15, 0.15],
  },
  Jupiter: {
    bands: [0xd8ca9d, 0xc4a77d, 0xe8dbb0, 0xa67c52, 0xf0e6c8, 0x8b6b4a, 0xc9956c],
    weights: [0.2, 0.15, 0.15, 0.15, 0.1, 0.15, 0.1],
  },
  Saturn: {
    bands: [0xead6a6, 0xd4c090, 0xf5e6c0, 0xc9b080, 0xe0c898, 0xb8a070],
    weights: [0.2, 0.2, 0.15, 0.2, 0.15, 0.1],
  },
  Uranus: {
    bands: [0xadd8e6, 0x87ceeb, 0xb0e0e6, 0x7ec8e3, 0x9fd5d1],
    weights: [0.25, 0.2, 0.2, 0.2, 0.15],
  },
  Neptune: {
    bands: [0x4169e1, 0x3a5fd0, 0x5070e8, 0x2850c0, 0x6080f0],
    weights: [0.25, 0.2, 0.2, 0.2, 0.15],
  },
}

// Earth colors
const EARTH_OCEAN = { r: 0x1a / 255, g: 0x5f / 255, b: 0x8a / 255 }
const EARTH_OCEAN_DEEP = { r: 0x0d / 255, g: 0x3d / 255, b: 0x5c / 255 }
const EARTH_LAND = { r: 0x2d / 255, g: 0x5a / 255, b: 0x27 / 255 }
const EARTH_LAND_LIGHT = { r: 0x4a / 255, g: 0x7c / 255, b: 0x40 / 255 }
const EARTH_DESERT = { r: 0xc9 / 255, g: 0xb8 / 255, b: 0x96 / 255 }
const EARTH_ICE = { r: 0xf0 / 255, g: 0xf5 / 255, b: 0xf5 / 255 }
const EARTH_FOREST = { r: 0x1a / 255, g: 0x4d / 255, b: 0x1a / 255 }

// Seeded random for consistent texture generation
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// Simplified continent map - returns true if point is likely land
function isEarthLand(lat: number, lon: number, rand: () => number): boolean {
  const lonNorm = lon / (Math.PI * 2)

  if (Math.abs(lat) > 0.85) return rand() > 0.3
  if (lat < -0.75) return rand() > 0.4

  // North America
  if (lat > 0.15 && lat < 0.75 && lonNorm > 0.6 && lonNorm < 0.9) {
    if (lat > 0.55) return rand() > 0.3
    return rand() > 0.35
  }

  // South America
  if (lat > -0.6 && lat < 0.15 && lonNorm > 0.65 && lonNorm < 0.85) {
    return rand() > 0.4
  }

  // Europe
  if (lat > 0.35 && lat < 0.7 && lonNorm < 0.15) {
    return rand() > 0.45
  }

  // Africa
  if (lat > -0.4 && lat < 0.4 && lonNorm < 0.25 && lonNorm > 0.85) {
    return rand() > 0.35
  }
  if (lat > -0.4 && lat < 0.4 && lonNorm < 0.2) {
    return rand() > 0.35
  }

  // Asia
  if (lat > 0.1 && lat < 0.75 && lonNorm > 0.1 && lonNorm < 0.5) {
    if (lat > 0.5) return rand() > 0.3
    return rand() > 0.4
  }

  // Australia
  if (lat > -0.45 && lat < -0.1 && lonNorm > 0.35 && lonNorm < 0.5) {
    return rand() > 0.45
  }

  return false
}

// Get Earth color based on lat/lon
function getEarthColor(
  lat: number,
  lon: number,
  rand: () => number
): { r: number; g: number; b: number } {
  const noise = (rand() - 0.5) * 0.1

  // Ice caps
  if (Math.abs(lat) > 0.82) {
    return {
      r: Math.max(0, Math.min(1, EARTH_ICE.r + noise)),
      g: Math.max(0, Math.min(1, EARTH_ICE.g + noise)),
      b: Math.max(0, Math.min(1, EARTH_ICE.b + noise)),
    }
  }

  // Land or water
  if (isEarthLand(lat, lon, rand)) {
    let landColor: { r: number; g: number; b: number }
    if (Math.abs(lat) > 0.6) {
      landColor = { ...EARTH_FOREST }
    } else if (Math.abs(lat) < 0.25) {
      if (rand() > 0.6) {
        landColor = { ...EARTH_DESERT }
      } else {
        landColor = { ...EARTH_FOREST }
      }
    } else {
      landColor = rand() > 0.5 ? { ...EARTH_LAND } : { ...EARTH_LAND_LIGHT }
    }
    return {
      r: Math.max(0, Math.min(1, landColor.r + noise)),
      g: Math.max(0, Math.min(1, landColor.g + noise)),
      b: Math.max(0, Math.min(1, landColor.b + noise)),
    }
  }

  const oceanColor = rand() > 0.3 ? { ...EARTH_OCEAN } : { ...EARTH_OCEAN_DEEP }
  return {
    r: Math.max(0, Math.min(1, oceanColor.r + noise)),
    g: Math.max(0, Math.min(1, oceanColor.g + noise)),
    b: Math.max(0, Math.min(1, oceanColor.b + noise)),
  }
}

// Get color from palette based on latitude
function getColorFromPalette(
  name: string,
  latitude: number,
  longitude: number,
  defaultColor: number,
  rand: () => number
): { r: number; g: number; b: number } {
  if (name === 'Earth') {
    return getEarthColor(latitude, longitude, rand)
  }

  const palette = PLANET_PALETTES[name]
  if (!palette) {
    const c = new THREE.Color(defaultColor)
    return { r: c.r, g: c.g, b: c.b }
  }

  const bandIndex = Math.abs(latitude) * palette.bands.length
  const band1 = Math.floor(bandIndex) % palette.bands.length
  const band2 = (band1 + 1) % palette.bands.length
  const t = bandIndex - Math.floor(bandIndex)

  const color1 = new THREE.Color(palette.bands[band1])
  const color2 = new THREE.Color(palette.bands[band2])
  color1.lerp(color2, t)

  const noise = (rand() - 0.5) * 0.15
  return {
    r: Math.max(0, Math.min(1, color1.r + noise)),
    g: Math.max(0, Math.min(1, color1.g + noise)),
    b: Math.max(0, Math.min(1, color1.b + noise)),
  }
}

// Generate planet texture on canvas
function generatePlanetTexture(
  body: CelestialBody,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  // Use body name as seed for consistent textures
  const seed = body.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rand = seededRandom(seed)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Convert pixel to lat/lon
      const u = x / width
      const v = y / height
      const lon = u * Math.PI * 2
      const lat = 1 - v * 2 // -1 to 1, poles at top/bottom

      const color = getColorFromPalette(body.name, lat, lon, body.color, rand)

      const idx = (y * width + x) * 4
      data[idx] = Math.floor(color.r * 255)
      data[idx + 1] = Math.floor(color.g * 255)
      data[idx + 2] = Math.floor(color.b * 255)
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

// Texture file mapping for planets
const PLANET_TEXTURES: Record<string, string> = {
  Mercury: '/textures/2k_mercury.jpg',
  Venus: '/textures/2k_venus_surface.jpg',
  Earth: '/textures/2k_earth.jpg',
  Mars: '/textures/2k_mars.jpg',
  Jupiter: '/textures/2k_jupiter.jpg',
  Saturn: '/textures/2k_saturn.jpg',
  Uranus: '/textures/2k_uranus.jpg',
  Neptune: '/textures/2k_neptune.jpg',
}

// Shared texture loader
const textureLoader = new THREE.TextureLoader()

// Create textured sphere planet using real textures
export function createPlanetMesh(body: CelestialBody, radius: number): PlanetMeshData {
  const segments = 64
  const geometry = new THREE.SphereGeometry(radius, segments, segments)

  // Load real texture from file
  const textureUrl = PLANET_TEXTURES[body.name]
  let texture: THREE.Texture

  if (textureUrl) {
    texture = textureLoader.load(`${BASE}${textureUrl.slice(1)}`)
    texture.colorSpace = THREE.SRGBColorSpace
  } else {
    // Fallback to procedural texture for unknown planets
    const textureCanvas = generatePlanetTexture(body, 2048, 1024)
    texture = new THREE.CanvasTexture(textureCanvas)
  }

  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping

  // Determine material properties based on planet type
  const isGasGiant = ['Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(body.name)

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: isGasGiant ? 0.7 : 0.9,
    metalness: 0.0,
  })

  const mesh = new THREE.Mesh(geometry, material)

  return { mesh, texture, bumpMap: null }
}

// Cached moon texture (shared across all moons)
let cachedMoonTexture: THREE.Texture | null = null

// Create textured sphere moon using real texture with color tinting
export function createMoonMesh(body: CelestialBody, radius: number): THREE.Mesh {
  const segments = 32
  const geometry = new THREE.SphereGeometry(radius, segments, segments)

  // Load moon texture (cached)
  if (!cachedMoonTexture) {
    cachedMoonTexture = textureLoader.load(`${BASE}textures/2k_moon.jpg`)
    cachedMoonTexture.colorSpace = THREE.SRGBColorSpace
  }

  // Apply subtle color tint based on moon's color to distinguish moons
  const tintColor = new THREE.Color(body.color)
  // Blend toward gray to keep it subtle
  tintColor.lerp(new THREE.Color(0x888888), 0.6)

  const material = new THREE.MeshStandardMaterial({
    map: cachedMoonTexture,
    color: tintColor,
    roughness: 0.95,
    metalness: 0.0,
  })

  return new THREE.Mesh(geometry, material)
}

// Create textured sun sphere with particle corona
export function createParticleSun(radius: number): SunParticleData {
  // Create textured sphere for sun core
  const geometry = new THREE.SphereGeometry(radius, 64, 64)
  const sunTexture = textureLoader.load(`${BASE}textures/2k_sun.jpg`)
  sunTexture.colorSpace = THREE.SRGBColorSpace

  const coreMaterial = new THREE.MeshBasicMaterial({
    map: sunTexture,
    // Emissive glow effect
  })

  const core = new THREE.Mesh(geometry, coreMaterial)
  core.renderOrder = 1 // Render core first

  // Corona particles - smaller extent to not overlap Mercury
  const coronaParticles = SCALE.SUN_CORONA_PARTICLES
  const coronaPositions = new Float32Array(coronaParticles * 3)
  const coronaColors = new Float32Array(coronaParticles * 3)
  const coronaVelocities = new Float32Array(coronaParticles * 3)

  for (let i = 0; i < coronaParticles; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    // Reduced corona extent - stays close to sun surface
    const r = radius * (1.0 + Math.random() * 0.4)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    coronaPositions[i * 3] = x
    coronaPositions[i * 3 + 1] = y
    coronaPositions[i * 3 + 2] = z

    // Slower outward velocity for tighter corona
    const speed = 0.2 + Math.random() * 0.3
    coronaVelocities[i * 3] = (x / r) * speed
    coronaVelocities[i * 3 + 1] = (y / r) * speed
    coronaVelocities[i * 3 + 2] = (z / r) * speed

    const distanceFactor = (r - radius) / (radius * 0.4)
    const color = new THREE.Color()
    color.setHex(0xffaa33)
    color.lerp(new THREE.Color(0xff4400), distanceFactor * 0.5)

    coronaColors[i * 3] = color.r
    coronaColors[i * 3 + 1] = color.g
    coronaColors[i * 3 + 2] = color.b
  }

  const coronaGeometry = new THREE.BufferGeometry()
  coronaGeometry.setAttribute('position', new THREE.BufferAttribute(coronaPositions, 3))
  coronaGeometry.setAttribute('color', new THREE.BufferAttribute(coronaColors, 3))

  const coronaMaterial = new THREE.PointsMaterial({
    size: radius * 0.025,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const corona = new THREE.Points(coronaGeometry, coronaMaterial)
  corona.renderOrder = 2 // Render corona after core

  return { core, corona, coronaPositions, coronaVelocities }
}

// Update sun corona animation
export function updateSunCorona(
  sunData: SunParticleData,
  radius: number,
  deltaTime: number,
  coronaExtent = 1.3 // Smaller default to not overlap Mercury
): void {
  const posAttr = sunData.corona.geometry.attributes.position
  if (!posAttr) return
  const positions = posAttr.array as Float32Array
  const velocities = sunData.coronaVelocities

  const coronaParticles = SCALE.SUN_CORONA_PARTICLES
  for (let i = 0; i < coronaParticles; i++) {
    const idx = i * 3
    let x = positions[idx]! + velocities[idx]! * deltaTime
    let y = positions[idx + 1]! + velocities[idx + 1]! * deltaTime
    let z = positions[idx + 2]! + velocities[idx + 2]! * deltaTime
    positions[idx] = x
    positions[idx + 1] = y
    positions[idx + 2] = z

    const dist = Math.sqrt(x * x + y * y + z * z)

    if (dist > radius * coronaExtent) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (1.0 + Math.random() * 0.1)

      x = r * Math.sin(phi) * Math.cos(theta)
      y = r * Math.sin(phi) * Math.sin(theta)
      z = r * Math.cos(phi)
      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z

      // Slower velocity for tighter corona
      const speed = 0.2 + Math.random() * 0.3
      velocities[idx] = (x / r) * speed
      velocities[idx + 1] = (y / r) * speed
      velocities[idx + 2] = (z / r) * speed
    }
  }

  posAttr.needsUpdate = true
}

// Create ring particles - many tiny particles orbiting the planet
export function createRingParticles(
  planetRadius: number,
  innerRadius: number,
  outerRadius: number,
  ringColor: number,
  rotationPeriod: number, // hours for inner edge to complete one orbit
  planetRotationPeriod: number // planet's rotation period (sign indicates direction)
): RingParticleData {
  // Use enough particles for dense rings but keep performance good
  const particleCount = 50000

  // Convert rotation period (hours) to rotation speed
  // Faster rotation = higher speed, so inversely proportional
  // Ring rotation direction matches planet rotation (negative period = retrograde)
  const rotationDirection = planetRotationPeriod < 0 ? -1 : 1
  const rotationSpeed = (rotationPeriod > 0 ? 24 / rotationPeriod : 1) * rotationDirection

  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const velocities = new Float32Array(particleCount)
  const baseY = new Float32Array(particleCount)
  const phases = new Float32Array(particleCount)

  const ringWidth = outerRadius - innerRadius

  for (let i = 0; i < particleCount; i++) {
    // Ring band distribution - creates Saturn-like ring structure with gaps
    let r: number
    const band = Math.random()
    if (band < 0.15) {
      // Inner C ring - faint
      r = innerRadius + Math.random() * ringWidth * 0.15
    } else if (band < 0.18) {
      // Gap (Colombo gap)
      r = innerRadius + ringWidth * 0.15 + Math.random() * ringWidth * 0.02
    } else if (band < 0.45) {
      // B ring - brightest, densest
      r = innerRadius + ringWidth * 0.17 + Math.random() * ringWidth * 0.28
    } else if (band < 0.48) {
      // Cassini Division - prominent gap
      r = innerRadius + ringWidth * 0.45 + Math.random() * ringWidth * 0.03
    } else if (band < 0.85) {
      // A ring - second brightest
      r = innerRadius + ringWidth * 0.48 + Math.random() * ringWidth * 0.37
    } else if (band < 0.87) {
      // Encke gap
      r = innerRadius + ringWidth * 0.75 + Math.random() * ringWidth * 0.02
    } else {
      // F ring and outer material
      r = innerRadius + ringWidth * 0.87 + Math.random() * ringWidth * 0.13
    }

    const angle = Math.random() * Math.PI * 2
    // Very thin rings
    const y = (Math.random() - 0.5) * planetRadius * 0.005

    positions[i * 3] = Math.cos(angle) * r
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(angle) * r

    baseY[i] = y
    phases[i] = Math.random() * Math.PI * 2

    // Keplerian orbital velocity - inner particles orbit faster
    velocities[i] = 0.15 / Math.pow(r / innerRadius, 1.5)

    // Color variation based on ring region
    const baseColor = new THREE.Color(ringColor)
    const normalizedR = (r - innerRadius) / ringWidth

    let brightness: number
    if (normalizedR < 0.17) {
      // C ring - darker, brownish
      brightness = 0.4 + Math.random() * 0.15
      baseColor.lerp(new THREE.Color(0x8b7355), 0.4)
    } else if (normalizedR < 0.45) {
      // B ring - bright cream/gold
      brightness = 0.85 + Math.random() * 0.15
      baseColor.lerp(new THREE.Color(0xffeedd), 0.2)
    } else if (normalizedR < 0.48) {
      // Cassini division - very dark
      brightness = 0.2 + Math.random() * 0.1
    } else if (normalizedR < 0.85) {
      // A ring - moderately bright
      brightness = 0.7 + Math.random() * 0.2
      baseColor.lerp(new THREE.Color(0xddc8a0), 0.15)
    } else {
      // F ring and outer - faint
      brightness = 0.5 + Math.random() * 0.2
      baseColor.lerp(new THREE.Color(0xaabbcc), 0.3)
    }

    baseColor.multiplyScalar(brightness)
    colors[i * 3] = baseColor.r
    colors[i * 3 + 1] = baseColor.g
    colors[i * 3 + 2] = baseColor.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  // Very small particles for dense appearance
  const material = new THREE.PointsMaterial({
    size: planetRadius * 0.005,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
  })

  const mesh = new THREE.Points(geometry, material)

  return { mesh, positions, velocities, baseY, phases, planetRadius, rotationSpeed }
}

// Update ring particle rotation - Keplerian orbital motion
export function updateRingParticles(
  ringData: RingParticleData,
  _time: number,
  deltaTime: number,
  speedFactor: number
): void {
  const { positions, velocities, rotationSpeed } = ringData
  const particleCount = velocities.length

  // Update each particle's orbital position
  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3
    const x = positions[idx]!
    const z = positions[idx + 2]!

    const angle = Math.atan2(z, x)
    const r = Math.sqrt(x * x + z * z)

    // Apply Keplerian rotation scaled by planet's ring rotation speed
    // velocities[i] contains Keplerian factor, rotationSpeed scales by planet's ring period
    const newAngle = angle + velocities[i]! * deltaTime * speedFactor * rotationSpeed

    positions[idx] = Math.cos(newAngle) * r
    positions[idx + 2] = Math.sin(newAngle) * r
  }
}

// Asteroid belt data structure
export interface AsteroidBeltData {
  mesh: THREE.Points
  positions: Float32Array
  velocities: Float32Array // orbital velocity for each asteroid
  eccentricities: Float32Array
  phases: Float32Array // initial orbital phase
  semiMajorAxes: Float32Array
}

// Create main asteroid belt between Mars and Jupiter
export function createAsteroidBelt(
  auToUnits: number,
  particleCount = 8000
): AsteroidBeltData {
  // Main belt is between 2.1 and 3.3 AU, with Kirkwood gaps
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const velocities = new Float32Array(particleCount)
  const eccentricities = new Float32Array(particleCount)
  const phases = new Float32Array(particleCount)
  const semiMajorAxes = new Float32Array(particleCount)

  // Kirkwood gaps at resonances with Jupiter (in AU)
  const kirkwoodGaps = [
    { center: 2.5, width: 0.05 }, // 3:1 resonance
    { center: 2.82, width: 0.03 }, // 5:2 resonance
    { center: 2.95, width: 0.03 }, // 7:3 resonance
    { center: 3.27, width: 0.04 }, // 2:1 resonance
  ]

  const isInGap = (au: number): boolean => {
    for (const gap of kirkwoodGaps) {
      if (Math.abs(au - gap.center) < gap.width) return true
    }
    return false
  }

  for (let i = 0; i < particleCount; i++) {
    // Generate semi-major axis avoiding Kirkwood gaps
    let au: number
    do {
      // Distribution weighted toward inner belt
      au = 2.1 + Math.pow(Math.random(), 0.7) * 1.2
    } while (isInGap(au))

    const a = au * auToUnits
    semiMajorAxes[i] = a

    // Realistic eccentricity distribution (most are low, some higher)
    const e = Math.random() * Math.random() * 0.3
    eccentricities[i] = e

    // Random orbital phase
    const phase = Math.random() * Math.PI * 2
    phases[i] = phase

    // Initial position using orbital elements
    const r = a * (1 - e * Math.cos(phase))
    const x = r * Math.cos(phase)
    const z = r * Math.sin(phase)

    // Small inclination (most asteroids are near ecliptic)
    const inclination = (Math.random() - 0.5) * 0.3 // ~17 degrees max
    const y = r * Math.sin(phase) * Math.sin(inclination)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    // Keplerian orbital velocity (inversely proportional to sqrt of distance)
    velocities[i] = 1 / Math.sqrt(au)

    // Gray/brown colors for asteroids
    const brightness = 0.3 + Math.random() * 0.4
    const redness = Math.random() * 0.15
    colors[i * 3] = brightness + redness
    colors[i * 3 + 1] = brightness
    colors[i * 3 + 2] = brightness - redness * 0.5
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.4,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  })

  const mesh = new THREE.Points(geometry, material)

  return { mesh, positions, velocities, eccentricities, phases, semiMajorAxes }
}

// Update asteroid belt orbital motion
export function updateAsteroidBelt(
  beltData: AsteroidBeltData,
  time: number, // in days
  _deltaTime: number
): void {
  const { positions, velocities, eccentricities, phases, semiMajorAxes } = beltData
  const particleCount = velocities.length

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3
    const a = semiMajorAxes[i]!
    const e = eccentricities[i]!
    const initialPhase = phases[i]!
    const orbitalSpeed = velocities[i]!

    // Calculate current orbital angle (mean anomaly approximation)
    // Period in days = a^1.5 years * 365.25
    const periodDays = Math.pow(a, 1.5) * 0.01 // simplified scaling
    const angle = initialPhase + (2 * Math.PI * time * orbitalSpeed) / periodDays

    // Eccentric orbit position
    const r = a * (1 - e * Math.cos(angle))
    positions[idx] = r * Math.cos(angle)
    positions[idx + 2] = r * Math.sin(angle)
    // Keep y (inclination) constant
  }
}

// Trojan asteroid data structure
export interface TrojanData {
  mesh: THREE.Points
  positions: Float32Array
  offsets: Float32Array // offset angles from L4/L5 point
  distances: Float32Array // distance from Lagrange point center
  velocities: Float32Array
}

// Create Trojan asteroids at Jupiter's L4 or L5 point
export function createTrojanAsteroids(
  jupiterOrbitRadius: number, // in display units
  lagrangePoint: 'L4' | 'L5',
  particleCount = 2000
): TrojanData {
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const offsets = new Float32Array(particleCount)
  const distances = new Float32Array(particleCount)
  const velocities = new Float32Array(particleCount)

  // L4 is 60° ahead, L5 is 60° behind
  const lagrangeAngle = lagrangePoint === 'L4' ? Math.PI / 3 : -Math.PI / 3

  for (let i = 0; i < particleCount; i++) {
    // Trojans form a cloud around the Lagrange point
    // Spread roughly ±15° around the point
    const angleOffset = (Math.random() - 0.5) * 0.5 // ~±15°
    offsets[i] = angleOffset

    // Distance variation from Jupiter's orbit (libration)
    const distanceVariation = 1 + (Math.random() - 0.5) * 0.15
    const r = jupiterOrbitRadius * distanceVariation
    distances[i] = distanceVariation

    // Initial position (will be updated relative to Jupiter)
    const angle = lagrangeAngle + angleOffset
    positions[i * 3] = r * Math.cos(angle)
    positions[i * 3 + 1] = (Math.random() - 0.5) * jupiterOrbitRadius * 0.05 // small inclination
    positions[i * 3 + 2] = r * Math.sin(angle)

    // Slight velocity variation for libration
    velocities[i] = 0.95 + Math.random() * 0.1

    // Darker, more brownish than main belt
    const brightness = 0.25 + Math.random() * 0.3
    colors[i * 3] = brightness + 0.05
    colors[i * 3 + 1] = brightness
    colors[i * 3 + 2] = brightness - 0.05
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true,
  })

  const mesh = new THREE.Points(geometry, material)

  return { mesh, positions, offsets, distances, velocities }
}

// Update Trojan asteroids to follow Jupiter
export function updateTrojanAsteroids(
  trojanData: TrojanData,
  jupiterAngle: number, // Jupiter's current orbital angle
  jupiterRadius: number, // Jupiter's orbital radius
  lagrangePoint: 'L4' | 'L5'
): void {
  const { positions, offsets, distances } = trojanData
  const particleCount = offsets.length

  // L4 is 60° ahead, L5 is 60° behind
  const lagrangeOffset = lagrangePoint === 'L4' ? Math.PI / 3 : -Math.PI / 3

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3
    const angleOffset = offsets[i]!
    const distanceVar = distances[i]!

    const angle = jupiterAngle + lagrangeOffset + angleOffset
    const r = jupiterRadius * distanceVar

    positions[idx] = r * Math.cos(angle)
    positions[idx + 2] = r * Math.sin(angle)
    // Keep y constant
  }
}
