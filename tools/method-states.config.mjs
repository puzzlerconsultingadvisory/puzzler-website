// Single source of truth for The Puzzler Method visual states.
// Consumed by build-method-states.mjs, which derives:
//   - website-assets/blueprint/method/method-state-01..07-*.svg  (static exports)
//   - website-assets/blueprint/method/method-complete-static.svg (fallback)
//   - website-assets/blueprint/method/method-states.css          (page stylesheet)
// from the grouped master puzzler-method-master.svg. Values are group opacities.
//
// The seven step names are locked content and must not be renamed or reordered.

export const LAYERS = [
  'g-grid', 'g-marks', 'g-corners', 'g-edge', 'g-frame', 'g-groups', 'g-cells',
  'g-nodes', 'g-cues', 'g-ruler', 'g-checkpoint', 'g-risk', 'g-correction', 'g-complete',
];

// Every layer not listed for a state is hidden (opacity 0).
export const STATES = [
  {
    n: 1, slug: 'edge', name: 'Start With The Edge',
    shown: 'Outside boundaries and corner relationships traced',
    layers: { 'g-grid': 1, 'g-marks': 1, 'g-ruler': 1, 'g-corners': 1, 'g-edge': 1, 'g-cells': 0.12 },
  },
  {
    n: 2, slug: 'frame', name: 'Build The Frame',
    shown: 'Stable, complete perimeter',
    layers: { 'g-grid': 1, 'g-marks': 1, 'g-ruler': 1, 'g-corners': 0.8, 'g-frame': 1, 'g-cells': 0.25, 'g-nodes': 0.25 },
  },
  {
    n: 3, slug: 'sort', name: 'Sort The Pieces',
    shown: 'Interior areas organized into working groups without flying pieces',
    layers: { 'g-grid': 1, 'g-marks': 1, 'g-ruler': 1, 'g-corners': 0.6, 'g-frame': 1, 'g-groups': 1, 'g-cells': 1, 'g-nodes': 0.5 },
  },
  {
    n: 4, slug: 'visual-cues', name: 'Use Visual Cues',
    shown: 'Selected relationships and paths clarified',
    layers: { 'g-grid': 1, 'g-marks': 1, 'g-ruler': 1, 'g-corners': 0.6, 'g-frame': 1, 'g-groups': 0.35, 'g-cells': 0.6, 'g-nodes': 0.35, 'g-cues': 1 },
  },
  {
    n: 5, slug: 'take-breaks', name: 'Take Breaks',
    shown: 'Motion stopped at a visible checkpoint',
    layers: { 'g-grid': 1, 'g-marks': 1, 'g-ruler': 1, 'g-corners': 0.5, 'g-frame': 0.55, 'g-groups': 0.2, 'g-cells': 0.5, 'g-nodes': 0.35, 'g-cues': 0.3, 'g-checkpoint': 1 },
  },
  {
    n: 6, slug: 'whole-picture', name: 'Avoid Common Mistakes / Don’t Get Stuck On One Piece',
    shown: 'Entire diagram restored to equal visibility so no area dominates',
    layers: { 'g-grid': 1, 'g-marks': 1, 'g-ruler': 1, 'g-corners': 0.6, 'g-frame': 1, 'g-cells': 1, 'g-nodes': 0.7 },
  },
  {
    n: 7, slug: 'risk-correction', name: 'Risk Correction',
    shown: 'One unstable connection identified, corrected, and returned to a durable state',
    layers: { 'g-grid': 1, 'g-marks': 1, 'g-ruler': 1, 'g-corners': 0.6, 'g-frame': 1, 'g-cells': 1, 'g-nodes': 0.7, 'g-risk': 1, 'g-correction': 1 },
  },
];

export const COMPLETE = {
  slug: 'complete-static', name: 'Complete',
  shown: 'Final stable diagram',
  layers: { 'g-grid': 1, 'g-marks': 1, 'g-ruler': 1, 'g-corners': 0.6, 'g-frame': 1, 'g-cells': 1, 'g-complete': 1 },
};

export const PHASES = [
  { name: 'Start With The Edge', steps: [1, 2, 3] },
  { name: 'Sort and Build', steps: [4, 5, 6] },
  { name: 'Activate and Sustain', steps: [7] },
];
