import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

export type CrewProfile = {
  name: string; email: string; crewId: string; mission: string; missionStart: string; missionDays: string; language: string;
  heightCm: string; weightKg: string; age: string; boneDensity: string; muscleMass: string; strengthScore: string; aerobicScore: string; bodyFat: string;
  restingHeartRate: string; bloodPressure: string; sleepHours: string; bedtime: string; calorieGoal: string; exerciseGoal: string; foodPreference: string;
  devices: string[]; reminders: boolean; companion: string;
};

type CrewProfileContextValue = { profile: CrewProfile | null; setProfile: (profile: CrewProfile | null) => void };
const CrewProfileContext = createContext<CrewProfileContextValue | null>(null);

export function CrewProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<CrewProfile | null>(null);
  const value = useMemo(() => ({ profile, setProfile }), [profile]);
  return <CrewProfileContext.Provider value={value}>{children}</CrewProfileContext.Provider>;
}

export function useCrewProfile() {
  const context = useContext(CrewProfileContext);
  if (!context) throw new Error('useCrewProfile must be used inside CrewProfileProvider');
  return context;
}
