import { useEffect } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';

export const useAppSplash = () => {
  useEffect(() => {
    const showSplash = async () => {
      await SplashScreen.show({
        showDuration: 3000,
        autoHide: true,
      });
    };
    showSplash();
  }, []);
};
