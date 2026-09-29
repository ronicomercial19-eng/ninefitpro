import { useEffect, useState } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';

export const useNativeGeolocation = () => {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let watchId: string;

    const startTracking = async () => {
      try {
        const permission = await Geolocation.requestPermissions();
        if (permission.location !== 'granted') {
          setError('Location permission denied');
          return;
        }

        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (pos, err) => {
            if (err) {
              setError(err.message);
              return;
            }
            setPosition(pos);
          }
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    startTracking();

    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, []);

  return { position, error };
};
