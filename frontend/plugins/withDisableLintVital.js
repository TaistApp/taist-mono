const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Disables Android lintVital checks in release builds.
 * These checks can hang indefinitely on resource-constrained machines
 * and are not required for producing the AAB.
 */
module.exports = function withDisableLintVital(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      // Add lintOptions to disable lintVital if not already present
      if (!config.modResults.contents.includes("checkReleaseBuilds false")) {
        config.modResults.contents = config.modResults.contents.replace(
          /android\s*\{/,
          `android {
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }`
        );
      }
    }
    return config;
  });
};
