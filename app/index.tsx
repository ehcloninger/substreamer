import { Redirect } from 'expo-router';

import { authStore } from '../store/authStore';

export default function IndexScreen() {
  const isLoggedIn = authStore((s) => s.isLoggedIn);

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
