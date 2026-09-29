import { useEffect, useState } from 'react';

// Hook for Push Notification Permission
export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        console.log('Push notifications enabled');
      }
    }
  };

  return { permission, requestPermission };
};

// Hook for Bluetooth Request
export const useBluetoothRequest = () => {
  const requestDevice = async () => {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      console.log('Bluetooth device connected:', device.name);
      return device;
    } catch (error) {
      console.error('Bluetooth request failed:', error);
      return null;
    }
  };

  return { requestDevice };
};
