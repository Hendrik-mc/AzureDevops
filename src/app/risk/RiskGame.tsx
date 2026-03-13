'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GamePhase, DiceResult } from './types';
import { CONTINENTS, MC_TEAM, DEFAULT_PLAYER_INDICES, createPlayers } from './gameData';
import {
  initializeGame,
  placeTroop,
  attack,
  fortify,
  endPhase,
  executeAITurn,
  areConnected,
} from './gameLogic';

// ============================================================
// GTA 6 VICE CITY COLOR PALETTE
// ============================================================
const VC = {
  pink: '#ff2d78',
  cyan: '#00e5ff',
  orange: '#ff6b2b',
  purple: '#b44dff',
  yellow: '#ffd23f',
  teal: '#00c9a7',
  magenta: '#ff00ff',
  skyTop: '#0b0033',
  skyMid: '#1a0044',
  skyBot: '#4a0060',
  ocean: '#091428',
  sand: '#2a1a0a',
  neonPink: '#ff69b4',
  neonCyan: '#00ffff',
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

function Avatar({ src, size = 40, border }: { src: string; size?: number; border: string }) {
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        border: `2px solid ${border}`,
        boxShadow: `0 0 10px ${border}60`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${basePath}${src}`} alt="" width={size} height={size} className="w-full h-full object-cover" />
    </div>
  );
}

function DiceFace({ value, color }: { value: number; color: string }) {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[20, 20]],
    2: [[10, 10], [30, 30]],
    3: [[10, 10], [20, 20], [30, 30]],
    4: [[10, 10], [30, 10], [10, 30], [30, 30]],
    5: [[10, 10], [30, 10], [20, 20], [10, 30], [30, 30]],
    6: [[10, 10], [30, 10], [10, 20], [30, 20], [10, 30], [30, 30]],
  };

  return (
    <svg width="44" height="44" viewBox="0 0 40 40">
      <rect x="1" y="1" width="38" height="38" rx="6" fill={color} stroke={VC.neonCyan} strokeWidth="1" />
      {(dotPositions[value] || []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#fff" />
      ))}
    </svg>
  );
}

function DiceDisplay({ result }: { result: DiceResult }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border"
      style={{ background: 'rgba(0,0,0,0.8)', borderColor: VC.pink + '40', boxShadow: `0 0 30px ${VC.pink}30` }}>
      <div>
        <div className="text-[10px] uppercase tracking-widest mb-1 font-bold" style={{ color: VC.pink }}>Attacker</div>
        <div className="flex gap-1">
          {result.attacker.map((v, i) => <DiceFace key={i} value={v} color="#8b0000" />)}
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: VC.yellow }}>VS</div>
      <div>
        <div className="text-[10px] uppercase tracking-widest mb-1 font-bold" style={{ color: VC.cyan }}>Defender</div>
        <div className="flex gap-1">
          {result.defender.map((v, i) => <DiceFace key={i} value={v} color="#003366" />)}
        </div>
      </div>
    </div>
  );
}

function PhaseIndicator({ phase, onEndPhase }: { phase: GamePhase; onEndPhase: () => void }) {
  const phases: { id: GamePhase; label: string }[] = [
    { id: 'draft', label: 'DEPLOY' },
    { id: 'attack', label: 'ATTACK' },
    { id: 'fortify', label: 'FORTIFY' },
  ];

  return (
    <div className="flex items-center gap-1">
      {phases.map((p) => {
        const isActive = phase === p.id;
        const activeColor = p.id === 'draft' ? VC.teal : p.id === 'attack' ? VC.pink : VC.cyan;
        return (
          <button
            key={p.id}
            onClick={() => {
              if ((phase === 'attack' && p.id === 'fortify') || (phase === 'fortify' && p.id === 'fortify')) {
                onEndPhase();
              }
            }}
            className="px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all"
            style={{
              background: isActive ? activeColor : 'transparent',
              color: isActive ? '#000' : activeColor + '60',
              borderRadius: '2px',
              boxShadow: isActive ? `0 0 20px ${activeColor}60` : 'none',
              textShadow: isActive ? 'none' : `0 0 10px ${activeColor}30`,
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function PlayerCard({
  player,
  isActive,
  continentBonuses,
}: {
  player: GameState['players'][0];
  isActive: boolean;
  continentBonuses: string[];
}) {
  return (
    <div
      className={`relative flex items-center gap-2 px-3 py-2 transition-all ${
        player.eliminated ? 'opacity-20' : ''
      }`}
      style={{
        background: isActive ? `linear-gradient(135deg, ${player.color}15, transparent)` : 'transparent',
        borderLeft: isActive ? `3px solid ${VC.pink}` : '3px solid transparent',
        boxShadow: isActive ? `inset 0 0 30px ${player.color}10` : 'none',
      }}
    >
      {isActive && (
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: VC.pink }} />
      )}
      <Avatar src={player.avatar} size={38} border={isActive ? VC.pink : player.color + '80'} />
      <div className="min-w-0">
        <div className="text-xs font-bold truncate" style={{ color: isActive ? VC.pink : '#fff' }}>{player.name}</div>
        <div className="text-[10px] truncate" style={{ color: VC.cyan + '60' }}>{player.role}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: VC.yellow }}>
            {player.territories} <span style={{ color: '#ffffff40' }}>turf</span>
          </span>
          <span className="text-[10px]" style={{ color: VC.orange }}>
            {player.troops} <span style={{ color: '#ffffff40' }}>crew</span>
          </span>
        </div>
        {continentBonuses.length > 0 && (
          <div className="text-[9px] truncate mt-0.5" style={{ color: VC.teal }}>
            +{continentBonuses.join(', ')}
          </div>
        )}
      </div>
      {player.isAI && (
        <div className="text-[8px] px-1 rounded absolute top-0.5 right-0.5"
          style={{ color: VC.purple + '80', background: VC.purple + '15' }}>BOT</div>
      )}
    </div>
  );
}

function ContinentLegend({ continents }: { continents: Record<string, { name: string; bonus: number; color: string }> }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {Object.values(continents).map((c) => (
        <div key={c.name} className="flex items-center gap-1">
          <div className="w-2 h-2" style={{ backgroundColor: c.color, boxShadow: `0 0 4px ${c.color}` }} />
          <span className="text-[9px] uppercase tracking-wider" style={{ color: c.color + 'aa' }}>{c.name}</span>
          <span className="text-[8px]" style={{ color: VC.yellow + '80' }}>+{c.bonus}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// GTA 6 VICE CITY MAP
// ============================================================

function PalmTree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`} opacity="0.25">
      <line x1="0" y1="0" x2="0" y2="25" stroke="#3a2a1a" strokeWidth="2" />
      <path d="M0,0 Q-12,-8 -18,-2" stroke="#1a5a2a" strokeWidth="2" fill="none" />
      <path d="M0,0 Q12,-8 18,-2" stroke="#1a5a2a" strokeWidth="2" fill="none" />
      <path d="M0,0 Q-8,-12 -14,-8" stroke="#2a7a3a" strokeWidth="1.5" fill="none" />
      <path d="M0,0 Q8,-12 14,-8" stroke="#2a7a3a" strokeWidth="1.5" fill="none" />
      <path d="M0,0 Q0,-14 -4,-12" stroke="#2a7a3a" strokeWidth="1.5" fill="none" />
    </g>
  );
}

