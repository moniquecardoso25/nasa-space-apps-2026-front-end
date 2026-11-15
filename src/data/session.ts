/**
 * UI session state that is not part of the data model (resets on reload).
 * - onboardedThisSession: the onboarding flow is shown after the first
 *   sign-in of a session (mock astronauts are all `onboardingDone: true`,
 *   so this keeps Login → Onboarding reachable as in navigation.json).
 */
export const session: {
  onboardedThisSession: boolean;
  reminders: boolean;
  bpCuffPaired: boolean;
  /** Summary of the last "Fill with Orbi" save, shown once on Home. */
  orbiFill: { saved: string[]; coins: number; at: number } | null;
} = {
  onboardedThisSession: false,
  reminders: true,
  bpCuffPaired: false,
  orbiFill: null,
};
