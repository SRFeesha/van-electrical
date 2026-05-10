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
  light_1: { x: 870, y: 170, label: 'Light 1' },
  light_2: { x: 950, y: 170, label: 'Light 2' },

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
  // PV: panel down to pole 2 top — short shared corridor
  pv_panel_pos_to_breaker: `M ${terminals.pv_out_pos.x} ${terminals.pv_out_pos.y} L ${terminals.pv_out_pos.x} 220 L ${terminals.p2_top_l.x} 220 L ${terminals.p2_top_l.x} ${terminals.p2_top_l.y}`,
  pv_panel_neg_to_breaker: `M ${terminals.pv_out_neg.x} ${terminals.pv_out_neg.y} L ${terminals.pv_out_neg.x} 230 L ${terminals.p2_top_r.x} 230 L ${terminals.p2_top_r.x} ${terminals.p2_top_r.y}`,

  // PV: pole 2 bottom to controller — shared bottom-pv corridor
  breaker_to_controller_pv_pos: `M ${terminals.p2_bot_l.x} ${terminals.p2_bot_l.y} L ${terminals.p2_bot_l.x} 525 L ${terminals.ctrl_pv_pos.x} 525 L ${terminals.ctrl_pv_pos.x} ${terminals.ctrl_pv_pos.y}`,
  breaker_to_controller_pv_neg: `M ${terminals.p2_bot_r.x} ${terminals.p2_bot_r.y} L ${terminals.p2_bot_r.x} 535 L ${terminals.ctrl_pv_neg.x} 535 L ${terminals.ctrl_pv_neg.x} ${terminals.ctrl_pv_neg.y}`,

  // Battery DC: controller BAT+ → pole 1 bottom — shared bottom-dc corridor (y=505)
  controller_bat_pos_to_breaker: `M ${terminals.ctrl_bat_pos.x} ${terminals.ctrl_bat_pos.y} L ${terminals.ctrl_bat_pos.x} 505 L ${terminals.p1_bot_l.x} 505 L ${terminals.p1_bot_l.x} ${terminals.p1_bot_l.y}`,
  // Battery DC: pole 1 top → battery+ (rises above breaker, runs along y=190 corridor reserved for battery, drops down right of breaker)
  breaker_to_battery_pos: `M ${terminals.p1_top_l.x} ${terminals.p1_top_l.y} L ${terminals.p1_top_l.x} 190 L 430 190 L 430 670 L ${terminals.bat_pos.x} 670`,
  // Battery DC: controller BAT- → battery- (mirrors BAT+ corridor at y=515 / x=445)
  controller_bat_neg_to_battery: `M ${terminals.ctrl_bat_neg.x} ${terminals.ctrl_bat_neg.y} L ${terminals.ctrl_bat_neg.x} 515 L 445 515 L 445 670 L ${terminals.bat_neg.x} 670`,
  // Battery DC: battery → inverter — shared bottom corridor at y=695 / y=705
  battery_pos_to_inverter: `M ${terminals.bat_pos.x} ${terminals.bat_pos.y} L ${terminals.bat_pos.x} 695 L ${terminals.inv_dc_pos.x} 695 L ${terminals.inv_dc_pos.x} ${terminals.inv_dc_pos.y}`,
  battery_neg_to_inverter: `M ${terminals.bat_neg.x} ${terminals.bat_neg.y} L ${terminals.bat_neg.x} 705 L ${terminals.inv_dc_neg.x} 705 L ${terminals.inv_dc_neg.x} ${terminals.inv_dc_neg.y}`,

  // AC: SSI 104 AC out → pole 4 TOP (p4_top_l, y=290).
  // Route drops below all components (y=795), runs straight across to pole 4, rises to top terminal.
  inverter_ac_to_breaker: `M ${terminals.inv_ac_out.x} ${terminals.inv_ac_out.y} L ${terminals.inv_ac_out.x} 795 L ${terminals.p4_top_l.x} 795 L ${terminals.p4_top_l.x} ${terminals.p4_top_l.y}`,
  // AC: pole 4 bottom → van sockets / shore connectors.
  // Route exits the breaker downward, sweeps right around the canvas edge, and rises to the shore box.
  breaker_to_shore_l: `M ${terminals.p4_bot_l.x} ${terminals.p4_bot_l.y} L ${terminals.p4_bot_l.x} 450 L 1080 450 L 1080 155 L ${terminals.light_1.x} 155 L ${terminals.light_1.x} ${terminals.light_1.y}`,
  breaker_to_shore_n_pe: `M ${terminals.p4_bot_r.x} ${terminals.p4_bot_r.y} L ${terminals.p4_bot_r.x} 460 L 1090 460 L 1090 145 L ${terminals.light_2.x} 145 L ${terminals.light_2.x} ${terminals.light_2.y}`,
}

export const subsystemColors = {
  pv: '#6B5FCC',
  battery_dc: '#2E8B6B',
  ac: '#C7651D',
}
