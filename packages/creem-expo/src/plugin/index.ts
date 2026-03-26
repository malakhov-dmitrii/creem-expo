import {
  type ConfigPlugin,
  createRunOncePlugin,
  withInfoPlist,
  withAndroidManifest,
  IOSConfig,
  AndroidConfig,
} from '@expo/config-plugins';

export type CreemPluginProps = {
  scheme?: string;
};

/**
 * Validate a URI scheme per RFC 3986.
 * scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
 */
export function validateScheme(scheme: string): void {
  if (!scheme || scheme.length === 0) {
    throw new Error('creem-expo plugin: scheme cannot be empty.');
  }
  if (!/^[a-zA-Z][a-zA-Z0-9+\-.]*$/.test(scheme)) {
    throw new Error(
      `creem-expo plugin: Invalid scheme "${scheme}". ` +
        'Must start with a letter, followed by letters, digits, "+", "-", or ".".',
    );
  }
}

function resolveScheme(
  config: { scheme?: string | string[] },
  props: CreemPluginProps,
): string | undefined {
  if (props.scheme) return props.scheme;
  if (typeof config.scheme === 'string') return config.scheme;
  if (Array.isArray(config.scheme)) return config.scheme[0];
  return undefined;
}

export const withCreemScheme: ConfigPlugin<CreemPluginProps> = (config, props = {}) => {
  const scheme = resolveScheme(config, props);

  if (!scheme) {
    throw new Error(
      'creem-expo plugin: No scheme provided. ' +
        'Pass { scheme: "myapp" } in plugin options or set "scheme" in app.json.',
    );
  }

  validateScheme(scheme);

  config.extra = {
    ...config.extra,
    creem: { ...(config.extra?.creem as Record<string, unknown>), scheme },
  };

  config = withInfoPlist(config, (mod) => {
    if (!IOSConfig.Scheme.hasScheme(scheme, mod.modResults)) {
      mod.modResults = IOSConfig.Scheme.appendScheme(scheme, mod.modResults);
    }
    return mod;
  });

  config = withAndroidManifest(config, (mod) => {
    if (!AndroidConfig.Scheme.hasScheme(scheme, mod.modResults)) {
      mod.modResults = AndroidConfig.Scheme.appendScheme(scheme, mod.modResults);
    }
    return mod;
  });

  return config;
};

const pkg = require('../../package.json') as { version: string };
const withCreem = createRunOncePlugin(withCreemScheme, 'creem-expo', pkg.version);

export default withCreem;
