/**
 * Expo config plugin — 强制允许 HTTP 明文 + 用户证书
 */
const { withAndroidManifest } = require('expo/config-plugins');

function withNetworkSecurityConfig(config) {
  return withAndroidManifest(config, (exportedConfig) => {
    const app = exportedConfig.modResults.manifest.application[0];

    if (!app.$) app.$ = {};

    // 两层保障：usesCleartextTraffic + networkSecurityConfig
    app.$['android:usesCleartextTraffic'] = 'true';

    return exportedConfig;
  });
}

module.exports = withNetworkSecurityConfig;
