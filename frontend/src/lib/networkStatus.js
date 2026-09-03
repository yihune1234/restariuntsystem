import { useEffect } from 'react';
import useOfflineStore from '../store/useOfflineStore';

export const useNetworkStatus = () => {
  const { setOnline } = useOfflineStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);
};

export const initNetworkListeners = (store) => {
  const handleOnline = () => store.getState().setOnline(true);
  const handleOffline = () => store.getState().setOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
