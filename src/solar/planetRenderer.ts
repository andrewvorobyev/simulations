import * as THREE from 'three'
import type { CelestialBody } from './solarSystem'

// Particle counts for different object types
const PLANET_PARTICLE_COUNT = 8000
const SUN_PARTICLE_COUNT = 20000
const SUN_CORONA_COUNT = 8000

interface PlanetParticleData {
  mesh: THREE.Points
  positions: Float32Array
  basePositions: Float32Array // Original positions for animation
  colors: Float32Array
}

interface SunParticleData {
  core: THREE.Points
  corona: THREE.Points
  corePositions: Float32Array
  coronaPositions: Float32Array
  coronaVelocities: Float32Array
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
  // Earth uses special continent mapping, this is fallback
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
const EARTH_OCEAN = new THREE.Color(0x1a5f8a)
const EARTH_OCEAN_DEEP = new THREE.Color(0x0d3d5c)
const EARTH_LAND = new THREE.Color(0x2d5a27)
const EARTH_LAND_LIGHT = new THREE.Color(0x4a7c40)
const EARTH_DESERT = new THREE.Color(0xc9b896)
const EARTH_ICE = new THREE.Color(0xf0f5f5)
const EARTH_FOREST = new THREE.Color(0x1a4d1a)

// Simplified continent map - returns true if point is likely land
// lat: -1 to 1 (south to north), lon: 0 to 2PI
function isEarthLand(lat: number, lon: number): boolean {
  // Normalize longitude to 0-1
  const lonNorm = lon / (Math.PI * 2)

  // Polar ice caps
  if (Math.abs(lat) > 0.85) return Math.random() > 0.3

  // Antarctica
  if (lat < -0.75) return Math.random() > 0.4

  // North America (lon ~0.65-0.85)
  if (lat > 0.15 && lat < 0.75 && lonNorm > 0.6 && lonNorm < 0.9) {
    if (lat > 0.55) return Math.random() > 0.3 // Canada
    return Math.random() > 0.35 // USA/Mexico
  }

  // South America (lon ~0.7-0.85)
  if (lat > -0.6 && lat < 0.15 && lonNorm > 0.65 && lonNorm < 0.85) {
    return Math.random() > 0.4
  }

  // Europe (lon ~0.0-0.15)
  if (lat > 0.35 && lat < 0.7 && lonNorm < 0.15) {
    return Math.random() > 0.45
  }

  // Africa (lon ~0.0-0.2)
  if (lat > -0.4 && lat < 0.4 && lonNorm < 0.25 && lonNorm > 0.85) {
    return Math.random() > 0.35
  }
  if (lat > -0.4 && lat < 0.4 && lonNorm < 0.2) {
    return Math.random() > 0.35
  }

  // Asia (lon ~0.1-0.45)
  if (lat > 0.1 && lat < 0.75 && lonNorm > 0.1 && lonNorm < 0.5) {
    if (lat > 0.5) return Math.random() > 0.3 // Siberia
    return Math.random() > 0.4
  }

  // Australia (lon ~0.35-0.45)
  if (lat > -0.45 && lat < -0.1 && lonNorm > 0.35 && lonNorm < 0.5) {
    return Math.random() > 0.45
  }

  // Ocean
  return false
}

// Get Earth color based on lat/lon
function getEarthColor(lat: number, lon: number): THREE.Color {
  const noise = (Math.random() - 0.5) * 0.1

  // Ice caps
  if (Math.abs(lat) > 0.82) {
    const ice = EARTH_ICE.clone()
    ice.r = Math.max(0, Math.min(1, ice.r + noise))
    ice.g = Math.max(0, Math.min(1, ice.g + noise))
    ice.b = Math.max(0, Math.min(1, ice.b + noise))
    return ice
  }

  // Land or water
  if (isEarthLand(lat, lon)) {
    // Land color varies by latitude
    let landColor: THREE.Color
    if (Math.abs(lat) > 0.6) {
      // Tundra/taiga
      landColor = EARTH_FOREST.clone()
    } else if (Math.abs(lat) < 0.25) {
      // Tropical - mix of forest and desert
      if (Math.random() > 0.6) {
        landColor = EARTH_DESERT.clone()
      } else {
        landColor = EARTH_FOREST.clone()
      }
    } else {
      // Temperate
      landColor = Math.random() > 0.5 ? EARTH_LAND.clone() : EARTH_LAND_LIGHT.clone()
    }
    landColor.r = Math.max(0, Math.min(1, landColor.r + noise))
    landColor.g = Math.max(0, Math.min(1, landColor.g + noise))
    landColor.b = Math.max(0, Math.min(1, landColor.b + noise))
    return landColor
  }

  // Ocean - deeper in center
  const oceanColor = Math.random() > 0.3 ? EARTH_OCEAN.clone() : EARTH_OCEAN_DEEP.clone()
  oceanColor.r = Math.max(0, Math.min(1, oceanColor.r + noise))
  oceanColor.g = Math.max(0, Math.min(1, oceanColor.g + noise))
  oceanColor.b = Math.max(0, Math.min(1, oceanColor.b + noise))
  return oceanColor
}

// Get color from palette based on latitude (for banding effect)
function getColorFromPalette(
  name: string,
  latitude: number,
  longitude: number,
  defaultColor: number
): THREE.Color {
  // Special handling for Earth
  if (name === 'Earth') {
    return getEarthColor(latitude, longitude)
  }

  const palette = PLANET_PALETTES[name]
  if (!palette) {
    return new THREE.Color(defaultColor)
  }

  // Use latitude to create bands
  const bandIndex = Math.abs(latitude) * palette.bands.length
  const band1 = Math.floor(bandIndex) % palette.bands.length
  const band2 = (band1 + 1) % palette.bands.length
  const t = bandIndex - Math.floor(bandIndex)

  const color1 = new THREE.Color(palette.bands[band1])
  const color2 = new THREE.Color(palette.bands[band2])

  // Add some noise for natural look
  const noise = (Math.random() - 0.5) * 0.15
  color1.lerp(color2, t)
  color1.r = Math.max(0, Math.min(1, color1.r + noise))
  color1.g = Math.max(0, Math.min(1, color1.g + noise))
  color1.b = Math.max(0, Math.min(1, color1.b + noise))

  return color1
}

// Create particle-based planet
export function createParticlePlanet(
  body: CelestialBody,
  radius: number
): PlanetParticleData {
  const particleCount = PLANET_PARTICLE_COUNT
  const positions = new Float32Array(particleCount * 3)
  const basePositions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  // Distribute particles on sphere surface using fibonacci spiral
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  const angleIncrement = Math.PI * 2 * goldenRatio

  for (let i = 0; i < particleCount; i++) {
    // Fibonacci sphere distribution
    const t = i / particleCount
    const inclination = Math.acos(1 - 2 * t)
    const azimuth = angleIncrement * i

    // Slight radius variation for texture
    const r = radius * (0.95 + Math.random() * 0.1)

    const x = r * Math.sin(inclination) * Math.cos(azimuth)
    const y = r * Math.cos(inclination)
    const z = r * Math.sin(inclination) * Math.sin(azimuth)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    basePositions[i * 3] = x
    basePositions[i * 3 + 1] = y
    basePositions[i * 3 + 2] = z

    // Color based on latitude and longitude
    const latitude = y / r
    const longitude = azimuth % (Math.PI * 2)
    const color = getColorFromPalette(body.name, latitude, longitude, body.color)

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  // Particle size based on planet radius
  const particleSize = Math.max(0.1, radius * 0.08)

  const material = new THREE.PointsMaterial({
    size: particleSize,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  })

  const mesh = new THREE.Points(geometry, material)

  return { mesh, positions, basePositions, colors }
}

// Create particle-based sun with corona
export function createParticleSun(radius: number): SunParticleData {
  // Core particles
  const corePositions = new Float32Array(SUN_PARTICLE_COUNT * 3)
  const coreColors = new Float32Array(SUN_PARTICLE_COUNT * 3)

  for (let i = 0; i < SUN_PARTICLE_COUNT; i++) {
    // Sphere distribution
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = radius * (0.8 + Math.random() * 0.2)

    corePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    corePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    corePositions[i * 3 + 2] = r * Math.cos(phi)

    // Sun colors - yellow to orange to white
    const colorT = Math.random()
    const color = new THREE.Color()
    if (colorT < 0.3) {
      color.setHex(0xffffff) // White hot
    } else if (colorT < 0.6) {
      color.setHex(0xffff66) // Yellow
    } else if (colorT < 0.85) {
      color.setHex(0xffaa33) // Orange
    } else {
      color.setHex(0xff6600) // Deep orange
    }

    coreColors[i * 3] = color.r
    coreColors[i * 3 + 1] = color.g
    coreColors[i * 3 + 2] = color.b
  }

  const coreGeometry = new THREE.BufferGeometry()
  coreGeometry.setAttribute('position', new THREE.BufferAttribute(corePositions, 3))
  coreGeometry.setAttribute('color', new THREE.BufferAttribute(coreColors, 3))

  const coreMaterial = new THREE.PointsMaterial({
    size: radius * 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  })

  const core = new THREE.Points(coreGeometry, coreMaterial)

  // Corona particles - extend outward
  const coronaPositions = new Float32Array(SUN_CORONA_COUNT * 3)
  const coronaColors = new Float32Array(SUN_CORONA_COUNT * 3)
  const coronaVelocities = new Float32Array(SUN_CORONA_COUNT * 3)

  for (let i = 0; i < SUN_CORONA_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    // Corona extends from surface to 2x radius
    const r = radius * (1.0 + Math.random() * 1.5)

    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)

    coronaPositions[i * 3] = x
    coronaPositions[i * 3 + 1] = y
    coronaPositions[i * 3 + 2] = z

    // Velocity pointing outward
    const speed = 0.5 + Math.random() * 1.0
    coronaVelocities[i * 3] = (x / r) * speed
    coronaVelocities[i * 3 + 1] = (y / r) * speed
    coronaVelocities[i * 3 + 2] = (z / r) * speed

    // Corona is more orange/red, fades with distance
    const distanceFactor = (r - radius) / (radius * 1.5)
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
    size: radius * 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
  })

