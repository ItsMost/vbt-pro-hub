import type { VBTDataPoint } from '../utils/vbtEngine';

export interface AthleteLiftTest {
  exercise: string;
  mvt: number;
  rawPoints: VBTDataPoint[];
  testDate: string;
}

export interface MockAthleteProfile {
  id: string;
  name: string;
  nameAr: string;
  sportEvent: string;
  bodyWeightKg: number;
  notes?: string;
  avatarInitials: string;
  colorAccent: 'cyan' | 'lime' | 'emerald';
  manual1RMMap: Record<string, number>;
  tests: AthleteLiftTest[];
}

export const MOCK_ATHLETES: MockAthleteProfile[] = [
  {
    id: 'mahmoud-horus',
    name: 'Mahmoud Horus',
    nameAr: 'محمود حورس',
    sportEvent: '100m, 200m, 400m Sprinter',
    bodyWeightKg: 81.5,
    notes: 'National Sprint Qualifier • High Force Accumulation Block',
    avatarInitials: 'MH',
    colorAccent: 'cyan',
    manual1RMMap: {
      'Deep Squat': 135,
      'Half Squat': 160,
      'Quarter Squat': 195,
      'Bench Press': 80,
      'Trap Bar Deadlift': 185,
      'Power Clean': 110,
    },
    tests: [
      {
        exercise: 'Deep Squat',
        mvt: 0.30,
        testDate: '2026-08-28',
        rawPoints: [
          { load: 51, velocity: 1.06 },
          { load: 70, velocity: 0.96 },
          { load: 79, velocity: 0.86 },
          { load: 92, velocity: 0.72 },
          { load: 106, velocity: 0.53 },
        ]
      },
      {
        exercise: 'Half Squat',
        mvt: 0.38,
        testDate: '2026-08-29',
        rawPoints: [
          { load: 70, velocity: 1.12 },
          { load: 95, velocity: 0.95 },
          { load: 120, velocity: 0.74 },
          { load: 140, velocity: 0.54 },
        ]
      },
      {
        exercise: 'Quarter Squat',
        mvt: 0.50,
        testDate: '2026-08-30',
        rawPoints: [
          { load: 90, velocity: 1.25 },
          { load: 120, velocity: 1.02 },
          { load: 150, velocity: 0.81 },
          { load: 175, velocity: 0.63 },
        ]
      },
      {
        exercise: 'Bench Press',
        mvt: 0.17,
        testDate: '2026-08-27',
        rawPoints: [
          { load: 43, velocity: 0.99 },
          { load: 52, velocity: 0.72 },
          { load: 61, velocity: 0.56 },
          { load: 70, velocity: 0.39 },
        ]
      },
      {
        exercise: 'Trap Bar Deadlift',
        mvt: 0.28,
        testDate: '2026-08-25',
        rawPoints: [
          { load: 80, velocity: 1.02 },
          { load: 110, velocity: 0.83 },
          { load: 140, velocity: 0.61 },
          { load: 165, velocity: 0.42 },
        ]
      },
      {
        exercise: 'Power Clean',
        mvt: 0.40,
        testDate: '2026-08-26',
        rawPoints: [
          { load: 50, velocity: 1.15 },
          { load: 65, velocity: 0.98 },
          { load: 80, velocity: 0.81 },
          { load: 95, velocity: 0.62 },
        ]
      }
    ]
  },
  {
    id: 'ryan-yasser',
    name: 'Ryan Yasser',
    nameAr: 'ريان ياسر',
    sportEvent: '200m Sprinter & Long Jumper',
    bodyWeightKg: 62.0,
    notes: 'Universiade Trials • Peaking & Contrast Elasticity Block',
    avatarInitials: 'RY',
    colorAccent: 'emerald',
    manual1RMMap: {
      'Deep Squat': 105,
      'Half Squat': 125,
      'Quarter Squat': 150,
      'Bench Press': 60,
      'Trap Bar Deadlift': 135,
      'Power Clean': 75,
    },
    tests: [
      {
        exercise: 'Deep Squat',
        mvt: 0.30,
        testDate: '2026-08-29',
        rawPoints: [
          { load: 45, velocity: 1.05 },
          { load: 60, velocity: 0.89 },
          { load: 75, velocity: 0.72 },
          { load: 90, velocity: 0.51 },
        ]
      },
      {
        exercise: 'Half Squat',
        mvt: 0.38,
        testDate: '2026-08-29',
        rawPoints: [
          { load: 55, velocity: 1.10 },
          { load: 75, velocity: 0.92 },
          { load: 95, velocity: 0.68 },
          { load: 110, velocity: 0.50 },
        ]
      },
      {
        exercise: 'Quarter Squat',
        mvt: 0.50,
        testDate: '2026-08-30',
        rawPoints: [
          { load: 70, velocity: 1.20 },
          { load: 95, velocity: 0.98 },
          { load: 120, velocity: 0.77 },
          { load: 135, velocity: 0.62 },
        ]
      },
      {
        exercise: 'Bench Press',
        mvt: 0.17,
        testDate: '2026-08-27',
        rawPoints: [
          { load: 30, velocity: 0.94 },
          { load: 40, velocity: 0.69 },
          { load: 48, velocity: 0.47 },
          { load: 54, velocity: 0.28 },
        ]
      },
      {
        exercise: 'Trap Bar Deadlift',
        mvt: 0.28,
        testDate: '2026-08-24',
        rawPoints: [
          { load: 60, velocity: 1.08 },
          { load: 85, velocity: 0.85 },
          { load: 110, velocity: 0.58 },
          { load: 125, velocity: 0.40 },
        ]
      },
      {
        exercise: 'Power Clean',
        mvt: 0.40,
        testDate: '2026-08-25',
        rawPoints: [
          { load: 40, velocity: 1.15 },
          { load: 52, velocity: 0.92 },
          { load: 65, velocity: 0.68 },
        ]
      }
    ]
  }
];
