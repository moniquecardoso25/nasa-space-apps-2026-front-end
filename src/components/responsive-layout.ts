import { createContext, useContext, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export const ResponsiveLayoutContext = createContext(false);

const subscribe = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function useDesktopLayout() {
  return useContext(ResponsiveLayoutContext);
}

export function useHydrated() {
  const hydrated = useSyncExternalStore(subscribe, getClientHydrationSnapshot, getServerHydrationSnapshot);
  return Platform.OS === 'web' ? hydrated : true;
}