function GameMap({
  state,
  onTerritoryClick,
  hoveredTerritory,
  setHoveredTerritory,
}: {
  state: GameState;
  onTerritoryClick: (id: string) => void;
  hoveredTerritory: string | null;
  setHoveredTerritory: (id: string | null) => void;
}) {
  const { territories, players, selectedTerritory, targetTerritory, phase, currentPlayer } = state;

  // Connection lines
  const connections: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  const seen = new Set<string>();
  Object.values(territories).forEach((t) => {
    t.neighbors.forEach((nId) => {
      const key = [t.id, nId].sort().join('-');
      if (!seen.has(key)) {
        seen.add(key);
        const n = territories[nId];
        connections.push({ x1: t.labelX, y1: t.labelY, x2: n.labelX, y2: n.labelY, key });
      }
    });
  });

  return (
    <svg viewBox="0 0 1000 580" className="w-full h-full">
      <defs>
        {/* Sunset sky gradient */}
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b0025" />
          <stop offset="30%" stopColor="#1a003a" />
          <stop offset="60%" stopColor="#3a0050" />
          <stop offset="80%" stopColor="#6a1060" />
          <stop offset="90%" stopColor="#c04060" />
          <stop offset="95%" stopColor="#ff6b40" />
          <stop offset="100%" stopColor="#ffaa30" />
        </linearGradient>
        {/* Ocean gradient */}
        <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#091830" />
          <stop offset="100%" stopColor="#040c18" />
        </linearGradient>
        {/* Neon glow filters */}
        <filter id="neonGlow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="neonGlowStrong">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="troopGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Road pattern */}
        <pattern id="roadDash" width="8" height="1" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0.5" x2="4" y2="0.5" stroke={VC.yellow + '30'} strokeWidth="0.5" />
        </pattern>
        {/* Water ripple */}
        <pattern id="waterRipple" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 20 Q10 18 20 20 Q30 22 40 20" fill="none" stroke={VC.cyan + '06'} strokeWidth="0.5" />
          <path d="M0 30 Q10 28 20 30 Q30 32 40 30" fill="none" stroke={VC.cyan + '04'} strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* === SKY BACKGROUND === */}
      <rect width="1000" height="180" fill="url(#skyGrad)" />
      {/* Sun */}
      <circle cx="500" cy="170" r="50" fill="#ff6b40" opacity="0.6" />
      <circle cx="500" cy="170" r="40" fill="#ffaa30" opacity="0.4" />
      <circle cx="500" cy="170" r="25" fill="#ffd23f" opacity="0.3" />
      {/* Horizon line */}
      <line x1="0" y1="180" x2="1000" y2="180" stroke={VC.pink + '30'} strokeWidth="1" />

      {/* === OCEAN === */}
      <rect y="180" width="1000" height="400" fill="url(#oceanGrad)" />
      <rect y="180" width="1000" height="400" fill="url(#waterRipple)" />

      {/* Distant city skyline silhouette */}
      <g opacity="0.15">
        <rect x="100" y="145" width="15" height="35" fill="#1a0030" />
        <rect x="120" y="155" width="10" height="25" fill="#1a0030" />
        <rect x="140" y="140" width="20" height="40" fill="#1a0030" />
        <rect x="200" y="150" width="12" height="30" fill="#1a0030" />
        <rect x="750" y="148" width="18" height="32" fill="#1a0030" />
        <rect x="780" y="155" width="10" height="25" fill="#1a0030" />
        <rect x="820" y="142" width="22" height="38" fill="#1a0030" />
        <rect x="860" y="152" width="14" height="28" fill="#1a0030" />
      </g>

      {/* === PALM TREES along edges === */}
      <PalmTree x={15} y={200} scale={0.8} />
      <PalmTree x={55} y={215} />
      <PalmTree x={960} y={195} scale={0.9} />
      <PalmTree x={930} y={210} scale={0.7} />
      <PalmTree x={480} y={555} scale={0.8} />
      <PalmTree x={520} y={560} />
      <PalmTree x={20} y={450} scale={0.7} />
      <PalmTree x={970} y={480} scale={0.8} />

      {/* === ROAD CONNECTIONS (neon style) === */}
      {connections.map((c) => (
        <g key={c.key}>
          {/* Road glow */}
          <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke={VC.cyan + '08'} strokeWidth="6" />
          {/* Road line */}
          <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke={VC.cyan + '15'} strokeWidth="2" />
          {/* Center dashes */}
          <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke={VC.yellow + '20'} strokeWidth="0.5" strokeDasharray="4 4" />
        </g>
      ))}

      {/* === CONTINENT NEON LABELS === */}
      {Object.values(CONTINENTS).map((continent) => {
        const contTerritories = continent.territories.map((id) => territories[id]);
        const avgX = contTerritories.reduce((s, t) => s + t.labelX, 0) / contTerritories.length;
        const minY = Math.min(...contTerritories.map((t) => t.labelY)) - 32;
        return (
          <g key={continent.id + '-label'}>
            <text x={avgX} y={minY} textAnchor="middle" fill={continent.color}
              fontSize="11" fontWeight="900" letterSpacing="3" fontFamily="Impact, sans-serif"
              filter="url(#neonGlow)" style={{ pointerEvents: 'none' }}>
              {continent.name.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* === TERRITORY SHAPES === */}
      {Object.values(territories).map((territory) => {
        const owner = territory.owner !== null ? players[territory.owner] : null;
        const isSelected = selectedTerritory === territory.id;
        const isTarget = targetTerritory === territory.id;
        const isHovered = hoveredTerritory === territory.id;

        let isValidTarget = false;
        if (phase === 'draft' && territory.owner === currentPlayer) {
          isValidTarget = true;
        } else if (phase === 'attack' && selectedTerritory) {
          const sel = territories[selectedTerritory];
          isValidTarget = territory.owner !== currentPlayer && sel.neighbors.includes(territory.id);
        } else if (phase === 'attack' && !selectedTerritory && territory.owner === currentPlayer && territory.troops > 1) {
          isValidTarget = true;
        } else if (phase === 'fortify' && territory.owner === currentPlayer) {
          isValidTarget = true;
        }

        const baseAlpha = isSelected ? 'aa' : isHovered && isValidTarget ? '88' : '44';
        const fillColor = owner ? owner.color + baseAlpha : '#222222aa';
        const neonColor = isSelected ? VC.pink : isTarget ? VC.orange : isHovered && isValidTarget ? VC.cyan : (owner ? owner.color : '#444');
        const strokeWidth = isSelected || isTarget ? 2.5 : isHovered ? 2 : 1;

        return (
          <g key={territory.id}>
            {/* Territory neon outer glow */}
            {(isSelected || isTarget) && (
              <path d={territory.path} fill="none" stroke={neonColor + '40'} strokeWidth="8"
                filter="url(#neonGlowStrong)" />
            )}
            {/* Territory fill */}
            <path
              d={territory.path}
              fill={fillColor}
              stroke={neonColor + (isSelected || isTarget ? 'ff' : isHovered ? 'cc' : '60')}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              className={`transition-all duration-150 ${isValidTarget ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={() => onTerritoryClick(territory.id)}
              onMouseEnter={() => setHoveredTerritory(territory.id)}
              onMouseLeave={() => setHoveredTerritory(null)}
            />
          </g>
        );
      })}

      {/* === TERRITORY LABELS & TROOP BADGES === */}
      {Object.values(territories).map((territory) => {
        const owner = territory.owner !== null ? players[territory.owner] : null;

        return (
          <g key={territory.id + '-label'}>
            {/* Neon territory name */}
            <text x={territory.labelX} y={territory.labelY - 14} textAnchor="middle"
              fill={VC.neonCyan + 'aa'} fontSize="7.5" fontWeight="700"
              fontFamily="Impact, sans-serif" letterSpacing="0.5"
              style={{ pointerEvents: 'none' }}>
              {territory.name.toUpperCase()}
            </text>

            {/* Troop count - neon badge */}
            {territory.troops > 0 && (
              <>
                {/* Glow circle */}
                <circle cx={territory.labelX} cy={territory.labelY + 4} r="14"
                  fill={owner ? owner.color + '20' : '#33333320'}
                  stroke={owner ? owner.color : '#666'} strokeWidth="1.5"
                  filter="url(#troopGlow)" />
                {/* Inner solid */}
                <circle cx={territory.labelX} cy={territory.labelY + 4} r="11"
                  fill={owner ? owner.colorDark : '#222'} />
                {/* Troop number */}
                <text x={territory.labelX} y={territory.labelY + 8} textAnchor="middle"
                  fill="#fff" fontSize="12" fontWeight="900"
                  fontFamily="Impact, sans-serif"
                  style={{ pointerEvents: 'none' }}>
                  {territory.troops}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* === GTA-STYLE DECORATIVE ELEMENTS === */}
      {/* Corner art deco lines */}
      <g opacity="0.15" stroke={VC.pink} strokeWidth="1">
        <line x1="10" y1="10" x2="60" y2="10" />
        <line x1="10" y1="10" x2="10" y2="60" />
        <line x1="10" y1="14" x2="40" y2="14" />
        <line x1="14" y1="10" x2="14" y2="40" />
        <line x1="990" y1="10" x2="940" y2="10" />
        <line x1="990" y1="10" x2="990" y2="60" />
        <line x1="990" y1="14" x2="960" y2="14" />
        <line x1="986" y1="10" x2="986" y2="40" />
        <line x1="10" y1="570" x2="60" y2="570" />
        <line x1="10" y1="570" x2="10" y2="520" />
        <line x1="990" y1="570" x2="940" y2="570" />
        <line x1="990" y1="570" x2="990" y2="520" />
      </g>
    </svg>
  );
}

// ============================================================
// SETUP SCREEN - GTA 6 STYLE
// ============================================================

function SetupScreen({ onStart }: { onStart: (playerIndices: number[], playerCount: number) => void }) {
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>(DEFAULT_PLAYER_INDICES);
  const [playerCount, setPlayerCount] = useState(4);

  const togglePlayer = (idx: number) => {
    if (selectedPlayers.includes(idx)) {
      if (selectedPlayers.length > 2) {
        setSelectedPlayers(selectedPlayers.filter((i) => i !== idx));
      }
    } else if (selectedPlayers.length < 6) {
      setSelectedPlayers([...selectedPlayers, idx]);
    }
  };

  useEffect(() => {
    setPlayerCount(selectedPlayers.length);
  }, [selectedPlayers]);

  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: `linear-gradient(180deg, ${VC.skyTop} 0%, ${VC.skyMid} 40%, ${VC.skyBot} 70%, #c04060 90%, #ff6b40 100%)`,
    }}>
      <div className="max-w-3xl w-full">
        {/* GTA-Style Logo */}
        <div className="text-center mb-10">
          <h1 className="text-7xl font-black tracking-tighter" style={{
            fontFamily: 'Impact, sans-serif',
            color: VC.pink,
            textShadow: `0 0 40px ${VC.pink}80, 0 0 80px ${VC.pink}40, 0 4px 0 #800030`,
            letterSpacing: '-2px',
          }}>
            RISK
          </h1>
          <div className="flex items-center justify-center gap-3 mt-1">
            <div className="h-px w-20" style={{ background: `linear-gradient(to right, transparent, ${VC.cyan})` }} />
            <span className="text-sm uppercase font-black" style={{
              fontFamily: 'Impact, sans-serif',
              color: VC.cyan,
              letterSpacing: '6px',
              textShadow: `0 0 20px ${VC.cyan}60`,
            }}>
              Vice City Edition
            </span>
            <div className="h-px w-20" style={{ background: `linear-gradient(to left, transparent, ${VC.cyan})` }} />
          </div>
          <p className="mt-4 text-sm" style={{ color: VC.neonPink + '80' }}>
            Choose your crew. Conquer the strip.
          </p>
        </div>

        {/* Player selection grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
          {MC_TEAM.map((member, idx) => {
            const isSelected = selectedPlayers.includes(idx);
            const orderIdx = selectedPlayers.indexOf(idx);

            return (
              <button
                key={idx}
                onClick={() => togglePlayer(idx)}
                className={`relative p-3 rounded-lg transition-all text-center ${
                  isSelected ? 'scale-105' : 'opacity-40 hover:opacity-60'
                }`}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${COLORS[orderIdx]}20, transparent)`
                    : 'rgba(0,0,0,0.3)',
                  border: isSelected ? `1px solid ${COLORS[orderIdx]}80` : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isSelected ? `0 0 25px ${COLORS[orderIdx]}30` : 'none',
                }}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-black"
                    style={{ backgroundColor: COLORS[orderIdx], boxShadow: `0 0 10px ${COLORS[orderIdx]}` }}>
                    {orderIdx + 1}
                  </div>
                )}
                <div className="mx-auto mb-2">
                  <Avatar src={member.avatar} size={56} border={isSelected ? COLORS[orderIdx] : '#333'} />
                </div>
                <div className="text-white text-xs font-bold truncate">{member.fullName}</div>
                <div className="text-[10px] truncate" style={{ color: VC.cyan + '80' }}>{member.role}</div>
              </button>
            );
          })}
        </div>

        {/* Start button */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm" style={{ color: VC.cyan + '60' }}>
            {selectedPlayers.length} crew members selected
          </div>
          <button
            onClick={() => onStart(selectedPlayers, playerCount)}
            disabled={selectedPlayers.length < 2}
            className="px-10 py-3 font-black text-lg uppercase tracking-wider transition-all active:scale-95
              disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              fontFamily: 'Impact, sans-serif',
              background: `linear-gradient(135deg, ${VC.pink}, ${VC.orange})`,
              color: '#fff',
              borderRadius: '2px',
              boxShadow: `0 0 30px ${VC.pink}50, 0 0 60px ${VC.pink}20`,
              letterSpacing: '3px',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            Start Conquest
          </button>
        </div>

        <div className="text-center mt-8">
          <p className="text-[10px]" style={{ color: VC.pink + '40' }}>
            Featuring the Mission:Control team — missioncontrol.io
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN GAME COMPONENT
// ============================================================

export default function RiskGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hoveredTerritory, setHoveredTerritory] = useState<string | null>(null);
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [fortifyTroops, setFortifyTroops] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const aiPlayingRef = useRef(false);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = useCallback((playerIndices: number[], playerCount: number) => {
    const state = initializeGame(playerCount);
    const selectedPlayers = createPlayers(playerIndices);
    state.players = selectedPlayers;

    const territoryIds = Object.keys(state.territories);
    const shuffled = territoryIds.sort(() => Math.random() - 0.5);
    shuffled.forEach((id, index) => {
      const playerIndex = index % playerCount;
      state.territories[id].owner = playerIndex;
      state.territories[id].troops = 1 + Math.floor(Math.random() * 3);
    });

    state.players.forEach((p) => {
      const owned = Object.values(state.territories).filter((t) => t.owner === p.id);
      p.territories = owned.length;
      p.troops = owned.reduce((s, t) => s + t.troops, 0);
    });

    const ownedCount = Object.values(state.territories).filter((t) => t.owner === 0).length;
    let draft = Math.max(3, Math.floor(ownedCount / 3));
    Object.values(state.continents).forEach((c) => {
      if (c.territories.every((tid) => state.territories[tid].owner === 0)) draft += c.bonus;
    });
    state.troopsToDraft = draft;
    state.message = `${state.players[0].name}'s turn — Deploy ${draft} troops`;

    setGameState(state);
    setShowSetup(false);
  }, []);

  // AI turn handler - uses refs to avoid cleanup killing the chain
  const runAITurn = useCallback((state: GameState) => {
    if (aiPlayingRef.current) return;
    aiPlayingRef.current = true;
    setIsAIPlaying(true);

    const aiSteps = executeAITurn(state);

    if (aiSteps.length === 0) {
      aiPlayingRef.current = false;
      setIsAIPlaying(false);
      return;
    }

    let stepIndex = 0;
    const playStep = () => {
      if (stepIndex < aiSteps.length) {
        const step = aiSteps[stepIndex];
        setGameState(step);
        stepIndex++;
        aiTimeoutRef.current = setTimeout(playStep, 250);
      } else {
        aiPlayingRef.current = false;
        setIsAIPlaying(false);
      }
    };
    aiTimeoutRef.current = setTimeout(playStep, 400);
  }, []);

  // Trigger AI turns when it's their move
  useEffect(() => {
    if (!gameState || gameState.phase === 'gameover') return;
    if (aiPlayingRef.current) return;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer.isAI) return;

    // Small delay before AI starts
    const t = setTimeout(() => runAITurn(gameState), 200);
    return () => clearTimeout(t);
  }, [gameState, runAITurn]);

  const handleTerritoryClick = useCallback(
    (territoryId: string) => {
      if (!gameState || isAIPlaying) return;
      const { phase, currentPlayer, selectedTerritory, territories } = gameState;
      const player = gameState.players[currentPlayer];
      if (player.isAI) return;
      const territory = territories[territoryId];

      if (phase === 'draft') {
        if (territory.owner === currentPlayer) setGameState(placeTroop(gameState, territoryId));
      } else if (phase === 'attack') {
        if (!selectedTerritory) {
          if (territory.owner === currentPlayer && territory.troops > 1) {
            setGameState({ ...gameState, selectedTerritory: territoryId, message: `Attack from ${territory.name}` });
          }
        } else if (selectedTerritory === territoryId) {
          setGameState({ ...gameState, selectedTerritory: null, targetTerritory: null, message: `${player.name} — Select territory` });
        } else {
          const from = territories[selectedTerritory];
          if (territory.owner !== currentPlayer && from.neighbors.includes(territoryId)) {
            setGameState(attack(gameState, selectedTerritory, territoryId));
          } else if (territory.owner === currentPlayer && territory.troops > 1) {
            setGameState({ ...gameState, selectedTerritory: territoryId, targetTerritory: null, message: `Attack from ${territory.name}` });
          }
        }
      } else if (phase === 'fortify') {
        if (!gameState.fortifyFrom) {
          if (territory.owner === currentPlayer && territory.troops > 1) {
            setGameState({ ...gameState, fortifyFrom: territoryId, message: `Move from ${territory.name}` });
          }
        } else if (gameState.fortifyFrom === territoryId) {
          setGameState({ ...gameState, fortifyFrom: null, fortifyTo: null, message: `${player.name} — Fortify` });
        } else if (territory.owner === currentPlayer && areConnected(territories, gameState.fortifyFrom, territoryId, currentPlayer)) {
          setGameState({ ...gameState, fortifyTo: territoryId });
          setFortifyTroops(1);
        }
      }
    },
    [gameState, isAIPlaying]
  );

  const handleEndPhase = useCallback(() => {
    if (!gameState || isAIPlaying) return;
    setGameState(endPhase(gameState));
  }, [gameState, isAIPlaying]);

  const handleFortifyConfirm = useCallback(() => {
    if (!gameState || !gameState.fortifyFrom || !gameState.fortifyTo) return;
    let newState = fortify(gameState, gameState.fortifyFrom, gameState.fortifyTo, fortifyTroops);
    newState = endPhase(newState);
    setGameState(newState);
  }, [gameState, fortifyTroops]);

  const handleNewGame = useCallback(() => {
    setGameState(null);
    setShowSetup(true);
    setIsAIPlaying(false);
    aiPlayingRef.current = false;
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!gameState || showSetup) return;

    const territoryIds = Object.keys(gameState.territories);
    const getOwnTerritories = () =>
      territoryIds.filter((id) => gameState.territories[id].owner === gameState.currentPlayer);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAIPlaying || gameState.players[gameState.currentPlayer].isAI) return;

      const key = e.key.toLowerCase();

      // H - toggle help
      if (key === 'h') { setShowHelp((v) => !v); return; }
      // Escape - deselect / close help
      if (key === 'escape') {
        setShowHelp(false);
        if (gameState.selectedTerritory || gameState.fortifyFrom) {
          setGameState({ ...gameState, selectedTerritory: null, targetTerritory: null, fortifyFrom: null, fortifyTo: null });
        }
        return;
      }
      // Space or E - end phase / skip
      if (key === ' ' || key === 'e') {
        e.preventDefault();
        if (gameState.phase === 'attack' || gameState.phase === 'fortify') {
          handleEndPhase();
        }
        return;
      }
      // Enter - confirm fortify
      if (key === 'enter' && gameState.phase === 'fortify' && gameState.fortifyFrom && gameState.fortifyTo) {
        handleFortifyConfirm();
        return;
      }
      // N - new game
      if (key === 'n' && e.ctrlKey) { handleNewGame(); return; }

      // W/S or Up/Down - cycle through own territories
      if (key === 'w' || key === 'arrowup' || key === 's' || key === 'arrowdown') {
        e.preventDefault();
        const ownTerritories = getOwnTerritories();
        if (ownTerritories.length === 0) return;

        const current = gameState.selectedTerritory || gameState.fortifyFrom || hoveredTerritory;
        const currentIdx = current ? ownTerritories.indexOf(current) : -1;
        const direction = (key === 'w' || key === 'arrowup') ? -1 : 1;
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + direction + ownTerritories.length) % ownTerritories.length;
        const nextId = ownTerritories[nextIdx];

        setHoveredTerritory(nextId);

        if (gameState.phase === 'draft') {
          // Draft: clicking with keyboard deploys troop
        } else if (gameState.phase === 'attack' && !gameState.selectedTerritory) {
          if (gameState.territories[nextId].troops > 1) {
            setGameState({ ...gameState, selectedTerritory: nextId, message: `Attack from ${gameState.territories[nextId].name}` });
          }
        } else if (gameState.phase === 'fortify' && !gameState.fortifyFrom) {
          if (gameState.territories[nextId].troops > 1) {
            setGameState({ ...gameState, fortifyFrom: nextId, message: `Move from ${gameState.territories[nextId].name}` });
          }
        }
        return;
      }

      // A/D or Left/Right - cycle through neighbor targets (when territory selected)
      if (key === 'a' || key === 'arrowleft' || key === 'd' || key === 'arrowright') {
        e.preventDefault();
        const selected = gameState.selectedTerritory || gameState.fortifyFrom;
        if (!selected) return;

        const territory = gameState.territories[selected];
        let targets: string[];

        if (gameState.phase === 'attack') {
          targets = territory.neighbors.filter((n) => gameState.territories[n].owner !== gameState.currentPlayer);
        } else if (gameState.phase === 'fortify') {
          targets = territory.neighbors.filter((n) =>
            gameState.territories[n].owner === gameState.currentPlayer &&
            areConnected(gameState.territories, selected, n, gameState.currentPlayer)
          );
        } else {
          return;
        }

        if (targets.length === 0) return;
        const currentTarget = gameState.targetTerritory || gameState.fortifyTo || hoveredTerritory;
        const currentIdx = currentTarget ? targets.indexOf(currentTarget) : -1;
        const direction = (key === 'a' || key === 'arrowleft') ? -1 : 1;
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + direction + targets.length) % targets.length;
        setHoveredTerritory(targets[nextIdx]);

        if (gameState.phase === 'fortify') {
          setGameState({ ...gameState, fortifyTo: targets[nextIdx] });
          setFortifyTroops(1);
        }
        return;
      }

      // F or Enter - confirm action on hovered territory
      if (key === 'f' || (key === 'enter' && hoveredTerritory)) {
        if (hoveredTerritory) {
          handleTerritoryClick(hoveredTerritory);
        }
        return;
      }

      // Q - increase fortify troops, Z - decrease
      if (key === 'q' && gameState.fortifyFrom && gameState.fortifyTo) {
        setFortifyTroops((v) => Math.min(gameState.territories[gameState.fortifyFrom!].troops - 1, v + 1));
        return;
      }
      if (key === 'z' && gameState.fortifyFrom && gameState.fortifyTo) {
        setFortifyTroops((v) => Math.max(1, v - 1));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, showSetup, isAIPlaying, hoveredTerritory, handleTerritoryClick, handleEndPhase, handleFortifyConfirm, handleNewGame]);

  if (showSetup || !gameState) return <SetupScreen onStart={handleStart} />;

  const currentPlayerData = gameState.players[gameState.currentPlayer];
  const hoveredTerritoryData = hoveredTerritory ? gameState.territories[hoveredTerritory] : null;

  const playerContinentBonuses = gameState.players.map((p) => {
    const bonuses: string[] = [];
    Object.values(gameState.continents).forEach((c) => {
      if (c.territories.every((tid) => gameState.territories[tid].owner === p.id)) bonuses.push(c.name);
    });
    return bonuses;
  });

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none"
      style={{ background: `linear-gradient(180deg, #0b0025 0%, #0a0e1a 100%)` }}>

      {/* TOP BAR - neon style */}
      <div className="flex-shrink-0 h-14 flex items-center justify-between px-4"
        style={{ background: 'rgba(0,0,0,0.6)', borderBottom: `1px solid ${VC.pink}20` }}>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black" style={{
            fontFamily: 'Impact, sans-serif',
            color: VC.pink,
            textShadow: `0 0 20px ${VC.pink}80`,
            letterSpacing: '-1px',
          }}>RISK</h1>
          <span className="text-[10px] uppercase font-bold" style={{
            color: VC.cyan, letterSpacing: '3px', textShadow: `0 0 10px ${VC.cyan}60`,
          }}>Vice City</span>
          <div className="text-xs ml-2" style={{ color: VC.yellow + '60' }}>Turn {gameState.turnNumber}</div>
        </div>

        <PhaseIndicator phase={gameState.phase} onEndPhase={handleEndPhase} />

        <div className="flex items-center gap-3">
          {gameState.phase === 'draft' && gameState.troopsToDraft > 0 && (
            <div className="px-3 py-1 rounded-sm" style={{
              background: VC.teal + '20', border: `1px solid ${VC.teal}40`,
              boxShadow: `0 0 15px ${VC.teal}20`,
            }}>
              <span className="text-xs font-black" style={{ color: VC.teal }}>+{gameState.troopsToDraft} TROOPS</span>
            </div>
          )}
          <button onClick={handleNewGame} className="text-xs transition-colors px-2 py-1"
            style={{ color: VC.pink + '60' }}
            onMouseEnter={(e) => e.currentTarget.style.color = VC.pink}
            onMouseLeave={(e) => e.currentTarget.style.color = VC.pink + '60'}>
            New Game
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="flex-shrink-0 w-56 p-3 flex flex-col gap-1 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.4)', borderRight: `1px solid ${VC.pink}10` }}>
          <div className="text-[10px] uppercase tracking-widest mb-1 font-black"
            style={{ color: VC.pink, letterSpacing: '3px', textShadow: `0 0 10px ${VC.pink}40` }}>
            Crew
          </div>
          {gameState.players.map((player) => (
            <PlayerCard key={player.id} player={player}
              isActive={player.id === gameState.currentPlayer}
              continentBonuses={playerContinentBonuses[player.id]} />
          ))}
          <div className="mt-auto pt-3" style={{ borderTop: `1px solid ${VC.cyan}10` }}>
            <ContinentLegend continents={gameState.continents} />
          </div>
        </div>

        {/* MAP */}
        <div className="flex-1 relative flex items-center justify-center p-2">
          <GameMap state={gameState} onTerritoryClick={handleTerritoryClick}
            hoveredTerritory={hoveredTerritory} setHoveredTerritory={setHoveredTerritory} />

          {/* Hover tooltip */}
          {hoveredTerritoryData && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 pointer-events-none"
              style={{
                background: 'rgba(0,0,0,0.85)', border: `1px solid ${VC.cyan}30`,
                boxShadow: `0 0 20px ${VC.cyan}15`,
              }}>
              <div className="text-xs font-black uppercase" style={{ color: VC.cyan }}>
                {hoveredTerritoryData.name}
              </div>
              <div className="text-[10px]" style={{ color: VC.pink + '80' }}>
                {CONTINENTS[hoveredTerritoryData.continent].name} •{' '}
                {hoveredTerritoryData.owner !== null ? gameState.players[hoveredTerritoryData.owner].name : 'Neutral'}{' '}
                • {hoveredTerritoryData.troops} crew
              </div>
            </div>
          )}

          {/* Dice result */}
          {gameState.diceResult && gameState.phase === 'attack' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <DiceDisplay result={gameState.diceResult} />
            </div>
          )}

          {/* Fortify dialog */}
          {gameState.phase === 'fortify' && gameState.fortifyFrom && gameState.fortifyTo && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-4 flex items-center gap-4"
              style={{ background: 'rgba(0,0,0,0.85)', border: `1px solid ${VC.cyan}30` }}>
              <div className="text-xs text-white">
                Move crew from <span className="font-bold" style={{ color: VC.pink }}>
                  {gameState.territories[gameState.fortifyFrom].name}
                </span> to <span className="font-bold" style={{ color: VC.cyan }}>
                  {gameState.territories[gameState.fortifyTo].name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setFortifyTroops(Math.max(1, fortifyTroops - 1))}
                  className="w-7 h-7 text-white text-sm font-bold" style={{ background: VC.pink + '30' }}>-</button>
                <span className="text-white font-black text-lg w-8 text-center">{fortifyTroops}</span>
                <button onClick={() => setFortifyTroops(Math.min(gameState.territories[gameState.fortifyFrom!].troops - 1, fortifyTroops + 1))}
                  className="w-7 h-7 text-white text-sm font-bold" style={{ background: VC.pink + '30' }}>+</button>
              </div>
              <button onClick={handleFortifyConfirm} className="px-4 py-1.5 text-xs font-black text-black"
                style={{ background: VC.teal, boxShadow: `0 0 15px ${VC.teal}40` }}>GO</button>
            </div>
          )}

          {/* AI indicator */}
          {isAIPlaying && (
            <div className="absolute top-4 right-4 px-3 py-2 flex items-center gap-2"
              style={{ background: 'rgba(0,0,0,0.7)', border: `1px solid ${VC.yellow}30` }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: VC.yellow }} />
              <span className="text-xs font-bold" style={{ color: VC.yellow }}>{currentPlayerData.name} plotting...</span>
            </div>
          )}

          {/* Victory overlay */}
          {gameState.phase === 'gameover' && gameState.winner !== null && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
              <div className="text-center">
                <h2 className="text-6xl font-black mb-2" style={{
                  fontFamily: 'Impact, sans-serif',
                  color: VC.pink,
                  textShadow: `0 0 40px ${VC.pink}80, 0 0 80px ${VC.pink}40`,
                  letterSpacing: '-2px',
                }}>WASTED</h2>
                <p className="text-2xl font-black mb-1" style={{ color: VC.cyan }}>
                  {gameState.players[gameState.winner].name}
                </p>
                <p className="text-sm mb-6" style={{ color: VC.yellow + '80' }}>
                  {gameState.players[gameState.winner].role} owns the strip
                </p>
                <button onClick={handleNewGame} className="px-8 py-3 font-black text-lg uppercase active:scale-95 transition-transform"
                  style={{
                    fontFamily: 'Impact, sans-serif',
                    background: `linear-gradient(135deg, ${VC.pink}, ${VC.orange})`,
                    color: '#fff',
                    letterSpacing: '3px',
                    boxShadow: `0 0 30px ${VC.pink}50`,
                  }}>
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}

          {/* Help overlay */}
          {showHelp && (
            <div className="absolute inset-0 flex items-center justify-center z-50"
              style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowHelp(false)}>
              <div className="max-w-lg w-full p-6" style={{ border: `1px solid ${VC.pink}30` }}
                onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-black mb-4" style={{
                  fontFamily: 'Impact, sans-serif', color: VC.pink,
                  textShadow: `0 0 20px ${VC.pink}60`,
                }}>CONTROLS</h2>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-6">
                  {[
                    ['W / ↑', 'Previous own territory'],
                    ['S / ↓', 'Next own territory'],
                    ['A / ←', 'Previous target'],
                    ['D / →', 'Next target'],
                    ['F / Enter', 'Confirm action / click'],
                    ['Space / E', 'End phase / skip'],
                    ['Q', 'Increase fortify troops'],
                    ['Z', 'Decrease fortify troops'],
                    ['Escape', 'Deselect / close help'],
                    ['H', 'Toggle this help'],
                    ['Ctrl+N', 'New game'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-2">
                      <kbd className="px-2 py-0.5 text-[10px] font-bold rounded-sm min-w-[40px] text-center"
                        style={{ background: VC.cyan + '20', color: VC.cyan, border: `1px solid ${VC.cyan}30` }}>
                        {key}
                      </kbd>
                      <span className="text-xs" style={{ color: '#ffffffaa' }}>{desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-black mb-2" style={{ color: VC.cyan }}>HOW TO PLAY</h3>
                <div className="text-xs leading-relaxed space-y-2" style={{ color: '#ffffff99' }}>
                  <p><span style={{ color: VC.teal }} className="font-black">DEPLOY:</span> Click or press F on your territories to place troops. Each turn you get troops based on territories owned + continent bonuses.</p>
                  <p><span style={{ color: VC.pink }} className="font-black">ATTACK:</span> Select your territory (2+ troops), then click an adjacent enemy. Dice determine the outcome. Press Space to skip.</p>
                  <p><span style={{ color: VC.cyan }} className="font-black">FORTIFY:</span> Move troops between connected territories. Use Q/Z to adjust count. Press Space to end turn.</p>
                  <p><span style={{ color: VC.yellow }} className="font-black">WIN:</span> Eliminate all opponents by conquering every territory!</p>
                </div>

                <button onClick={() => setShowHelp(false)} className="mt-4 px-6 py-2 text-xs font-black uppercase"
                  style={{ background: VC.pink + '20', color: VC.pink, border: `1px solid ${VC.pink}40` }}>
                  Close (H or Esc)
                </button>
              </div>
            </div>
          )}

          {/* Help button */}
          <button onClick={() => setShowHelp(true)}
            className="absolute bottom-4 right-4 w-8 h-8 flex items-center justify-center text-sm font-black transition-all"
            style={{ background: VC.pink + '20', color: VC.pink, border: `1px solid ${VC.pink}30` }}
            title="Help (H)">
            ?
          </button>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex-shrink-0 w-52 p-3 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.4)', borderLeft: `1px solid ${VC.pink}10` }}>
          <div className="text-[10px] uppercase tracking-widest mb-2 font-black"
            style={{ color: VC.cyan, letterSpacing: '3px', textShadow: `0 0 10px ${VC.cyan}40` }}>
            Intel
          </div>

          {/* Current player */}
          <div className="p-3 mb-3" style={{
            background: currentPlayerData.color + '10',
            borderLeft: `3px solid ${VC.pink}`,
          }}>
            <div className="flex items-center gap-2 mb-1">
              <Avatar src={currentPlayerData.avatar} size={32} border={VC.pink} />
              <div>
                <div className="text-xs font-bold" style={{ color: VC.pink }}>{currentPlayerData.name}</div>
                <div className="text-[10px]" style={{ color: VC.cyan + '60' }}>{currentPlayerData.role}</div>
              </div>
            </div>
          </div>

          {/* Phase instructions */}
          <div className="p-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${VC.cyan}10` }}>
            <div className="text-xs leading-relaxed" style={{ color: '#ffffffcc' }}>
              {gameState.phase === 'draft' && (
                <>
                  <span className="font-black" style={{ color: VC.teal }}>DEPLOY PHASE</span><br />
                  Click your turf to place <span className="font-black" style={{ color: VC.teal }}>{gameState.troopsToDraft}</span> crew.
                </>
              )}
              {gameState.phase === 'attack' && (
                <>
                  <span className="font-black" style={{ color: VC.pink }}>ATTACK PHASE</span><br />
                  {!gameState.selectedTerritory ? 'Select turf with 2+ crew to attack.' : 'Click enemy turf to strike.'}
                </>
              )}
              {gameState.phase === 'fortify' && (
                <>
                  <span className="font-black" style={{ color: VC.cyan }}>FORTIFY PHASE</span><br />
                  Move crew between connected turf, or end turn.
                </>
              )}
              {gameState.phase === 'gameover' && (
                <span className="font-black" style={{ color: VC.yellow }}>GAME OVER</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {gameState.phase === 'attack' && !gameState.players[gameState.currentPlayer].isAI && (
              <button onClick={handleEndPhase} className="w-full py-2 text-xs font-black uppercase tracking-wider transition-all"
                style={{ background: VC.cyan + '15', color: VC.cyan, border: `1px solid ${VC.cyan}30` }}>
                Skip to Fortify
              </button>
            )}
            {gameState.phase === 'fortify' && !gameState.players[gameState.currentPlayer].isAI && (
              <button onClick={handleEndPhase} className="w-full py-2 text-xs font-black uppercase tracking-wider transition-all"
                style={{ background: VC.pink + '15', color: VC.pink, border: `1px solid ${VC.pink}30` }}>
                End Turn
              </button>
            )}
          </div>

          {/* Status */}
          <div className="mt-auto pt-3" style={{ borderTop: `1px solid ${VC.pink}10` }}>
            <div className="text-[10px] uppercase tracking-widest mb-1 font-black"
              style={{ color: VC.yellow + '60', letterSpacing: '2px' }}>Status</div>
            <div className="text-xs leading-relaxed" style={{ color: VC.neonPink + '80' }}>{gameState.message}</div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex-shrink-0 h-7 flex items-center justify-between px-4"
        style={{ background: 'rgba(0,0,0,0.6)', borderTop: `1px solid ${VC.pink}15` }}>
        <div className="text-[9px] uppercase tracking-wider" style={{ color: VC.pink + '40' }}>
          Risk: Mission:Control Vice City Edition
        </div>
        <div className="text-[9px]" style={{ color: VC.cyan + '30' }}>missioncontrol.io</div>
      </div>
    </div>
  );
}
