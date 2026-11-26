import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shigoto.kasirtoko',
  appName: 'KasirToko',
  webDir: 'dist',
  server: {
    url: 'https://kasir-toko.vercel.app',
    cleartext: false,
  },
};

export default config;
