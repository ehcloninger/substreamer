module.exports = {
  projects: [
    {
      preset: 'jest-expo/ios',
      displayName: 'ios',
      testMatch: [
        '<rootDir>/modules/**/__tests__/**/*.(test|spec).[jt]s?(x)',
        '<rootDir>/src/**/__tests__/**/*.(test|spec).[jt]s?(x)',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^.+/i18n/i18n$': '<rootDir>/src/test-utils/i18nMock.ts',
      },
      setupFiles: ['<rootDir>/src/test-utils/i18nSetup.ts'],
    },
    {
      preset: 'jest-expo/android',
      displayName: 'android',
      testMatch: [
        '<rootDir>/modules/**/__tests__/**/*.(test|spec).[jt]s?(x)',
        '<rootDir>/src/**/__tests__/**/*.(test|spec).[jt]s?(x)',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^.+/i18n/i18n$': '<rootDir>/src/test-utils/i18nMock.ts',
      },
      setupFiles: ['<rootDir>/src/test-utils/i18nSetup.ts'],
    },
  ],
  collectCoverageFrom: [
    'modules/expo-async-fs/src/index.ts',
    'modules/expo-backup-exclusions/src/index.ts',
    'modules/expo-gzip/src/index.ts',
    'modules/expo-move-to-back/src/index.ts',
    'modules/expo-ssl-trust/src/ExpoSslTrust.ts',
    'modules/react-native-track-player/src/trackPlayer.ts',
    'modules/react-native-track-player/src/hooks/use*.ts',
    'modules/subsonic-api/src/index.ts',
    'modules/subsonic-api/src/utils.ts',
    'modules/subsonic-api/src/md5.ts',
    'src/utils/**/*.ts',
    'src/hooks/usePlaybackAnalytics.ts',
    'src/store/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
};
