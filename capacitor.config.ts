import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tusolo.app",
  appName: "TuSolo",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
};

export default config;
