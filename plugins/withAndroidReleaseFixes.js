const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Modifies an AndroidManifest object for release hardening / fixes:
 * 1. Sets android:usesCleartextTraffic="true" on <application>
 * 2. Appends fontScale and density to MainActivity's android:configChanges without duplicates
 *
 * Exported pure manifest-transform function for unit testing.
 *
 * @param {any} manifest
 * @returns {any}
 */
function setAndroidReleaseFixes(manifest) {
  const application = (manifest?.manifest?.application ?? manifest?.application)?.[0];
  if (!application) {
    return manifest;
  }
  if (!application.$) {
    application.$ = {};
  }
  application.$['android:usesCleartextTraffic'] = 'true';

  const activity =
    application.activity?.find(
      (a) =>
        a.$ &&
        (a.$['android:name'] === '.MainActivity' ||
          a.$['android:name']?.endsWith('.MainActivity'))
    ) ?? application.activity?.[0];

  if (activity) {
    if (!activity.$) {
      activity.$ = {};
    }
    const current = activity.$['android:configChanges'] || '';
    const parts = current ? current.split('|').filter(Boolean) : [];
    for (const val of ['fontScale', 'density']) {
      if (!parts.includes(val)) {
        parts.push(val);
      }
    }
    activity.$['android:configChanges'] = parts.join('|');
  }

  return manifest;
}

/**
 * Config plugin that applies Android release fixes to the merged manifest.
 */
const withAndroidReleaseFixes = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = setAndroidReleaseFixes(modConfig.modResults);
    return modConfig;
  });
};

withAndroidReleaseFixes.withAndroidReleaseFixes = withAndroidReleaseFixes;
withAndroidReleaseFixes.setAndroidReleaseFixes = setAndroidReleaseFixes;
withAndroidReleaseFixes.modifyAndroidManifest = setAndroidReleaseFixes;

module.exports = withAndroidReleaseFixes;
module.exports.default = withAndroidReleaseFixes;
module.exports.withAndroidReleaseFixes = withAndroidReleaseFixes;
module.exports.setAndroidReleaseFixes = setAndroidReleaseFixes;
module.exports.modifyAndroidManifest = setAndroidReleaseFixes;
