// Camera Views & 9-Division Zone Configuration Registry
// Provides clean directional/spatial division names that match any camera video feed

export const STANDARD_DIRECTIONAL_DIVISIONS = {
  1: 'NW Sector (Top-Left)',
  2: 'North Sector (Top-Center)',
  3: 'NE Sector (Top-Right)',
  4: 'West Sector (Mid-Left)',
  5: 'Center (Mid-Field)',
  6: 'East Sector (Mid-Right)',
  7: 'SW Sector (Bottom-Left)',
  8: 'South Sector (Bottom-Center)',
  9: 'SE Sector (Bottom-Right)'
};

export const PERSPECTIVE_DIVISIONS = {
  1: 'Far-Left (Background)',
  2: 'Far-Center (Deep Inflow)',
  3: 'Far-Right (Background)',
  4: 'Mid-Left (Lateral)',
  5: 'Center Core (Focal Point)',
  6: 'Mid-Right (Lateral)',
  7: 'Near-Left (Foreground)',
  8: 'Near-Center (Foreground)',
  9: 'Near-Right (Foreground)'
};

export const DEFAULT_CAMERA_ZONES = {
  'crowd.mp4': {
    id: 'crowd.mp4',
    cameraName: 'Camera 01 — Main Entrance Flow',
    facilityZone: 'Main Inflow & Turnstiles',
    description: 'Entrance corridor optical feed with directional 3x3 frame sectors',
    divisions: {
      1: 'NW (Top-Left)',
      2: 'North (Far-Center)',
      3: 'NE (Top-Right)',
      4: 'West (Mid-Left)',
      5: 'Center (Mid-Field)',
      6: 'East (Mid-Right)',
      7: 'SW (Bottom-Left)',
      8: 'South (Foreground)',
      9: 'SE (Bottom-Right)'
    }
  },
  'crowd2.mp4': {
    id: 'crowd2.mp4',
    cameraName: 'Camera 02 — High Density Concourse',
    facilityZone: 'Assembly Area',
    description: 'High-density concourse optical feed with directional 3x3 frame sectors',
    divisions: {
      1: 'NW (Top-Left)',
      2: 'North (Far-Center)',
      3: 'NE (Top-Right)',
      4: 'West (Mid-Left)',
      5: 'Center (Mid-Field)',
      6: 'East (Mid-Right)',
      7: 'SW (Bottom-Left)',
      8: 'South (Foreground)',
      9: 'SE (Bottom-Right)'
    }
  },
  'crowd3.mp4': {
    id: 'crowd3.mp4',
    cameraName: 'Camera 03 — Rapid Motion & Commotion',
    facilityZone: 'Junction Passage',
    description: 'Rapid movement passage optical feed with directional 3x3 frame sectors',
    divisions: {
      1: 'NW (Top-Left)',
      2: 'North (Far-Center)',
      3: 'NE (Top-Right)',
      4: 'West (Mid-Left)',
      5: 'Center (Mid-Field)',
      6: 'East (Mid-Right)',
      7: 'SW (Bottom-Left)',
      8: 'South (Foreground)',
      9: 'SE (Bottom-Right)'
    }
  },
  'mot20_crowd.mp4': {
    id: 'mot20_crowd.mp4',
    cameraName: 'Camera 04 — MOT20 Extreme Crowd',
    facilityZone: 'Transit Concourse',
    description: 'Extreme crowd transit concourse optical feed with directional 3x3 frame sectors',
    divisions: {
      1: 'NW (Top-Left)',
      2: 'North (Far-Center)',
      3: 'NE (Top-Right)',
      4: 'West (Mid-Left)',
      5: 'Center (Mid-Field)',
      6: 'East (Mid-Right)',
      7: 'SW (Bottom-Left)',
      8: 'South (Foreground)',
      9: 'SE (Bottom-Right)'
    }
  },
  'webcam': {
    id: 'webcam',
    cameraName: 'Camera 00 — Local Live Webcam',
    facilityZone: 'Local Room / Station',
    description: 'Real-time USB/integrated camera feed with directional 3x3 frame sectors',
    divisions: {
      1: 'NW (Top-Left)',
      2: 'North (Top-Center)',
      3: 'NE (Top-Right)',
      4: 'West (Mid-Left)',
      5: 'Center (Mid-Field)',
      6: 'East (Mid-Right)',
      7: 'SW (Bottom-Left)',
      8: 'South (Bottom-Center)',
      9: 'SE (Bottom-Right)'
    }
  }
};

export const GENERIC_DEFAULT_DIVISIONS = { ...STANDARD_DIRECTIONAL_DIVISIONS };

const STORAGE_KEY = 'tklab_camera_divisions_v3';

export function loadCameraConfigs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CAMERA_ZONES;
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_CAMERA_ZONES };
    Object.keys(parsed).forEach(camId => {
      merged[camId] = {
        ...(DEFAULT_CAMERA_ZONES[camId] || {
          id: camId,
          cameraName: `Camera Feed — ${camId}`,
          facilityZone: 'Monitored Sector',
          description: 'Video feed source',
          divisions: { ...STANDARD_DIRECTIONAL_DIVISIONS }
        }),
        ...parsed[camId],
        divisions: {
          ...(DEFAULT_CAMERA_ZONES[camId]?.divisions || STANDARD_DIRECTIONAL_DIVISIONS),
          ...(parsed[camId]?.divisions || {})
        }
      };
    });
    return merged;
  } catch (err) {
    console.warn('Failed to load custom camera divisions from localStorage, using defaults:', err);
    return DEFAULT_CAMERA_ZONES;
  }
}

export function saveCameraConfigs(configs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.error('Failed to save camera divisions to localStorage:', err);
  }
}

export function getCameraConfig(configs, sourceId) {
  const id = sourceId || 'crowd.mp4';
  if (configs[id]) return configs[id];
  
  return {
    id,
    cameraName: `Camera Feed — ${id}`,
    facilityZone: 'Monitored Sector',
    description: 'Active video feed source',
    divisions: { ...STANDARD_DIRECTIONAL_DIVISIONS }
  };
}

export function updateDivisionNameInConfigs(configs, sourceId, zoneNum, newName) {
  const current = getCameraConfig(configs, sourceId);
  const updated = {
    ...configs,
    [sourceId]: {
      ...current,
      divisions: {
        ...current.divisions,
        [zoneNum]: newName.trim() || `Zone ${zoneNum}`
      }
    }
  };
  saveCameraConfigs(updated);
  return updated;
}

export function resetCameraDivisionsInConfigs(configs, sourceId) {
  const defaultCfg = DEFAULT_CAMERA_ZONES[sourceId];
  const updated = {
    ...configs,
    [sourceId]: defaultCfg ? { ...defaultCfg } : {
      id: sourceId,
      cameraName: `Camera Feed — ${sourceId}`,
      facilityZone: 'Monitored Sector',
      description: 'Active video feed source',
      divisions: { ...STANDARD_DIRECTIONAL_DIVISIONS }
    }
  };
  saveCameraConfigs(updated);
  return updated;
}