  const corona = new THREE.Points(coronaGeometry, coronaMaterial)

  return { core, corona, corePositions, coronaPositions, coronaVelocities }
}

// Update sun corona animation
export function updateSunCorona(
  sunData: SunParticleData,
  radius: number,
  deltaTime: number
): void {
  const posAttr = sunData.corona.geometry.attributes.position
  if (!posAttr) return
  const positions = posAttr.array as Float32Array
  const velocities = sunData.coronaVelocities

  for (let i = 0; i < SUN_CORONA_COUNT; i++) {
    const idx = i * 3
    // Move particle outward
    let x = positions[idx]! + velocities[idx]! * deltaTime
    let y = positions[idx + 1]! + velocities[idx + 1]! * deltaTime
    let z = positions[idx + 2]! + velocities[idx + 2]! * deltaTime
    positions[idx] = x
    positions[idx + 1] = y
    positions[idx + 2] = z

    // Calculate distance from center
    const dist = Math.sqrt(x * x + y * y + z * z)

    // Reset particle if too far
    if (dist > radius * 2.5) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (1.0 + Math.random() * 0.2)

      x = r * Math.sin(phi) * Math.cos(theta)
      y = r * Math.sin(phi) * Math.sin(theta)
      z = r * Math.cos(phi)
      positions[idx] = x
      positions[idx + 1] = y
      positions[idx + 2] = z

      // New velocity
      const speed = 0.5 + Math.random() * 1.0
      velocities[idx] = (x / r) * speed
      velocities[idx + 1] = (y / r) * speed
      velocities[idx + 2] = (z / r) * speed
    }
  }

  posAttr.needsUpdate = true
}

