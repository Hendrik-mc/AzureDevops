import { Territory, Continent, Player } from './types';

// Mission:Control team members - https://www.missioncontrol.io/team
export const MC_TEAM = [
  { name: 'Hendrik V.I.', fullName: 'Hendrik Van Iterson', role: 'Founder & CEO', seed: 'HendrikVanIterson' },
  { name: 'Daniel H.', fullName: 'Daniel Hendrikse', role: 'VP Partnerships', seed: 'DanielHendrikse' },
  { name: 'Kingi K.', fullName: 'Kingi Kolczonay', role: 'Chief Product Officer', seed: 'KingiKolczonay' },
  { name: 'Jeroen A.', fullName: 'Jeroen Albus', role: 'Head of Operations', seed: 'JeroenAlbus' },
  { name: 'Dirk S.', fullName: 'Dirk Scholing', role: 'Chief Commercial Officer', seed: 'DirkScholing' },
  { name: 'Jim T.', fullName: 'Jim Taylor', role: 'Creative Director', seed: 'JimTaylor' },
  { name: 'Erwin v.D.', fullName: 'Erwin van Dijk', role: 'Lead QA', seed: 'ErwinVanDijk' },
  { name: 'Mark d.V.', fullName: 'Mark de Vries', role: 'Head of Technology', seed: 'MarkDeVries' },
  { name: 'Koen v.d.M.', fullName: 'Koen van der Meer', role: 'Sr. Software Engineer', seed: 'KoenVanDerMeer' },
  { name: 'Bart v.d.D.', fullName: 'Bart van der Drift', role: 'Data AI Architect', seed: 'BartVanDerDrift' },
  { name: 'Wim G.', fullName: 'Wim Groenendijk', role: 'Lead UX', seed: 'WimGroenendijk' },
  { name: 'Jean-Paul K.', fullName: 'Jean-Paul Kommers', role: 'Sr. Software Engineer', seed: 'JeanPaulKommers' },
];

const PLAYER_COLORS = [
  { color: '#ef4444', colorLight: '#fca5a5', colorDark: '#991b1b' }, // Red
  { color: '#3b82f6', colorLight: '#93c5fd', colorDark: '#1e40af' }, // Blue
  { color: '#22c55e', colorLight: '#86efac', colorDark: '#15803d' }, // Green
  { color: '#eab308', colorLight: '#fde047', colorDark: '#a16207' }, // Yellow
  { color: '#a855f7', colorLight: '#d8b4fe', colorDark: '#7e22ce' }, // Purple
  { color: '#f97316', colorLight: '#fdba74', colorDark: '#c2410c' }, // Orange
];

