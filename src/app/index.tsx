import { Redirect } from 'expo-router';
import { useSyncExternalStore } from 'react';

import { getSessionRole, subscribeSession } from '@/data/api';

export default function Index() {
  const role = useSyncExternalStore(subscribeSession, getSessionRole, () => null);
  return <Redirect href={role === 'ground' ? '/ground' : role === 'astronaut' ? '/home' : '/login'} />;
}
