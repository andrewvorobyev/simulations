// Solar system data with accurate orbital and physical parameters

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

  // Moons
  moons?: CelestialBody[]
}

// Scale factors for visualization
export const SCALE = {
  // Distance scale: 1 AU = 100 units
  AU_TO_UNITS: 100,
  // Size scale for planets (exaggerated for visibility)
  PLANET_SCALE: 0.0005, // km to units
  // Size scale for the sun (smaller to fit scene)
  SUN_SCALE: 0.00002,
  // Moon distance scale (km to units) - same as PLANET_SCALE so rings and moon orbits align
  MOON_DISTANCE_SCALE: 0.0005,
  // Moon size scale
  MOON_SCALE: 0.001,
}

export const SUN: CelestialBody = {
  name: 'Sun',
  radius: 696340,
  color: 0xffff00,
  emissive: 0xffaa00,
  semiMajorAxis: 0,
  eccentricity: 0,
  orbitalPeriod: 0,
  orbitalInclination: 0,
  longitudeOfAscendingNode: 0,
  argumentOfPeriapsis: 0,
  axialTilt: 7.25,
  rotationPeriod: 609.12, // ~25.4 days at equator
}

export const PLANETS: CelestialBody[] = [
  {
    name: 'Mercury',
    radius: 2439.7,
    color: 0x8c8c8c,
    semiMajorAxis: 0.387,
    eccentricity: 0.2056,
    orbitalPeriod: 87.97,
    orbitalInclination: 7.0,
    longitudeOfAscendingNode: 48.33,
    argumentOfPeriapsis: 29.12,
    axialTilt: 0.034,
    rotationPeriod: 1407.6, // 58.65 days
  },
  {
    name: 'Venus',
    radius: 6051.8,
    color: 0xe6c87a,
    semiMajorAxis: 0.723,
    eccentricity: 0.0068,
    orbitalPeriod: 224.7,
    orbitalInclination: 3.39,
    longitudeOfAscendingNode: 76.68,
    argumentOfPeriapsis: 54.88,
    axialTilt: 177.4, // retrograde
    rotationPeriod: -5832.5, // 243 days retrograde
  },
  {
    name: 'Earth',
    radius: 6371,
    color: 0x6b93d6,
    semiMajorAxis: 1.0,
    eccentricity: 0.0167,
    orbitalPeriod: 365.25,
    orbitalInclination: 0.0,
    longitudeOfAscendingNode: 348.74,
    argumentOfPeriapsis: 114.21,
    axialTilt: 23.44,
    rotationPeriod: 23.93,
    moons: [
      {
        name: 'Moon',
        radius: 1737.4,
        color: 0xaaaaaa,
        semiMajorAxis: 384400,
        eccentricity: 0.0549,
        orbitalPeriod: 27.32,
        orbitalInclination: 5.145,
        longitudeOfAscendingNode: 125.08,
        argumentOfPeriapsis: 318.15,
        axialTilt: 6.68,
        rotationPeriod: 655.7, // tidally locked
      },
    ],
  },
  {
    name: 'Mars',
    radius: 3389.5,
    color: 0xc1440e,
    semiMajorAxis: 1.524,
    eccentricity: 0.0934,
    orbitalPeriod: 687.0,
    orbitalInclination: 1.85,
    longitudeOfAscendingNode: 49.56,
    argumentOfPeriapsis: 286.5,
    axialTilt: 25.19,
    rotationPeriod: 24.62,
    moons: [
      {
        name: 'Phobos',
        radius: 11.27,
        color: 0x8a8a8a,
        semiMajorAxis: 9376,
        eccentricity: 0.0151,
        orbitalPeriod: 0.319,
        orbitalInclination: 1.093,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 7.66,
      },
      {
        name: 'Deimos',
        radius: 6.2,
        color: 0x9a9a9a,
        semiMajorAxis: 23463,
        eccentricity: 0.0002,
        orbitalPeriod: 1.263,
        orbitalInclination: 0.93,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 30.3,
      },
    ],
  },
  {
    name: 'Jupiter',
    radius: 69911,
    color: 0xd8ca9d,
    semiMajorAxis: 5.203,
    eccentricity: 0.0489,
    orbitalPeriod: 4332.59,
    orbitalInclination: 1.304,
    longitudeOfAscendingNode: 100.46,
    argumentOfPeriapsis: 273.87,
    axialTilt: 3.13,
    rotationPeriod: 9.93,
    hasRings: true,
    ringInnerRadius: 1.4,
    ringOuterRadius: 1.8,
    ringColor: 0x8b7355,
    moons: [
      {
        name: 'Io',
        radius: 1821.6,
        color: 0xffff66,
        semiMajorAxis: 421800,
        eccentricity: 0.0041,
        orbitalPeriod: 1.769,
        orbitalInclination: 0.036,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 42.46,
      },
      {
        name: 'Europa',
        radius: 1560.8,
        color: 0xb8a894,
        semiMajorAxis: 671100,
        eccentricity: 0.009,
        orbitalPeriod: 3.551,
        orbitalInclination: 0.466,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0.1,
        rotationPeriod: 85.22,
      },
      {
        name: 'Ganymede',
        radius: 2634.1,
        color: 0x8b8378,
        semiMajorAxis: 1070400,
        eccentricity: 0.0013,
        orbitalPeriod: 7.155,
        orbitalInclination: 0.177,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0.33,
        rotationPeriod: 171.7,
      },
      {
        name: 'Callisto',
        radius: 2410.3,
        color: 0x6b6b6b,
        semiMajorAxis: 1882700,
        eccentricity: 0.0074,
        orbitalPeriod: 16.689,
        orbitalInclination: 0.192,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 400.5,
      },
      {
        name: 'Amalthea',
        radius: 83.5,
        color: 0xcc4444,
        semiMajorAxis: 181400,
        eccentricity: 0.003,
        orbitalPeriod: 0.498,
        orbitalInclination: 0.374,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 11.95,
      },
    ],
  },
  {
    name: 'Saturn',
    radius: 58232,
    color: 0xead6a6,
    semiMajorAxis: 9.537,
    eccentricity: 0.0565,
    orbitalPeriod: 10759.22,
    orbitalInclination: 2.485,
    longitudeOfAscendingNode: 113.67,
    argumentOfPeriapsis: 339.39,
    axialTilt: 26.73,
    rotationPeriod: 10.66,
    hasRings: true,
    ringInnerRadius: 1.2,
    ringOuterRadius: 2.3,
    ringColor: 0xc9b896,
    moons: [
      {
        name: 'Titan',
        radius: 2574.7,
        color: 0xdaa520,
        semiMajorAxis: 1221870,
        eccentricity: 0.0288,
        orbitalPeriod: 15.945,
        orbitalInclination: 0.348,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 382.7,
      },
      {
        name: 'Rhea',
        radius: 763.8,
        color: 0xbbbbbb,
        semiMajorAxis: 527068,
        eccentricity: 0.001,
        orbitalPeriod: 4.518,
        orbitalInclination: 0.345,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 108.4,
      },
      {
        name: 'Iapetus',
        radius: 734.5,
        color: 0x8b7355,
        semiMajorAxis: 3560854,
        eccentricity: 0.0286,
        orbitalPeriod: 79.322,
        orbitalInclination: 15.47,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 1903.9,
      },
      {
        name: 'Dione',
        radius: 561.4,
        color: 0xcccccc,
        semiMajorAxis: 377415,
        eccentricity: 0.0022,
        orbitalPeriod: 2.737,
        orbitalInclination: 0.028,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 65.7,
      },
      {
        name: 'Tethys',
        radius: 531.1,
        color: 0xdddddd,
        semiMajorAxis: 294672,
        eccentricity: 0.0001,
        orbitalPeriod: 1.888,
        orbitalInclination: 1.091,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 45.3,
      },
    ],
  },
  {
    name: 'Uranus',
    radius: 25362,
    color: 0xadd8e6,
    semiMajorAxis: 19.19,
    eccentricity: 0.0457,
    orbitalPeriod: 30688.5,
    orbitalInclination: 0.772,
    longitudeOfAscendingNode: 74.0,
    argumentOfPeriapsis: 96.73,
    axialTilt: 97.77, // extreme tilt
    rotationPeriod: -17.24, // retrograde
    hasRings: true,
    ringInnerRadius: 1.6,
    ringOuterRadius: 2.0,
    ringColor: 0x4a5568,
    moons: [
      {
        name: 'Titania',
        radius: 788.9,
        color: 0x999999,
        semiMajorAxis: 436300,
        eccentricity: 0.0011,
        orbitalPeriod: 8.706,
        orbitalInclination: 0.079,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 208.9,
      },
      {
        name: 'Oberon',
        radius: 761.4,
        color: 0x888888,
        semiMajorAxis: 583500,
        eccentricity: 0.0014,
        orbitalPeriod: 13.463,
        orbitalInclination: 0.058,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 323.1,
      },
      {
        name: 'Umbriel',
        radius: 584.7,
        color: 0x666666,
        semiMajorAxis: 266000,
        eccentricity: 0.0039,
        orbitalPeriod: 4.144,
        orbitalInclination: 0.128,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 99.5,
      },
      {
        name: 'Ariel',
        radius: 578.9,
        color: 0xbbbbbb,
        semiMajorAxis: 190900,
        eccentricity: 0.0012,
        orbitalPeriod: 2.52,
        orbitalInclination: 0.041,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 60.5,
      },
      {
        name: 'Miranda',
        radius: 235.8,
        color: 0xaaaaaa,
        semiMajorAxis: 129900,
        eccentricity: 0.0013,
        orbitalPeriod: 1.413,
        orbitalInclination: 4.338,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 33.9,
      },
    ],
  },
  {
    name: 'Neptune',
    radius: 24622,
    color: 0x4169e1,
    semiMajorAxis: 30.07,
    eccentricity: 0.0113,
    orbitalPeriod: 60182.0,
    orbitalInclination: 1.77,
    longitudeOfAscendingNode: 131.78,
    argumentOfPeriapsis: 273.19,
    axialTilt: 28.32,
    rotationPeriod: 16.11,
    hasRings: true,
    ringInnerRadius: 1.7,
    ringOuterRadius: 2.5,
    ringColor: 0x2f4f4f,
    moons: [
      {
        name: 'Triton',
        radius: 1353.4,
        color: 0xb8a894,
        semiMajorAxis: 354759,
        eccentricity: 0.00002,
        orbitalPeriod: -5.877, // retrograde
        orbitalInclination: 156.885, // retrograde orbit
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 141.0,
      },
      {
        name: 'Proteus',
        radius: 210,
        color: 0x777777,
        semiMajorAxis: 117646,
        eccentricity: 0.0005,
        orbitalPeriod: 1.122,
        orbitalInclination: 0.524,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 26.9,
      },
      {
        name: 'Nereid',
        radius: 170,
        color: 0x666666,
        semiMajorAxis: 5513818,
        eccentricity: 0.7512,
        orbitalPeriod: 360.13,
        orbitalInclination: 7.23,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 11.52,
      },
      {
        name: 'Larissa',
        radius: 97,
        color: 0x888888,
        semiMajorAxis: 73548,
        eccentricity: 0.0014,
        orbitalPeriod: 0.555,
        orbitalInclination: 0.20,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 13.32,
      },
      {
        name: 'Galatea',
        radius: 88,
        color: 0x999999,
        semiMajorAxis: 61953,
        eccentricity: 0.0001,
        orbitalPeriod: 0.429,
        orbitalInclination: 0.05,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        axialTilt: 0,
        rotationPeriod: 10.3,
      },
    ],
  },
]

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
  const v = 2 * Math.atan2(
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
