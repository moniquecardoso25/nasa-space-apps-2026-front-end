import type { AnimationDef, Gait, Program, StatusKey } from './types';

/** Walk cycles used while moving to a spot (and by the walk animations). */
export const GAITS: Record<Gait, { speed: number; program: Program }> = {
  normal: { speed: 32, program: { period: 500, tracks: { legL: [14, -14], legR: [-14, 14], armF: [-14, 14], body: [0, -3] } } },
  slow: { speed: 18, program: { period: 900, tracks: { legL: [9, -9], legR: [-9, 9], armF: [-6, 6], body: [0, -1.5], head: [8] } } },
  fast: { speed: 46, program: { period: 380, tracks: { legL: [16, -16], legR: [-16, 16], armF: [-18, 18], body: [0, -3], head: [6] } } },
  limp: { speed: 18, program: { period: 760, tracks: { legL: [12, -8], legR: [-3, 3], armF: [-8, 8], body: [0, -1, -4, 0], lean: [3, 5] } } },
  guard: { speed: 24, program: { period: 600, tracks: { legL: [12, -12], legR: [-12, 12], armF: [-38], body: [0, -2], head: [5] } } },
};

const A = (d: AnimationDef) => d;

/**
 * Catalogue. Idle: 14 everyday animations picked at random by weight.
 * Status: driven by the astronaut's data (higher priority than idle).
 * Event: short reactions (just saved a log).
 */
