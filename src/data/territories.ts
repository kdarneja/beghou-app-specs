// Canonical territory list (ID + name) shared across the app so the same IDs/
// names stay consistent between the Goal Refinement DM view, the RM view's DM1,
// and this admin area (KD's ask). These are DM1's 8 territories.
export interface Territory {
  id: string; // e.g. "0001"
  name: string; // e.g. "Territory 1"
}

export const TERRITORIES: Territory[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1).padStart(4, '0'),
  name: `Territory ${i + 1}`,
}));
