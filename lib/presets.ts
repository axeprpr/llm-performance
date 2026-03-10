export interface ModelPreset {
  name: string;
  url: string;
  key: string;
  model: string;
}

const STORAGE_KEY = 'llm-perf-presets';

export function getPresets(): ModelPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePresets(presets: ModelPreset[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function addOrUpdatePreset(preset: ModelPreset): ModelPreset[] {
  const presets = getPresets();
  const idx = presets.findIndex(p => p.name === preset.name);
  if (idx >= 0) {
    presets[idx] = preset;
  } else {
    presets.push(preset);
  }
  savePresets(presets);
  return presets;
}

export function deletePreset(index: number): ModelPreset[] {
  const presets = getPresets();
  presets.splice(index, 1);
  savePresets(presets);
  return presets;
}