export const ANIMATIONS: AnimationDef[] = [
  // ---------------------------------------------------------------- idle (14)
  A({ id: 'walk', label: 'Walk', kind: 'idle', weight: 5, duration: [600, 1200], spot: 'random', program: { period: 1000, tracks: {} } }),
  A({ id: 'wave', label: 'Wave', kind: 'idle', weight: 2, duration: [2200, 3000], spot: 'stay', program: { period: 520, tracks: { armF: [-150, -175], head: [-4] } } }),
  A({ id: 'stretch', label: 'Stretch', kind: 'idle', weight: 2, duration: [2600, 3400], spot: 'stay', program: { period: 1300, tracks: { armF: [-170, -180], armB: [-150, -170], squash: [1.04, 1.06], body: [-4, -6], head: [-8] } } }),
  A({ id: 'float', label: 'Float (zero-g)', kind: 'idle', weight: 2, duration: [3200, 4200], spot: 'stay', program: { period: 1800, tracks: { body: [-18, -28], legL: [10, 18], legR: [-6, 2], armF: [-40, -60], lean: [-4, 4] } } }),
  A({ id: 'lookWindow', label: 'Look out the window', kind: 'idle', weight: 3, duration: [3000, 4500], spot: 'window', program: { period: 2400, tracks: { head: [-12, -8], armF: [-20] } } }),
  A({ id: 'coffee', label: 'Drink coffee', kind: 'idle', weight: 2, duration: [3000, 4000], spot: 'stay', prop: 'cup', program: { period: 1500, tracks: { armF: [-55, -105, -105, -55], head: [0, -8, -8, 0] } } }),
  A({ id: 'console', label: 'Use the console', kind: 'idle', weight: 3, duration: [3000, 4200], spot: 'console', program: { period: 360, tracks: { armF: [-68, -76], head: [6] } } }),
  A({ id: 'waterPlant', label: 'Water the plant', kind: 'idle', weight: 2, duration: [2600, 3400], spot: 'plant', prop: 'can', program: { period: 1200, tracks: { armF: [-50, -35], lean: [8, 10], head: [8] } } }),
  A({ id: 'playPet', label: 'Play with the pet', kind: 'idle', weight: 2, duration: [2600, 3400], spot: 'pet', needsPet: true, program: { period: 600, tracks: { body: [10, 12], legL: [-30], legR: [-30], armF: [-20, 10], head: [12] } } }),
  A({ id: 'tablet', label: 'Read the tablet', kind: 'idle', weight: 2, duration: [3000, 4200], spot: 'stay', prop: 'tablet', program: { period: 2600, tracks: { armF: [-72, -76], head: [10, 12] } } }),
  A({ id: 'jump', label: 'Jump', kind: 'idle', weight: 1, duration: [1600, 2000], spot: 'stay', program: { period: 650, tracks: { body: [0, -34, 0], squash: [0.9, 1.06, 0.92], armF: [-20, -140, -20], legL: [0, 14, 0], legR: [0, -14, 0] } } }),
  A({ id: 'spin', label: 'Spin', kind: 'idle', weight: 1, duration: [1200, 1200], spot: 'stay', program: { period: 1200, tracks: { armF: [-60], body: [-6] } } }),
  A({ id: 'sit', label: 'Sit down', kind: 'idle', weight: 1, duration: [3000, 4000], spot: 'stay', program: { period: 2000, tracks: { body: [30], legL: [-82], legR: [-82], armF: [-30], head: [0, 4] } } }),
  A({ id: 'yawnLight', label: 'Small yawn', kind: 'idle', weight: 1, duration: [1800, 2200], spot: 'stay', program: { period: 1800, tracks: { head: [0, -12, 0], armF: [0, -120, 0], eyes: [1, 0.15, 1] } } }),

  // ---------------------------------------------------------------- status
  A({ id: 'yawn', label: 'Yawn (tired)', kind: 'status', statuses: ['tired'], weight: 3, duration: [2200, 2800], spot: 'stay', program: { period: 2200, tracks: { head: [4, -14, 4], armF: [0, -125, 0], eyes: [0.5, 0.1, 0.5], squash: [1, 1.03, 1] } }, pose: { head: 6, eyes: 0.4, armF: -10 } }),
  A({ id: 'slowWalk', label: 'Walk slowly (tired)', kind: 'status', statuses: ['tired'], weight: 3, duration: [400, 800], spot: 'random', gait: 'slow', program: { period: 1000, tracks: { head: [8], eyes: [0.5] } } }),
  A({ id: 'nap', label: 'Nap (tired)', kind: 'status', statuses: ['tired'], weight: 2, duration: [4500, 6000], spot: 'stay', overlay: 'zzz', program: { period: 2600, tracks: { body: [30, 31], legL: [-82], legR: [-82], head: [16, 20], eyes: [0.1], armF: [-20] } } }),
  A({ id: 'sitEarth', label: 'Sit and look at Earth (low mood)', kind: 'status', statuses: ['lowMood'], weight: 4, duration: [5000, 6500], spot: 'window', program: { period: 3600, tracks: { body: [30], legL: [-82], legR: [-82], head: [-10, -6], armF: [-25], eyes: [0.7] } } }),
  A({ id: 'dance', label: 'Dance (happy)', kind: 'status', statuses: ['happy'], weight: 3, duration: [3000, 3800], spot: 'stay', overlay: 'note', program: { period: 520, tracks: { armF: [-150, -40], armB: [-40, -150], body: [0, -6], lean: [-8, 8], legL: [10, -6], legR: [-6, 10], head: [-6, 6] } } }),
  A({ id: 'cheer', label: 'Cheer (happy)', kind: 'status', statuses: ['happy'], weight: 2, duration: [1800, 2300], spot: 'stay', overlay: 'sparkles', program: { period: 700, tracks: { body: [0, -26, 0], armF: [-165, -175, -165], armB: [-160], squash: [0.94, 1.05, 0.94] } } }),
  A({ id: 'pace', label: 'Pace back and forth (stress)', kind: 'status', statuses: ['stress'], weight: 4, duration: [3800, 5000], spot: 'pace', gait: 'fast', overlay: 'sweat', program: { period: 380, tracks: { head: [8] } } }),
  A({ id: 'limp', label: 'Limp (leg injury)', kind: 'status', statuses: ['injuryLeg'], weight: 4, duration: [400, 800], spot: 'random', gait: 'limp', program: { period: 760, tracks: {} } }),
  A({ id: 'holdArm', label: 'Hold the hurt arm (arm injury)', kind: 'status', statuses: ['injuryArm'], weight: 4, duration: [2600, 3400], spot: 'random', gait: 'guard', program: { period: 2000, tracks: { armF: [-38, -42], armB: [-30], head: [10, 8], lean: [3] } } }),
  A({ id: 'holdBack', label: 'Hold the back (back/neck injury)', kind: 'status', statuses: ['injuryBack'], weight: 4, duration: [2600, 3400], spot: 'random', gait: 'slow', program: { period: 2000, tracks: { armB: [40, 46], lean: [10, 12], head: [6] } } }),
  A({ id: 'stretchHard', label: 'Stretch (low exercise)', kind: 'status', statuses: ['lowExercise'], weight: 3, duration: [3000, 3600], spot: 'stay', program: { period: 1500, tracks: { armF: [-175, -150], armB: [-170, -150], lean: [-10, 10], legL: [6, -6], legR: [-6, 6] } } }),
  A({ id: 'pokeFood', label: 'Poke at the food (menu fatigue)', kind: 'status', statuses: ['menuFatigue'], weight: 3, duration: [3000, 3800], spot: 'stay', prop: 'tray', program: { period: 700, tracks: { armF: [-40, -54], head: [14, 12], eyes: [0.7] } } }),

  // ---------------------------------------------------------------- event
  A({ id: 'celebrate', label: 'Celebrate (just saved a log)', kind: 'event', statuses: ['saved'], weight: 1, duration: [1800, 1800], spot: 'stay', overlay: 'sparkles', program: { period: 600, tracks: { body: [0, -30, 0], armF: [-170, -150, -170], armB: [-160], squash: [0.92, 1.06, 0.92], head: [-8] } } }),
];

export const IDLE = ANIMATIONS.filter((a) => a.kind === 'idle');
export const byId = (id: string) => ANIMATIONS.find((a) => a.id === id) ?? ANIMATIONS[0];

/** Status priority (first = strongest). */
export const STATUS_PRIORITY: StatusKey[] = [
  'saved',
  'injuryLeg',
  'injuryArm',
  'injuryBack',
  'tired',
  'stress',
  'lowMood',
  'menuFatigue',
  'lowExercise',
  'happy',
];

export const STATUS_LABEL: Record<StatusKey, string> = {
  saved: 'Just saved a log',
  injuryLeg: 'Leg injury',
  injuryArm: 'Arm injury',
  injuryBack: 'Back/neck injury',
  tired: 'Tired / short sleep',
  stress: 'Stressed',
  lowMood: 'Low mood',
  menuFatigue: 'Menu fatigue',
  lowExercise: 'Low exercise',
  happy: 'Happy',
};
