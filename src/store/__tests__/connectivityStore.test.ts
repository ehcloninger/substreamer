import { connectivityStore } from '../connectivityStore';

beforeEach(() => {
  connectivityStore.setState({
    isInternetReachable: true,
    isServerReachable: true,
    bannerState: 'hidden',
  });
});

describe('connectivityStore', () => {
  it('setInternetReachable updates state', () => {
    connectivityStore.getState().setInternetReachable(false);
    expect(connectivityStore.getState().isInternetReachable).toBe(false);
  });

  it('setServerReachable updates state', () => {
    connectivityStore.getState().setServerReachable(false);
    expect(connectivityStore.getState().isServerReachable).toBe(false);
  });

  it('setBannerState updates state', () => {
    connectivityStore.getState().setBannerState('unreachable');
    expect(connectivityStore.getState().bannerState).toBe('unreachable');
  });

  it('setBannerState to reconnected', () => {
    connectivityStore.getState().setBannerState('reconnected');
    expect(connectivityStore.getState().bannerState).toBe('reconnected');
  });
});
