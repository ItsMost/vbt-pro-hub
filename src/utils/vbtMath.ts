// Velocity-Based Training (VBT) Math & Profile Engine

export interface LoadVelocityPoint {
  loadKg: number;
  velocityMs: number; // Mean Propulsive Velocity (m/s)
}

export interface VBTZone {
  name: string;
  nameAr: string;
  minVelocity: number;
  maxVelocity: number;
  intensityPercent: string;
  color: string;
  accentClass: string;
  description: string;
}

export const EXERCISE_MVT_DEFAULTS: Record<string, number> = {
  'Back Squat': 0.30,
  'Bench Press': 0.15,
  'Trap Bar Deadlift': 0.20,
  'Conventional Deadlift': 0.15,
  'Power Clean': 0.75,
  'Barbell Hip Thrust': 0.25,
  'Push Press': 0.40,
};

export const VBT_ZONES: VBTZone[] = [
  {
    name: 'Starting Strength / Speed',
    nameAr: 'السرعة القصوى وبداية القوة',
    minVelocity: 1.30,
    maxVelocity: 2.00,
    intensityPercent: '< 40% 1RM',
    color: '#38bdf8',
    accentClass: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    description: 'Maximal movement velocity, neural rate of force development (RFD).'
  },
  {
    name: 'Speed-Strength',
    nameAr: 'سرعة القوة (Speed-Strength)',
    minVelocity: 1.00,
    maxVelocity: 1.30,
    intensityPercent: '40% - 60% 1RM',
    color: '#22d3ee',
    accentClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    description: 'Moving light-to-moderate loads with maximum possible acceleration.'
  },
  {
    name: 'Strength-Speed (Peak Power)',
    nameAr: 'قوة السرعة (القدرة الانفجارية)',
    minVelocity: 0.75,
    maxVelocity: 1.00,
    intensityPercent: '60% - 75% 1RM',
    color: '#a3e635',
    accentClass: 'text-lime-400 border-lime-500/30 bg-lime-500/10',
    description: 'Optimal zone for peak power output, sprinting propulsion, and athletic transfer.'
  },
  {
    name: 'Accelerative Strength',
    nameAr: 'القوة المتسارعة (Accelerative Strength)',
    minVelocity: 0.50,
    maxVelocity: 0.75,
    intensityPercent: '75% - 85% 1RM',
    color: '#fbbf24',
    accentClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    description: 'Heavy loads moved with high intent to drive neuromuscular motor unit recruitment.'
  },
  {
    name: 'Absolute / Maximum Strength',
    nameAr: 'القوة القصوى (Absolute Strength)',
    minVelocity: 0.15,
    maxVelocity: 0.50,
    intensityPercent: '85% - 100% 1RM',
    color: '#f87171',
    accentClass: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    description: 'Maximal force production near 1RM threshold.'
  }
];

/**
 * Calculate linear regression line (y = mx + c)
 * Where y = velocity (m/s) and x = load (kg)
 */
export function calculateLinearRegression(points: LoadVelocityPoint[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const validPoints = points.filter(p => p.loadKg > 0 && p.velocityMs > 0);
  const n = validPoints.length;

  if (n < 2) {
    return { slope: -0.008, intercept: 1.5, r2: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const pt of validPoints) {
    sumX += pt.loadKg;
    sumY += pt.velocityMs;
    sumXY += pt.loadKg * pt.velocityMs;
    sumX2 += pt.loadKg * pt.loadKg;
    sumY2 += pt.velocityMs * pt.velocityMs;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: 0, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared (Coefficient of Determination)
  const meanY = sumY / n;
  let ssTotal = 0;
  let ssRes = 0;
  for (const pt of validPoints) {
    const yPred = slope * pt.loadKg + intercept;
    ssTotal += Math.pow(pt.velocityMs - meanY, 2);
    ssRes += Math.pow(pt.velocityMs - yPred, 2);
  }
  const r2 = ssTotal > 0 ? Math.max(0, 1 - (ssRes / ssTotal)) : 0;

  return { slope, intercept, r2 };
}

/**
 * Predict estimated 1RM based on load-velocity regression and Minimal Velocity Threshold (MVT)
 */
export function estimate1RM(points: LoadVelocityPoint[], mvt: number = 0.30): {
  estimated1RM: number;
  slope: number;
  intercept: number;
  r2: number;
} {
  const { slope, intercept, r2 } = calculateLinearRegression(points);

  if (slope >= 0) {
    return { estimated1RM: 0, slope, intercept, r2 };
  }

  // MVT = slope * (1RM) + intercept  =>  1RM = (MVT - intercept) / slope
  const raw1RM = (mvt - intercept) / slope;
  const estimated1RM = Math.round(Math.max(0, raw1RM) * 2) / 2; // Round to nearest 0.5kg

  return {
    estimated1RM,
    slope,
    intercept,
    r2: Math.round(r2 * 1000) / 1000
  };
}

/**
 * Get target velocity zone based on current rep velocity
 */
export function getZoneByVelocity(velocity: number): VBTZone {
  for (const zone of VBT_ZONES) {
    if (velocity >= zone.minVelocity && velocity <= zone.maxVelocity) {
      return zone;
    }
  }
  if (velocity > 2.00) return VBT_ZONES[0];
  return VBT_ZONES[VBT_ZONES.length - 1];
}

/**
 * Calculate velocity loss % between first (or fastest) rep and current rep
 */
export function calculateVelocityLoss(fastestRepVelocity: number, currentRepVelocity: number): number {
  if (fastestRepVelocity <= 0) return 0;
  const loss = ((fastestRepVelocity - currentRepVelocity) / fastestRepVelocity) * 100;
  return Math.max(0, Math.round(loss * 10) / 10);
}
