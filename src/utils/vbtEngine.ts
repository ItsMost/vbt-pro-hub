export interface VBTDataPoint {
  load: number;     // Load in kg
  velocity: number; // Mean Velocity in m/s
}

export interface ExerciseStandardProfile {
  name: string;
  defaultMVT: number;
  normativeV0: number;
  description: string;
}

export const EXERCISE_PROFILES: Record<string, ExerciseStandardProfile> = {
  'Deep Squat': {
    name: 'Deep Squat',
    defaultMVT: 0.30,
    normativeV0: 1.35,
    description: 'Full depth bilateral squat (MVT: 0.30 m/s)'
  },
  'Half Squat': {
    name: 'Half Squat',
    defaultMVT: 0.38,
    normativeV0: 1.45,
    description: 'Parallel / half squat for jump conversion (MVT: 0.38 m/s)'
  },
  'Quarter Squat': {
    name: 'Quarter Squat',
    defaultMVT: 0.50,
    normativeV0: 1.60,
    description: 'High overload joint-angle specific squat (MVT: 0.50 m/s)'
  },
  'Bench Press': {
    name: 'Bench Press',
    defaultMVT: 0.17,
    normativeV0: 1.15,
    description: 'Standard barbell bench press (MVT: 0.17 m/s)'
  },
  'Trap Bar Deadlift': {
    name: 'Trap Bar Deadlift',
    defaultMVT: 0.28,
    normativeV0: 1.30,
    description: 'Neutral grip hex bar deadlift (MVT: 0.28 m/s)'
  },
  'Power Clean': {
    name: 'Power Clean',
    defaultMVT: 0.40,
    normativeV0: 1.55,
    description: 'Explosive triple extension floor catch (MVT: 0.40 m/s)'
  },
};

export const MVT_DEFAULTS: Record<string, number> = Object.fromEntries(
  Object.entries(EXERCISE_PROFILES).map(([key, val]) => [key, val.defaultMVT])
);

export interface LinearRegressionResult {
  slope: number;       // Slope (m)
  intercept: number;   // Y-intercept (V0)
  rSquared: number;    // Coefficient of determination (R^2)
}

export interface Theoretical1RMResult {
  estimated1RMKg: number;
  estimated1RMLbs: number;
  slope: number;
  intercept: number;
  rSquared: number;
  fitQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  fitColor: string;
}

export interface TrainingPercentageRow {
  percentage: number;
  loadKg: number;
  loadLbs: number;
  predictedVelocityMs: number;
  zoneName: string;
  zoneNameAr: string;
  zoneColorClass: string;
  practicalApplication: string;
}

/**
 * Calculates Ordinary Least Squares (OLS) Linear Regression for Load-Velocity Points
 */
