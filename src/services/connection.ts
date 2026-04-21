import { useEffect, useState, useCallback } from 'react';
import { onConnectionStatusChange, getConnectionStatus, resetGun } from './gun';

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

export function useConnectionStatus(): {
  status: ConnectionState;
  reconnect: () => void;
} {
  const [status, setStatus] = useState<ConnectionState>(getConnectionStatus());

  useEffect(() => {
    const unsub = onConnectionStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    return unsub;
  }, []);

  const reconnect = useCallback(() => {
    resetGun();
  }, []);

  return { status, reconnect };
}
