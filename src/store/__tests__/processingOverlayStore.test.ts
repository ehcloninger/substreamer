import { processingOverlayStore } from '../processingOverlayStore';

beforeEach(() => {
  jest.useFakeTimers();
  processingOverlayStore.setState({ status: 'idle', label: '', _showedAt: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('processingOverlayStore', () => {
  it('show sets processing status', () => {
    processingOverlayStore.getState().show('Working...');
    expect(processingOverlayStore.getState().status).toBe('processing');
    expect(processingOverlayStore.getState().label).toBe('Working...');
  });

  it('showSuccess waits minimum duration', () => {
    processingOverlayStore.getState().show('Working...');
    processingOverlayStore.getState().showSuccess('Done');
    expect(processingOverlayStore.getState().status).toBe('processing');
    jest.advanceTimersByTime(900);
    expect(processingOverlayStore.getState().status).toBe('success');
    expect(processingOverlayStore.getState().label).toBe('Done');
  });

  it('showSuccess transitions immediately when enough time has passed', () => {
    processingOverlayStore.getState().show('Working...');
    jest.advanceTimersByTime(1000);
    processingOverlayStore.getState().showSuccess('Done');
    jest.advanceTimersByTime(0);
    expect(processingOverlayStore.getState().status).toBe('success');
  });

  it('showError waits minimum duration', () => {
    processingOverlayStore.getState().show('Working...');
    processingOverlayStore.getState().showError('Failed');
    jest.advanceTimersByTime(900);
    expect(processingOverlayStore.getState().status).toBe('error');
    expect(processingOverlayStore.getState().label).toBe('Failed');
  });

  it('showError transitions immediately when enough time has passed', () => {
    processingOverlayStore.getState().show('Working...');
    jest.advanceTimersByTime(1000);
    processingOverlayStore.getState().showError('Oops');
    jest.advanceTimersByTime(0);
    expect(processingOverlayStore.getState().status).toBe('error');
  });

  it('hide resets to idle', () => {
    processingOverlayStore.getState().show('Working...');
    processingOverlayStore.getState().hide();
    expect(processingOverlayStore.getState().status).toBe('idle');
  });

  it('hide clears label', () => {
    processingOverlayStore.getState().show('Working...');
    processingOverlayStore.getState().hide();
    expect(processingOverlayStore.getState().label).toBe('');
  });

  it('last call wins when showSuccess and showError race', () => {
    processingOverlayStore.getState().show('Working...');
    processingOverlayStore.getState().showSuccess('Done');
    processingOverlayStore.getState().showError('Failed');
    jest.advanceTimersByTime(900);
    expect(processingOverlayStore.getState().status).toBe('error');
    expect(processingOverlayStore.getState().label).toBe('Failed');
  });
});
