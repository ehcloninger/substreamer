jest.mock('../sqliteStorage', () => require('../__mocks__/sqliteStorage'));

import { backupStore } from '../backupStore';

beforeEach(() => {
  backupStore.setState({
    autoBackupEnabled: true,
    lastBackupTime: null,
  });
});

describe('backupStore', () => {
  it('setAutoBackupEnabled to false', () => {
    backupStore.getState().setAutoBackupEnabled(false);
    expect(backupStore.getState().autoBackupEnabled).toBe(false);
  });

  it('setAutoBackupEnabled to true', () => {
    backupStore.setState({ autoBackupEnabled: false });
    backupStore.getState().setAutoBackupEnabled(true);
    expect(backupStore.getState().autoBackupEnabled).toBe(true);
  });

  it('setLastBackupTime updates timestamp', () => {
    backupStore.getState().setLastBackupTime(1234567890);
    expect(backupStore.getState().lastBackupTime).toBe(1234567890);
  });
});
