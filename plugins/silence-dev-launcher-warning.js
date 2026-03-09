const { withXcodeProject } = require("expo/config-plugins");

/**
 * Config plugin that silences the Xcode warning:
 *   "Run script build phase '[Expo Dev Launcher] Strip Local Network Keys
 *   for Release' will be run during every build because it does not specify
 *   any outputs."
 *
 * Why this exists:
 *   expo-dev-launcher injects a shell script build phase into the main app
 *   target that strips local network permission keys from the entitlements
 *   plist during release builds. The script phase declares no output files,
 *   causing Xcode to warn on every build. The warning is cosmetic but adds
 *   noise and can mask real warnings.
 *
 * What it does:
 *   During `expo prebuild`, this plugin finds the "[Expo Dev Launcher]
 *   Strip Local Network Keys for Release" script phase in the main app
 *   target and sets `alwaysOutOfDate = "1"`. This tells Xcode the phase
 *   is intentionally input/output-less and suppresses the warning.
 *
 * Impact:
 *   - Build-time only; no effect on app behaviour.
 *   - If a future expo-dev-launcher version adds output declarations to
 *     the script phase, this plugin becomes a no-op and can be removed.
 */
function withSilenceDevLauncherWarning(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const shellScriptPhases =
      project.hash.project.objects["PBXShellScriptBuildPhase"];

    for (const key of Object.keys(shellScriptPhases)) {
      const phase = shellScriptPhases[key];
      if (typeof phase !== "object") continue;
      if (
        phase.name &&
        phase.name.includes("Expo Dev Launcher") &&
        phase.name.includes("Strip Local Network")
      ) {
        phase.alwaysOutOfDate = 1;
      }
    }

    return config;
  });
}

module.exports = withSilenceDevLauncherWarning;
