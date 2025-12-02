import { z } from 'zod'

// Hex color can be string like "#ffffff" or "0xffffff" or number
const HexColor = z.union([
  z.string().regex(/^(#|0x)?[0-9a-fA-F]{6}$/),
  z.number(),
])

// Ring configuration for planets with rings
const RingSchema = z.object({
  innerRadius: z.number(), // relative to planet radius
  outerRadius: z.number(), // relative to planet radius
  color: HexColor,
  rotationPeriod: z.number().optional(), // hours for full rotation (derived from planet if not set)
  wiggleAmplitude: z.number().default(0.02), // vertical wiggle amplitude relative to planet radius
  wiggleSpeed: z.number().default(1.0), // wiggle speed multiplier
})

// Base orbital parameters shared by all bodies
const OrbitalParameters = z.object({
  semiMajorAxis: z.number(), // AU for planets, km for moons
  eccentricity: z.number(),
  orbitalPeriod: z.number(), // Earth days (negative = retrograde)
  orbitalInclination: z.number(), // degrees
  longitudeOfAscendingNode: z.number(), // degrees
  argumentOfPeriapsis: z.number(), // degrees
})

// Physical properties
const PhysicalProperties = z.object({
  radius: z.number(), // km
  color: HexColor,
  axialTilt: z.number(), // degrees
  rotationPeriod: z.number(), // hours (negative = retrograde)
})

// Moon schema (no nested moons)
export const MoonSchema = z.object({
  name: z.string(),
}).merge(PhysicalProperties).merge(OrbitalParameters)

// Planet schema with optional moons and rings
export const PlanetSchema = z.object({
  name: z.string(),
  ring: RingSchema.optional(),
  moons: z.array(MoonSchema).optional(),
}).merge(PhysicalProperties).merge(OrbitalParameters)

// Sun schema (special case - no orbital parameters needed)
export const SunSchema = z.object({
  name: z.string().default('Sun'),
  radius: z.number(), // km
  color: HexColor,
  emissive: HexColor.optional(),
  axialTilt: z.number(), // degrees
  rotationPeriod: z.number(), // hours
})

// Visualization scaling parameters
export const ScaleSchema = z.object({
  AU_TO_UNITS: z.number(), // 1 AU = this many display units
  PLANET_SCALE: z.number(), // km to units for planet radii
  SUN_SCALE: z.number(), // km to units for sun radius
  SUN_CORONA_EXTENT: z.number().default(1.8), // corona max extent as multiple of sun radius
  MOON_SCALE: z.number(), // km to units for moon radii
  MOON_ORBIT_MIN: z.number().default(1.5), // closest moon orbit as multiple of planet radius
  MOON_ORBIT_MAX: z.number().default(5.0), // farthest moon orbit as multiple of planet radius
  MOON_DISPLAY_LIMIT: z.number().default(10), // max moons to display per planet
  MOON_PERIOD_MIN: z.number().default(3.0), // minimum display period for fastest moon (days)
  // Particle counts for rendering
  SUN_CORONA_PARTICLES: z.number().default(25000),
  RING_PARTICLES: z.number().default(20000),
})

// Complete solar system data schema
export const SolarSystemDataSchema = z.object({
  scale: ScaleSchema,
  sun: SunSchema,
  planets: z.array(PlanetSchema),
})

// TypeScript types derived from Zod schemas
export type MoonData = z.infer<typeof MoonSchema>
export type PlanetData = z.infer<typeof PlanetSchema>
export type SunData = z.infer<typeof SunSchema>
export type ScaleData = z.infer<typeof ScaleSchema>
export type SolarSystemData = z.infer<typeof SolarSystemDataSchema>

// Helper to convert hex color string/number to number
export function parseHexColor(color: string | number): number {
  if (typeof color === 'number') return color
  const cleaned = color.replace(/^(#|0x)/, '')
  return parseInt(cleaned, 16)
}
