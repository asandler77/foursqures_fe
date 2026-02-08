import { NativeModules, Platform } from 'react-native';

const DEFAULT_ANDROID_HOST = '10.0.2.2';
const DEFAULT_IOS_HOST = 'localhost';

const getDevServerHost = (): string | null => {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  const match = scriptURL.match(/https?:\/\/([^/:]+)(?::\d+)?\//);
  return match?.[1] ?? null;
};

export const getBaseUrl = (): string => {
  const hostFromMetro = getDevServerHost();

  if (hostFromMetro) {
    const normalizedHost =
      Platform.OS === 'android' && hostFromMetro === 'localhost'
        ? DEFAULT_ANDROID_HOST
        : hostFromMetro;
    return `http://${normalizedHost}:8000`;
  }

  const fallbackHost = Platform.OS === 'android' ? DEFAULT_ANDROID_HOST : DEFAULT_IOS_HOST;
  return `http://${fallbackHost}:8000`;
};
