import { render, type RenderOptions } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '../i18n/i18n';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}
