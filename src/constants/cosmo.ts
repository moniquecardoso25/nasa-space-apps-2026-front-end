export const C = {
  background: '#0B0B24', surface: '#1E1B4E', elevated: '#28245F', border: '#3B367D',
  text: '#F1EFFF', muted: '#ABA8D8', purple: '#8B7CFF', teal: '#3DE0C8', gold: '#FFC94D',
  green: '#39FF9F', pink: '#FF7A93', track: '#2A2766',
};

export type LogModule = 'mood' | 'sleep' | 'radiation' | 'body' | 'meals' | 'exercise' | 'relax';

export const LOGS: { key: LogModule; title: string; icon: string; status: string; detail: string }[] = [
  { key: 'mood', title: 'Mood check-in', icon: '☻', status: 'Done', detail: 'Okay · Calm · Focused' },
  { key: 'sleep', title: 'Sleep', icon: '☾', status: 'Done', detail: '5 h 20 min · quality 3/5' },
  { key: 'radiation', title: 'Radiation', icon: '☼', status: 'Done', detail: '38 μSv · personal dosimeter' },
  { key: 'meals', title: 'Meals', icon: '◒', status: 'Log now', detail: '1,840 of 2,500 kcal' },
  { key: 'exercise', title: 'Exercise', icon: '⌁', status: 'Log now', detail: '60 of 90 min today' },
  { key: 'body', title: 'Body', icon: '♡', status: 'Log now', detail: '3 of 5 measurements current' },
  { key: 'relax', title: 'Relax', icon: '◌', status: 'Explore', detail: 'Breathing · Meditation · Stretch' },
];

export const LOG_PATH: Record<LogModule, `/log/${LogModule}`> = {
  mood: '/log/mood', sleep: '/log/sleep', radiation: '/log/radiation', body: '/log/body',
  meals: '/log/meals', exercise: '/log/exercise', relax: '/log/relax',
};

export const VOICE_OPTIONS = [
  { label: 'Home', route: '/home' }, { label: 'Status', route: '/status' },
  { label: 'Orbi AI', route: '/orbi' }, { label: 'Messages', route: '/messages' },
  { label: 'Calendar', route: '/calendar' }, { label: 'Avatar & shop', route: '/avatar' },
  ...LOGS.map((log) => ({ label: log.title, route: LOG_PATH[log.key] })),
  { label: 'Leaderboard', route: '/leaderboard' },
];
