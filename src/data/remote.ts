import { flush, getSyncStatus } from './sync';

export const refreshData = () => flush();
export const getRefreshWarning = () => getSyncStatus().problem;
