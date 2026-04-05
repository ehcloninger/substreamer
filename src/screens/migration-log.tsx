import { File, Paths } from 'expo-file-system';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '../components/EmptyState';
import { GradientBackground } from '../components/GradientBackground';
import { useTheme } from '../hooks/useTheme';

const LOG_FILE = new File(Paths.document, 'migration-log.txt');

export function MigrationLogScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (LOG_FILE.exists) {
      LOG_FILE.text().then((text) => {
        setContent(text);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <GradientBackground style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </GradientBackground>
    );
  }

  if (!content) {
    return (
      <GradientBackground style={styles.centered}>
        <EmptyState
          icon="document-text-outline"
          title={t('noMigrationLog')}
          subtitle={t('migrationLogGeneratedOnLaunch')}
        />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground scrollable>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerHeight + 16 }]}
    >
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text
          style={[
            styles.logText,
            { color: colors.textPrimary },
          ]}
          selectable
        >
          {content}
        </Text>
      </View>
    </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  logText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
