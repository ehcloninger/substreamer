import { migrationStore } from '../migrationStore';

beforeEach(() => {
  migrationStore.setState({ completedVersion: 0 });
});

describe('migrationStore', () => {
  it('initializes with completedVersion 0', () => {
    expect(migrationStore.getState().completedVersion).toBe(0);
  });

  it('setCompletedVersion updates the version', () => {
    migrationStore.getState().setCompletedVersion(3);
    expect(migrationStore.getState().completedVersion).toBe(3);
  });

  it('setCompletedVersion can be called multiple times', () => {
    migrationStore.getState().setCompletedVersion(1);
    migrationStore.getState().setCompletedVersion(5);
    expect(migrationStore.getState().completedVersion).toBe(5);
  });
});
