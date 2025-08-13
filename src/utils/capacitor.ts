import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export const initializeCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    // Configure status bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#000000' });
    
    // Configure keyboard
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-is-open');
    });
    
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-is-open');
    });
  }
};

export const hideStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.hide();
  }
};

export const showStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    await StatusBar.show();
  }
};