// Ring particle data structure
export interface RingParticleData {
  mesh: THREE.Points
  positions: Float32Array
  velocities: Float32Array
  baseY: Float32Array // base Y positions for wiggle
  phases: Float32Array // random phase offsets for wiggle
  planetRadius: number
}

// Create ring particles (enhanced version)
export function createRingParticles(
  planetRadius: number,
  innerRadius: number,
  outerRadius: number,
  ringColor: number,
  particleCount: number
): RingParticleData {
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const velocities = new Float32Array(particleCount)
  const baseY = new Float32Array(particleCount)
  const phases = new Float32Array(particleCount)

  const ringWidth = outerRadius - innerRadius

  for (let i = 0; i < particleCount; i++) {
    // Ring band distribution
    let r: number
    const band = Math.random()
    if (band < 0.3) {
      r = innerRadius + Math.random() * ringWidth * 0.25
    } else if (band < 0.35) {
      r = innerRadius + ringWidth * 0.25 + Math.random() * ringWidth * 0.05
    } else if (band < 0.7) {
      r = innerRadius + ringWidth * 0.3 + Math.random() * ringWidth * 0.35
    } else if (band < 0.75) {
      r = innerRadius + ringWidth * 0.65 + Math.random() * ringWidth * 0.05
    } else if (band < 0.92) {
      r = innerRadius + ringWidth * 0.7 + Math.random() * ringWidth * 0.2
    } else {
      r = innerRadius + ringWidth * 0.92 + Math.random() * ringWidth * 0.08
    }

    const angle = Math.random() * Math.PI * 2
    const y = (Math.random() - 0.5) * planetRadius * 0.02

    positions[i * 3] = Math.cos(angle) * r
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(angle) * r

    // Store base Y for wiggle
    baseY[i] = y
    phases[i] = Math.random() * Math.PI * 2

    // Angular velocity (Kepler)
    velocities[i] = 0.1 / Math.sqrt(r / innerRadius)

    // Color variation
    const baseColor = new THREE.Color(ringColor)
    const normalizedR = (r - innerRadius) / ringWidth

    let brightness: number
    if (normalizedR < 0.25) {
      brightness = 0.6 + Math.random() * 0.2
      baseColor.lerp(new THREE.Color(0x8b7355), 0.3)
    } else if (normalizedR < 0.65) {
      brightness = 0.9 + Math.random() * 0.1
      baseColor.lerp(new THREE.Color(0xffd700), 0.15)
    } else if (normalizedR < 0.9) {
      brightness = 0.75 + Math.random() * 0.2
    } else {
      brightness = 0.7 + Math.random() * 0.2
      baseColor.lerp(new THREE.Color(0xaabbcc), 0.2)
    }

    baseColor.multiplyScalar(brightness)
    colors[i * 3] = baseColor.r
    colors[i * 3 + 1] = baseColor.g
    colors[i * 3 + 2] = baseColor.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: planetRadius * 0.015,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  })

  const mesh = new THREE.Points(geometry, material)

  return { mesh, positions, velocities, baseY, phases, planetRadius }
}

