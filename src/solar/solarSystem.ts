// Solar system data loaded from YAML with Zod validation
import YAML from 'yaml'
import {
  SolarSystemDataSchema,
  parseHexColor,
  type SolarSystemData,
  type PlanetData,
  type MoonData,
} from './schema'
import solarSystemYaml from './solarSystemData.yaml?raw'

// Parse and validate YAML data
const rawData = YAML.parse(solarSystemYaml)
const validatedData: SolarSystemData = SolarSystemDataSchema.parse(rawData)

// Re-export the CelestialBody interface for backwards compatibility
export interface CelestialBody {
  name: string
  radius: number // km
  color: number // hex color
  emissive?: number // for the sun

  // Orbital parameters (relative to parent)
  semiMajorAxis: number // AU for planets, km for moons
  eccentricity: number
  orbitalPeriod: number // Earth days
  orbitalInclination: number // degrees to ecliptic
  longitudeOfAscendingNode: number // degrees
  argumentOfPeriapsis: number // degrees

  // Rotation
  axialTilt: number // degrees
  rotationPeriod: number // hours (negative = retrograde)

  // Rings
  hasRings?: boolean
  ringInnerRadius?: number // relative to planet radius
  ringOuterRadius?: number // relative to planet radius
  ringColor?: number
  ringRotationPeriod?: number // hours for ring rotation
  ringWiggleAmplitude?: number // vertical wiggle amplitude
  ringWiggleSpeed?: number // wiggle speed multiplier

  // Moons
  moons?: CelestialBody[]
}

// Scale factors for visualization - loaded from YAML
export const SCALE = validatedData.scale

// Convert moon YAML data to CelestialBody
function convertMoon(moon: MoonData): CelestialBody {
  return {
    name: moon.name,
    radius: moon.radius,
    color: parseHexColor(moon.color),
    semiMajorAxis: moon.semiMajorAxis,
    eccentricity: moon.eccentricity,
    orbitalPeriod: moon.orbitalPeriod,
    orbitalInclination: moon.orbitalInclination,
    longitudeOfAscendingNode: moon.longitudeOfAscendingNode,
    argumentOfPeriapsis: moon.argumentOfPeriapsis,
    axialTilt: moon.axialTilt,
    rotationPeriod: moon.rotationPeriod,
  }
}

// Convert planet YAML data to CelestialBody
function convertPlanet(planet: PlanetData): CelestialBody {
  const body: CelestialBody = {
    name: planet.name,
    radius: planet.radius,
    color: parseHexColor(planet.color),
    semiMajorAxis: planet.semiMajorAxis,
    eccentricity: planet.eccentricity,
    orbitalPeriod: planet.orbitalPeriod,
    orbitalInclination: planet.orbitalInclination,
    longitudeOfAscendingNode: planet.longitudeOfAscendingNode,
    argumentOfPeriapsis: planet.argumentOfPeriapsis,
    axialTilt: planet.axialTilt,
    rotationPeriod: planet.rotationPeriod,
  }

  // Add rings if present
  if (planet.ring) {
    body.hasRings = true
    body.ringInnerRadius = planet.ring.innerRadius
    body.ringOuterRadius = planet.ring.outerRadius
    body.ringColor = parseHexColor(planet.ring.color)
    body.ringRotationPeriod = planet.ring.rotationPeriod ?? body.rotationPeriod
    body.ringWiggleAmplitude = planet.ring.wiggleAmplitude ?? 0.02
    body.ringWiggleSpeed = planet.ring.wiggleSpeed ?? 1.0
  }

  // Add moons if present
  if (planet.moons && planet.moons.length > 0) {
    body.moons = planet.moons.map(convertMoon)
  }

  return body
}

// Sun data
export const SUN: CelestialBody = {
  name: validatedData.sun.name,
  radius: validatedData.sun.radius,
  color: parseHexColor(validatedData.sun.color),
  emissive: validatedData.sun.emissive
    ? parseHexColor(validatedData.sun.emissive)
    : undefined,
  semiMajorAxis: 0,
  eccentricity: 0,
  orbitalPeriod: 0,
  orbitalInclination: 0,
  longitudeOfAscendingNode: 0,
  argumentOfPeriapsis: 0,
  axialTilt: validatedData.sun.axialTilt,
  rotationPeriod: validatedData.sun.rotationPeriod,
}

// Planets data
export const PLANETS: CelestialBody[] = validatedData.planets.map(convertPlanet)

// Calculate orbital position at a given time
export function getOrbitalPosition(
  body: CelestialBody,
  time: number, // in days
  distanceScale: number
): { x: number; y: number; z: number } {
  const a = body.semiMajorAxis * distanceScale
  const e = body.eccentricity
  const period = Math.abs(body.orbitalPeriod)
  const inclination = (body.orbitalInclination * Math.PI) / 180
  const omega = (body.longitudeOfAscendingNode * Math.PI) / 180
  const w = (body.argumentOfPeriapsis * Math.PI) / 180

  // Mean anomaly
  const M = ((2 * Math.PI * time) / period) % (2 * Math.PI)

  // Solve Kepler's equation for eccentric anomaly (Newton-Raphson)
  let E = M
  for (let i = 0; i < 10; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  }

  // True anomaly
  const v =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    )

  // Distance from focus
  const r = a * (1 - e * Math.cos(E))

  // Position in orbital plane
  const xOrbit = r * Math.cos(v)
  const yOrbit = r * Math.sin(v)

  // Rotate by argument of periapsis
  const x1 = xOrbit * Math.cos(w) - yOrbit * Math.sin(w)
  const y1 = xOrbit * Math.sin(w) + yOrbit * Math.cos(w)

  // Rotate by inclination
  const x2 = x1
  const y2 = y1 * Math.cos(inclination)
  const z2 = y1 * Math.sin(inclination)

  // Rotate by longitude of ascending node
  const x = x2 * Math.cos(omega) - y2 * Math.sin(omega)
  const y = x2 * Math.sin(omega) + y2 * Math.cos(omega)
  const z = z2

  return { x, y, z }
}

// Get rotation angle at time
export function getRotationAngle(body: CelestialBody, time: number): number {
  const periodHours = Math.abs(body.rotationPeriod)
  const timeHours = time * 24 // convert days to hours
  const direction = body.rotationPeriod < 0 ? -1 : 1
  return direction * ((2 * Math.PI * timeHours) / periodHours)
}
