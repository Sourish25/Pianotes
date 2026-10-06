import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Pianotes Capacitor Configuration
 * Configured for Android 1:1 Apple Liquid Glass 3D Piano & Waterfall Synthesizer
 */
const config: CapacitorConfig = {
  appId: 'com.pianotes.app',
  appName: 'Pianotes',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#05070f',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover'
    }
  },
  cordova: {
    preferences: {
      Orientation: 'sensorLandscape',
      HardwareAcceleration: 'true'
    }
  }
};

export default config;
