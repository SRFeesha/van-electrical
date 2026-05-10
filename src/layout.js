// Visual layout for the schematic SVG.
// Positions and paths are visual concerns, kept separate from schema.json (which is the semantic source of truth).

export const CANVAS = { w: 1100, h: 820 }

// Component bounding boxes in SVG space
export const components = {
  photovoltaic: { x: 470, y: 50, w: 180, h: 120, label: 'Photovoltaic' },
  shore: { x: 820, y: 50, w: 180, h: 120, label: 'Shore' },
  circuit_breaker: { x: 460, y: 240, w: 600, h: 200, label: 'Circuit breaker' },
  controller: { x: 40, y: 360, w: 380, h: 130, label: 'Controller' },
  inverter: { x: 80, y: 600, w: 280, h: 180, label: 'Inverter' },
  battery: { x: 540, y: 620, w: 240, h: 130, label: 'Battery' },
}

// Pole sub-rectangles inside circuit breaker
const pole = (idx) => {
  const baseX = 480
  const w = 140
  const gap = 5
  return baseX + idx * (w + gap)
}

export const breakerPoles = [
  { id: 'pole_1', x: pole(0), y: 260, w: 140, h: 160 },
  { id: 'pole_2', x: pole(1), y: 260, w: 140, h: 160 },
  { id: 'pole_3', x: pole(2), y: 260, w: 140, h: 160 },
  { id: 'pole_4', x: pole(3), y: 260, w: 140, h: 160 },
]

// Terminal positions in SVG coordinates
// Used both for connection endpoints AND clickable dots
export const terminals = {
  // Photovoltaic
  pv_out_pos: { x: 540, y: 170, label: 'PV+' },
  pv_out_neg: { x: 580, y: 170, label: 'PV-' },

  // Shore
  light: { x: 910, y: 170, label: 'Light' },

  // Breaker pole 1 (BAT)
  p1_top_l: { x: pole(0) + 35, y: 290, label: 'BatLith+' },
  p1_top_r: { x: pole(0) + 105, y: 290, label: 'N/A' },
  p1_bot_l: { x: pole(0) + 35, y: 390, label: 'BAT+' },
  p1_bot_r: { x: pole(0) + 105, y: 390, label: 'N/A' },

  // Breaker pole 2 (PV)
  p2_top_l: { x: pole(1) + 35, y: 290, label: 'PV (?)' },
  p2_top_r: { x: pole(1) + 105, y: 290, label: 'PV (?)' },
  p2_bot_l: { x: pole(1) + 35, y: 390, label: 'PV+' },
  p2_bot_r: { x: pole(1) + 105, y: 390, label: 'PV-' },

  // Breaker pole 3 (LOAD - unused)
  p3_top_l: { x: pole(2) + 35, y: 290, label: 'LOAD+' },
  p3_top_r: { x: pole(2) + 105, y: 290, label: 'LOAD-' },
  p3_bot_l: { x: pole(2) + 35, y: 390, label: 'N/A' },
  p3_bot_r: { x: pole(2) + 105, y: 390, label: 'N/A' },

  // Breaker pole 4 (AC)
  p4_top_l: { x: pole(3) + 35, y: 290, label: 'Black+Brown' },
  p4_top_r: { x: pole(3) + 105, y: 290, label: 'Gn/Yl+Gray' },
  p4_bot_l: { x: pole(3) + 35, y: 390, label: '2x Brown' },
  p4_bot_r: { x: pole(3) + 105, y: 390, label: '2x Wh+Bl' },

  // Controller
  ctrl_pv_pos: { x: 80, y: 430, label: 'PV+' },
  ctrl_pv_neg: { x: 130, y: 430, label: 'PV-' },
  ctrl_bat_pos: { x: 180, y: 430, label: 'BAT+' },
  ctrl_bat_neg: { x: 230, y: 430, label: 'BAT-' },
  ctrl_load_pos: { x: 290, y: 430, label: 'LOAD+' },
  ctrl_load_neg: { x: 340, y: 430, label: 'LOAD-' },

  // Battery
  bat_pos: { x: 740, y: 670, label: '+' },
  bat_neg: { x: 660, y: 670, label: '-' },

  // Inverter
  inv_dc_pos: { x: 240, y: 660, label: '+' },
  inv_dc_neg: { x: 170, y: 660, label: '-' },
  inv_ac_out: { x: 200, y: 740, label: '220V' },
}

// Wire path drawings. Each connection id maps to an SVG path string.
//
// Corridor convention:
//   - Top horizontal corridors (above the breaker): AC at y=200 / y=210, PV at y=220 / y=230.
//   - Bottom corridors (below the breaker, above controller): PV at y=525 / y=535,
//     battery DC at y=505 / y=515.
//   - Below all components: battery DC at y=695 / y=705.
//   - Inverter-AC riser uses y=410 to clip into pole 4 from the breaker's left edge.
// Wires within the same subsystem leaving the same component share a corridor
// (e.g. PV+/PV- run side-by-side rather than splaying out).
export const wirePaths = {
  pv_panel_pos_to_breaker: `M 540 170 L 540 220 L 660 220 L 660 290`,
  pv_panel_neg_to_breaker: `M 580 170 L 580 230 L 730 230 L 730 290`,
  breaker_to_controller_pv_pos: `M 660 390 L 660 525 L 80 525 L 80 430`,
  breaker_to_controller_pv_neg: `M 730 390 L 730 535 L 130 535 L 130 430`,
  controller_bat_pos_to_breaker: `M 180 430 L 180 505 L 515 505 L 515 390`,
  breaker_to_battery_pos: `M 515 290 L 515 190 L 430 190 L 430 690 L 740 670`,
  controller_bat_neg_to_battery: `M 230 430 L 230 515 L 445 515 L 445 655 L 660 670`,
  battery_pos_to_inverter: `M 740 670 L 740 605 L 240 605 L 240 660`,
  battery_neg_to_inverter: `M 660 670 L 660 620 L 170 620 L 170 660`,
  inverter_ac_to_breaker: `M 200 740 L 200 795 L 915 795 L 950 290`,
  breaker_to_shore: `M 950 390 L 950 450 L 1080 450 L 1080 190 L 910 190 L 910 170`,
  breaker_to_shore_r: `M 1020 390 L 1020 450 L 950 450`,
}

export const subsystemColors = {
  pv: '#6B5FCC',
  battery_dc: '#2E8B6B',
  ac: '#C7651D',
}
