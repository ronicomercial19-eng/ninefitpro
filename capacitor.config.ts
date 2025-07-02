import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9c713e4a7db848ba829c18abc2bf4a27',
  appName: 'fit-evolution-platform',
  webDir: 'dist',
  server: {
    url: 'https://9c713e4a-7db8-48ba-829c-18abc2bf4a27.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#FF8000',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;