export function createPlayers(selectedIndices: number[]): Player[] {
  return selectedIndices.map((teamIdx, i) => {
    const member = MC_TEAM[teamIdx];
    const colors = PLAYER_COLORS[i % PLAYER_COLORS.length];
    return {
      id: i,
      name: member.name,
      role: member.role,
      ...colors,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(member.fullName)}&backgroundColor=${colors.color.slice(1)}&textColor=ffffff&fontSize=36`,
      isAI: i > 0, // first player is human by default
      territories: 0,
      troops: 0,
      eliminated: false,
      cards: [],
    };
  });
}

// Default 6 players from leadership
export const DEFAULT_PLAYER_INDICES = [0, 1, 2, 3, 4, 5];

// Gaming-themed continents
export const CONTINENTS: Record<string, Continent> = {
  pixel_plains: {
    id: 'pixel_plains',
    name: 'Pixel Plains',
    bonus: 2,
    color: '#4ade80',
    territories: ['retro_ridge', 'pixel_valley', 'chiptune_coast', 'bitbay'],
  },
  aaa_dominion: {
    id: 'aaa_dominion',
    name: 'AAA Dominion',
    bonus: 5,
    color: '#f87171',
    territories: ['render_summit', 'polygon_peak', 'shader_shores', 'engine_empire', 'texture_tundra'],
  },
  stream_steppes: {
    id: 'stream_steppes',
    name: 'Stream Steppes',
    bonus: 3,
    color: '#a78bfa',
    territories: ['content_canyon', 'subscriber_summit', 'viewer_vale', 'chat_citadel'],
  },
  mobile_frontier: {
    id: 'mobile_frontier',
    name: 'Mobile Frontier',
    bonus: 2,
    color: '#fbbf24',
    territories: ['tap_territory', 'swipe_sands', 'app_archipelago'],
  },
  esports_arena: {
    id: 'esports_arena',
    name: 'Esports Arena',
    bonus: 3,
    color: '#38bdf8',
    territories: ['tournament_tower', 'ranked_reef', 'proplayer_peninsula', 'leaderboard_lagoon'],
  },
  cloud_kingdom: {
    id: 'cloud_kingdom',
    name: 'Cloud Kingdom',
    bonus: 3,
    color: '#fb923c',
    territories: ['server_sanctuary', 'data_delta', 'latency_lake', 'bandwidth_basin'],
  },
};

// Territory definitions with SVG paths for a stylized game map
// Map is 1000x600 viewport
export const TERRITORIES: Record<string, Territory> = {
  // === PIXEL PLAINS (top-left) ===
  retro_ridge: {
    id: 'retro_ridge',
    name: 'Retro Ridge',
    continent: 'pixel_plains',
    neighbors: ['pixel_valley', 'chiptune_coast', 'render_summit'],
    path: 'M 30,30 L 120,20 L 150,60 L 140,110 L 80,120 L 30,90 Z',
    labelX: 85,
    labelY: 70,
    owner: null,
    troops: 0,
  },
  pixel_valley: {
    id: 'pixel_valley',
    name: 'Pixel Valley',
    continent: 'pixel_plains',
    neighbors: ['retro_ridge', 'bitbay', 'render_summit', 'polygon_peak'],
    path: 'M 150,60 L 230,40 L 260,90 L 240,130 L 140,110 Z',
    labelX: 195,
    labelY: 85,
    owner: null,
    troops: 0,
  },
  chiptune_coast: {
    id: 'chiptune_coast',
    name: 'Chiptune Coast',
    continent: 'pixel_plains',
    neighbors: ['retro_ridge', 'bitbay', 'tap_territory'],
    path: 'M 30,90 L 80,120 L 100,180 L 60,210 L 20,180 Z',
    labelX: 58,
    labelY: 155,
    owner: null,
    troops: 0,
  },
  bitbay: {
    id: 'bitbay',
    name: '8-Bit Bay',
    continent: 'pixel_plains',
    neighbors: ['chiptune_coast', 'pixel_valley', 'tap_territory', 'polygon_peak'],
    path: 'M 80,120 L 140,110 L 180,160 L 150,210 L 100,180 Z',
    labelX: 130,
    labelY: 160,
    owner: null,
    troops: 0,
  },

  // === AAA DOMINION (top-center) ===
  render_summit: {
    id: 'render_summit',
    name: 'Render Summit',
    continent: 'aaa_dominion',
    neighbors: ['retro_ridge', 'pixel_valley', 'polygon_peak', 'shader_shores', 'content_canyon'],
    path: 'M 260,20 L 370,15 L 390,70 L 350,110 L 260,90 Z',
    labelX: 320,
    labelY: 60,
    owner: null,
    troops: 0,
  },
  polygon_peak: {
    id: 'polygon_peak',
    name: 'Polygon Peak',
    continent: 'aaa_dominion',
    neighbors: ['pixel_valley', 'bitbay', 'render_summit', 'engine_empire', 'swipe_sands'],
    path: 'M 240,130 L 350,110 L 360,170 L 300,200 L 230,180 Z',
    labelX: 290,
    labelY: 155,
    owner: null,
    troops: 0,
  },
  shader_shores: {
    id: 'shader_shores',
    name: 'Shader Shores',
    continent: 'aaa_dominion',
    neighbors: ['render_summit', 'engine_empire', 'texture_tundra', 'content_canyon'],
    path: 'M 390,70 L 490,50 L 510,110 L 450,140 L 360,120 Z',
    labelX: 435,
    labelY: 95,
    owner: null,
    troops: 0,
  },
  engine_empire: {
    id: 'engine_empire',
    name: 'Engine Empire',
    continent: 'aaa_dominion',
    neighbors: ['polygon_peak', 'shader_shores', 'texture_tundra', 'swipe_sands'],
    path: 'M 350,110 L 450,140 L 440,200 L 370,220 L 300,200 L 360,170 Z',
    labelX: 385,
    labelY: 175,
    owner: null,
    troops: 0,
  },
  texture_tundra: {
    id: 'texture_tundra',
    name: 'Texture Tundra',
    continent: 'aaa_dominion',
    neighbors: ['shader_shores', 'engine_empire', 'content_canyon', 'subscriber_summit'],
    path: 'M 450,140 L 510,110 L 560,150 L 530,210 L 440,200 Z',
    labelX: 495,
    labelY: 170,
    owner: null,
    troops: 0,
  },

  // === STREAM STEPPES (top-right) ===
  content_canyon: {
    id: 'content_canyon',
    name: 'Content Canyon',
    continent: 'stream_steppes',
    neighbors: ['render_summit', 'shader_shores', 'texture_tundra', 'subscriber_summit', 'server_sanctuary'],
    path: 'M 560,30 L 680,20 L 700,80 L 660,130 L 560,100 Z',
    labelX: 625,
    labelY: 70,
    owner: null,
    troops: 0,
  },
  subscriber_summit: {
    id: 'subscriber_summit',
    name: 'Sub Summit',
    continent: 'stream_steppes',
    neighbors: ['content_canyon', 'texture_tundra', 'viewer_vale', 'chat_citadel', 'server_sanctuary'],
    path: 'M 560,100 L 660,130 L 670,190 L 600,220 L 530,210 Z',
    labelX: 600,
    labelY: 165,
    owner: null,
    troops: 0,
  },
  viewer_vale: {
    id: 'viewer_vale',
    name: 'Viewer Vale',
    continent: 'stream_steppes',
    neighbors: ['subscriber_summit', 'chat_citadel', 'data_delta'],
    path: 'M 670,190 L 750,160 L 790,220 L 720,260 L 650,240 Z',
    labelX: 720,
    labelY: 215,
    owner: null,
    troops: 0,
  },
  chat_citadel: {
    id: 'chat_citadel',
    name: 'Chat Citadel',
    continent: 'stream_steppes',
    neighbors: ['subscriber_summit', 'viewer_vale', 'data_delta', 'bandwidth_basin'],
    path: 'M 600,220 L 670,190 L 650,240 L 720,260 L 680,310 L 590,280 Z',
    labelX: 645,
    labelY: 260,
    owner: null,
    troops: 0,
  },

  // === CLOUD KINGDOM (right) ===
  server_sanctuary: {
    id: 'server_sanctuary',
    name: 'Server Sanctuary',
    continent: 'cloud_kingdom',
    neighbors: ['content_canyon', 'subscriber_summit', 'data_delta', 'latency_lake'],
    path: 'M 700,80 L 820,40 L 870,100 L 840,160 L 750,160 Z',
    labelX: 790,
    labelY: 105,
    owner: null,
    troops: 0,
  },
  data_delta: {
    id: 'data_delta',
    name: 'Data Delta',
    continent: 'cloud_kingdom',
    neighbors: ['server_sanctuary', 'viewer_vale', 'chat_citadel', 'latency_lake', 'bandwidth_basin'],
    path: 'M 750,160 L 840,160 L 860,230 L 810,270 L 790,220 Z',
    labelX: 815,
    labelY: 210,
    owner: null,
    troops: 0,
  },
  latency_lake: {
    id: 'latency_lake',
    name: 'Latency Lake',
    continent: 'cloud_kingdom',
    neighbors: ['server_sanctuary', 'data_delta', 'bandwidth_basin', 'ranked_reef'],
    path: 'M 840,160 L 940,130 L 970,210 L 920,270 L 860,230 Z',
    labelX: 905,
    labelY: 200,
    owner: null,
    troops: 0,
  },
  bandwidth_basin: {
    id: 'bandwidth_basin',
    name: 'Bandwidth Basin',
    continent: 'cloud_kingdom',
    neighbors: ['data_delta', 'latency_lake', 'chat_citadel', 'ranked_reef', 'leaderboard_lagoon'],
    path: 'M 810,270 L 920,270 L 940,340 L 860,370 L 780,340 Z',
    labelX: 865,
    labelY: 315,
    owner: null,
    troops: 0,
  },

  // === ESPORTS ARENA (bottom-right) ===
  tournament_tower: {
    id: 'tournament_tower',
    name: 'Tournament Tower',
    continent: 'esports_arena',
    neighbors: ['ranked_reef', 'proplayer_peninsula', 'leaderboard_lagoon', 'app_archipelago'],
    path: 'M 650,380 L 760,360 L 780,420 L 720,460 L 640,440 Z',
    labelX: 710,
    labelY: 415,
    owner: null,
    troops: 0,
  },
  ranked_reef: {
    id: 'ranked_reef',
    name: 'Ranked Reef',
    continent: 'esports_arena',
    neighbors: ['latency_lake', 'bandwidth_basin', 'tournament_tower', 'leaderboard_lagoon'],
    path: 'M 780,340 L 940,340 L 930,410 L 850,430 L 780,420 L 760,360 Z',
    labelX: 855,
    labelY: 385,
    owner: null,
    troops: 0,
  },
  proplayer_peninsula: {
    id: 'proplayer_peninsula',
    name: 'Pro Peninsula',
    continent: 'esports_arena',
    neighbors: ['tournament_tower', 'leaderboard_lagoon'],
    path: 'M 720,460 L 830,450 L 870,520 L 790,560 L 700,530 Z',
    labelX: 785,
    labelY: 505,
    owner: null,
    troops: 0,
  },
  leaderboard_lagoon: {
    id: 'leaderboard_lagoon',
    name: 'Leaderboard Lagoon',
    continent: 'esports_arena',
    neighbors: ['tournament_tower', 'ranked_reef', 'proplayer_peninsula', 'bandwidth_basin'],
    path: 'M 780,420 L 850,430 L 870,480 L 830,450 L 720,460 Z',
    labelX: 800,
    labelY: 448,
    owner: null,
    troops: 0,
  },

  // === MOBILE FRONTIER (bottom-left) ===
  tap_territory: {
    id: 'tap_territory',
    name: 'Tap Territory',
    continent: 'mobile_frontier',
    neighbors: ['chiptune_coast', 'bitbay', 'swipe_sands', 'app_archipelago'],
    path: 'M 20,250 L 120,230 L 160,300 L 130,370 L 40,350 Z',
    labelX: 90,
    labelY: 300,
    owner: null,
    troops: 0,
  },
  swipe_sands: {
    id: 'swipe_sands',
    name: 'Swipe Sands',
    continent: 'mobile_frontier',
    neighbors: ['tap_territory', 'polygon_peak', 'engine_empire', 'app_archipelago'],
    path: 'M 120,230 L 230,180 L 300,200 L 320,280 L 230,320 L 160,300 Z',
    labelX: 225,
    labelY: 265,
    owner: null,
    troops: 0,
  },
  app_archipelago: {
    id: 'app_archipelago',
    name: 'App Archipelago',
    continent: 'mobile_frontier',
    neighbors: ['tap_territory', 'swipe_sands', 'tournament_tower'],
    path: 'M 130,370 L 230,320 L 380,340 L 500,380 L 640,440 L 580,500 L 400,530 L 200,510 L 80,470 L 40,400 Z',
    labelX: 340,
    labelY: 440,
    owner: null,
    troops: 0,
  },
};