export function calculateLinearRegression(points: VBTDataPoint[]): LinearRegressionResult {
  const validPoints = points.filter(p => p.load > 0 && p.velocity > 0);
  const n = validPoints.length;

  if (n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const pt of validPoints) {
    sumX += pt.load;
    sumY += pt.velocity;
    sumXY += pt.load * pt.velocity;
    sumX2 += pt.load * pt.load;
    sumY2 += pt.velocity * pt.velocity;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-Squared
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (const pt of validPoints) {
    const predictedY = slope * pt.load + intercept;
    ssTot += Math.pow(pt.velocity - meanY, 2);
    ssRes += Math.pow(pt.velocity - predictedY, 2);
  }

  const rSquared = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  return {
    slope: Number(slope.toFixed(5)),
    intercept: Number(intercept.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
  };
}

/**
 * Predicts 1RM using OLS Linear Regression given an exercise Minimal Velocity Threshold (MVT)
 */
export function calculateTheoretical1RM(points: VBTDataPoint[], mvt: number = 0.30): Theoretical1RMResult {
  const regression = calculateLinearRegression(points);
  const { slope, intercept, rSquared } = regression;

  let estimated1RMKg = 0;

  if (slope < 0 && intercept > mvt) {
    const raw1RM = (mvt - intercept) / slope;
    estimated1RMKg = Math.round(raw1RM * 10) / 10;
  }

  const estimated1RMLbs = Math.round(estimated1RMKg * 2.20462 * 10) / 10;

  let fitQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Poor';
  let fitColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';

  if (rSquared >= 0.98) {
    fitQuality = 'Excellent';
    fitColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  } else if (rSquared >= 0.95) {
    fitQuality = 'Good';
    fitColor = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  } else if (rSquared >= 0.90) {
    fitQuality = 'Fair';
    fitColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }

  return {
    estimated1RMKg,
    estimated1RMLbs,
    slope,
    intercept,
    rSquared,
    fitQuality,
    fitColor,
  };
}

/**
 * Derives a standard normative linear profile from a direct manual 1RM input
 */
export function calculateManual1RMProfile(
  manual1RMKg: number,
  exerciseName: string,
  customMvt?: number
): { slope: number; intercept: number } {
  const profile = EXERCISE_PROFILES[exerciseName] || EXERCISE_PROFILES['Deep Squat'];
  const mvt = customMvt !== undefined ? customMvt : profile.defaultMVT;
  const v0 = profile.normativeV0;

  if (manual1RMKg <= 0) {
    return { slope: -0.008, intercept: v0 };
  }

  // slope = (MVT - V0) / 1RM
  const slope = (mvt - v0) / manual1RMKg;
  return {
    slope: Number(slope.toFixed(5)),
    intercept: v0,
  };
}

/**
 * Generates Full-Spectrum Force-Velocity Training Table (20% to 100% 1RM)
 */
export function generateTrainingPercentageTable(
  estimated1RMKg: number,
  slope: number,
  intercept: number
): TrainingPercentageRow[] {
  // Granular percentages
  const percentages = [20, 30, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

  return percentages.map((pct) => {
    const loadKg = Math.round(((estimated1RMKg * pct) / 100) * 10) / 10;
    const loadLbs = Math.round(loadKg * 2.20462 * 10) / 10;

    let predictedV = slope < 0 ? slope * loadKg + intercept : 0;
    if (predictedV < 0.10) predictedV = 0.10;
    predictedV = Math.round(predictedV * 100) / 100;

    let zoneName = '';
    let zoneNameAr = '';
    let zoneColorClass = '';
    let practicalApplication = '';

    if (pct <= 40) {
      // 20%, 30%, 40%
      zoneName = 'Speed / Starting Strength';
      zoneNameAr = 'خفة وسرعة مطلقة';
      zoneColorClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      practicalApplication = 'Optimal for Trap Bar Jumps, explosive start velocity & maximal RFD';
    } else if (pct <= 60) {
      // 45%, 50%, 55%, 60%
      zoneName = 'Speed-Strength';
      zoneNameAr = 'قوة سريعة وانفجار';
      zoneColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      practicalApplication = 'High-velocity triple extension & ballistic contrast jumps';
    } else if (pct <= 75) {
      // 65%, 70%, 75%
      zoneName = 'Strength-Speed / Peak Power';
      zoneNameAr = 'أعلى قدرة ديناميكية';
      zoneColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      practicalApplication = 'Peak mechanical power output zone & dynamic effort clusters';
    } else if (pct <= 85) {
      // 80%, 85%
      zoneName = 'Accelerative Strength';
      zoneNameAr = 'قوة متسارعة';
      zoneColorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      practicalApplication = 'Sprint drive phase conversion & acceleration force (10-15% cutoff)';
    } else {
      // 90%, 95%, 100%
      zoneName = 'Absolute / Maximal Strength';
      zoneNameAr = 'أقصى قوة عصبية';
      zoneColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      practicalApplication = 'Maximal neural recruitment baseline & theoretical 1RM cutoff';
    }

    return {
      percentage: pct,
      loadKg,
      loadLbs,
      predictedVelocityMs: predictedV,
      zoneName,
      zoneNameAr,
      zoneColorClass,
      practicalApplication,
    };
  });
}