// Update ring particle rotation with wiggle
export function updateRingParticles(
  ringData: RingParticleData,
  time: number,
  deltaTime: number,
  speedFactor: number,
  wiggleAmplitude: number,
  wiggleSpeed: number
): void {
  const { positions, velocities, baseY, phases, planetRadius } = ringData
  const particleCount = velocities.length

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3
    const x = positions[idx]!
    const z = positions[idx + 2]!

    const angle = Math.atan2(z, x)
    const r = Math.sqrt(x * x + z * z)

    const newAngle = angle + velocities[i]! * deltaTime * speedFactor * 0.01

    positions[idx] = Math.cos(newAngle) * r
    positions[idx + 2] = Math.sin(newAngle) * r

    // Wiggle in Y direction
    const wiggle =
      Math.sin(time * wiggleSpeed * 2 + phases[i]!) *
      wiggleAmplitude *
      planetRadius
    positions[idx + 1] = baseY[i]! + wiggle
  }
}

// Create moon as particle sphere (smaller)
export function createParticleMoon(
  body: CelestialBody,
  radius: number
): THREE.Points {
  const particleCount = 2000
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  const goldenRatio = (1 + Math.sqrt(5)) / 2
  const angleIncrement = Math.PI * 2 * goldenRatio

  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount
    const inclination = Math.acos(1 - 2 * t)
    const azimuth = angleIncrement * i

    const r = radius * (0.9 + Math.random() * 0.2)

    positions[i * 3] = r * Math.sin(inclination) * Math.cos(azimuth)
    positions[i * 3 + 1] = r * Math.cos(inclination)
    positions[i * 3 + 2] = r * Math.sin(inclination) * Math.sin(azimuth)

    const color = new THREE.Color(body.color)
    const noise = (Math.random() - 0.5) * 0.2
    color.r = Math.max(0, Math.min(1, color.r + noise))
    color.g = Math.max(0, Math.min(1, color.g + noise))
    color.b = Math.max(0, Math.min(1, color.b + noise))

    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: Math.max(0.15, radius * 0.15),
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
  })

  return new THREE.Points(geometry, material)
}
