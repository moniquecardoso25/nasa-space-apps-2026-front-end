/** Rig channels animated by Reanimated (see BoltFigure). Degrees or px. */
export type Channel = 'head' | 'headY' | 'armF' | 'armB' | 'legL' | 'legR' | 'body' | 'lean' | 'squash' | 'eyes';

export const NEUTRAL: Record<Channel, number> = {
  head: 0,
  headY: 0,
  armF: 0,
  armB: 0,
  legL: 0,
  legR: 0,
  body: 0,
  lean: 0,
  squash: 1,
  eyes: 1,
};

/** Keyframes cycled over `period` ms (one value = hold that value). */
export type Program = { period: number; tracks: Partial<Record<Channel, number[]>> };

/** Where Bolt goes before acting. */
export type Spot = 'stay' | 'random' | 'window' | 'console' | 'plant' | 'pet' | 'pace';
export type Gait = 'normal' | 'slow' | 'fast' | 'limp' | 'guard';
export type Prop = 'cup' | 'tablet' | 'can' | 'tray' | null;
export type Overlay = 'zzz' | 'sparkles' | 'sweat' | 'note' | null;

export type StatusKey =
  | 'saved'
  | 'injuryLeg'
  | 'injuryArm'
  | 'injuryBack'
  | 'tired'
  | 'stress'
  | 'lowMood'
  | 'menuFatigue'
  | 'lowExercise'
  | 'happy';

export type AnimKind = 'idle' | 'status' | 'event';

export interface AnimationDef {
  id: string;
  label: string;
  kind: AnimKind;
  /** Statuses this animation expresses (status/event animations). */
  statuses?: StatusKey[];
  /** Relative chance among candidates. */
  weight: number;
  /** Action duration range in ms (after walking to the spot). */
  duration: [number, number];
  spot: Spot;
  gait?: Gait;
  program: Program;
  /** Static frame for reduced motion (defaults to the first keyframe of each track). */
  pose?: Partial<Record<Channel, number>>;
  prop?: Prop;
  overlay?: Overlay;
  /** Needs an equipped pet. */
  needsPet?: boolean;
}
