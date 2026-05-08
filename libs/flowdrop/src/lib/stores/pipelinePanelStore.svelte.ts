const STORAGE_KEY = 'fd-pipeline-panel-open';

let _isOpen = $state(false);

export function getPipelinePanelOpen(): boolean {
  return _isOpen;
}

export const pipelinePanelActions = {
  init(): void {
    if (typeof localStorage !== 'undefined') {
      _isOpen = localStorage.getItem(STORAGE_KEY) === 'true';
    }
  },
  toggle(): void {
    _isOpen = !_isOpen;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(_isOpen));
    }
  },
  setOpen(value: boolean): void {
    _isOpen = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
  }
};
