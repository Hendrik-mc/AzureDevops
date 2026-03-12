'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GamePhase, DiceResult } from './types';
import { CONTINENTS, TERRITORIES, MC_TEAM, DEFAULT_PLAYER_INDICES, createPlayers } from './gameData';
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
// SUB-COMPONENTS
// ============================================================

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
      <rect x="1" y="1" width="38" height="38" rx="6" fill={color} stroke="#fff" strokeWidth="1.5" />
      {(dotPositions[value] || []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#fff" />
      ))}
    </svg>
  );
}

function DiceDisplay({ result }: { result: DiceResult }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-red-400 mb-1 font-bold">Attacker</div>
        <div className="flex gap-1">
          {result.attacker.map((v, i) => (
            <DiceFace key={i} value={v} color="#dc2626" />
          ))}
        </div>
      </div>
      <div className="text-white/40 text-2xl font-bold">vs</div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-blue-400 mb-1 font-bold">Defender</div>
        <div className="flex gap-1">
          {result.defender.map((v, i) => (
            <DiceFace key={i} value={v} color="#2563eb" />
          ))}
        </div>
      </div>
    </div>
  );
}

function PhaseIndicator({ phase, onEndPhase }: { phase: GamePhase; onEndPhase: () => void }) {
  const phases: { id: GamePhase; label: string; icon: string }[] = [
    { id: 'draft', label: 'DRAFT', icon: '⬆' },
    { id: 'attack', label: 'ATTACK', icon: '⚔' },
    { id: 'fortify', label: 'FORTIFY', icon: '🛡' },
  ];

  return (
    <div className="flex items-center gap-1">
      {phases.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            if (
              (phase === 'attack' && p.id === 'fortify') ||
              (phase === 'fortify' && p.id === 'fortify')
            ) {
              onEndPhase();
            }
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            phase === p.id
              ? 'bg-gradient-to-b from-red-500 to-red-700 text-white shadow-lg shadow-red-500/30 scale-105'
              : 'bg-white/5 text-white/40 hover:bg-white/10'
          }`}
        >
          <span className="mr-1">{p.icon}</span>
          {p.label}
        </button>
      ))}
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
      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all border ${
        player.eliminated
          ? 'opacity-30 border-white/5 bg-white/5'
          : isActive
          ? 'border-white/30 bg-white/10 shadow-lg scale-105'
          : 'border-white/10 bg-white/5 hover:bg-white/8'
      }`}
      style={isActive ? { boxShadow: `0 0 20px ${player.color}40` } : undefined}
    >
      {isActive && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: player.color }}
        />
      )}
      <div
        className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0"
        style={{ borderColor: player.color, backgroundColor: player.color + '33' }}
      >
        <span style={{ color: player.color }}>{player.name.split(' ').map(p => p[0]).join('')}</span>
      </div>
      <div className="min-w-0">
        <div className="text-white text-xs font-bold truncate">{player.name}</div>
        <div className="text-white/40 text-[10px] truncate">{player.role}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/60">
            <span style={{ color: player.color }} className="font-bold">{player.territories}</span> regions
          </span>
          <span className="text-[10px] text-white/60">
            <span style={{ color: player.color }} className="font-bold">{player.troops}</span> troops
          </span>
        </div>
        {continentBonuses.length > 0 && (
          <div className="text-[9px] text-amber-400 truncate mt-0.5">
            +{continentBonuses.join(', ')}
          </div>
        )}
      </div>
      {player.isAI && (
        <div className="text-[9px] text-white/30 bg-white/5 px-1 rounded absolute top-1 right-1">AI</div>
      )}
    </div>
  );
}

function ContinentLegend({ continents }: { continents: Record<string, { name: string; bonus: number; color: string }> }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {Object.values(continents).map((c) => (
        <div key={c.name} className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color + '80' }} />
          <span className="text-[10px] text-white/50">{c.name}</span>
          <span className="text-[9px] text-amber-400/60">+{c.bonus}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// GAME MAP
// ============================================================

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

  // Draw connection lines between neighbors
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
    <svg viewBox="0 0 1000 580" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.5))' }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="selectedGlow">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Grid pattern background */}
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Background */}
      <rect width="1000" height="580" fill="#0a0e1a" />
      <rect width="1000" height="580" fill="url(#grid)" />

      {/* Continent region backgrounds */}
      {Object.values(CONTINENTS).map((continent) => {
        const contTerritories = continent.territories.map((id) => territories[id]);
        const allPoints = contTerritories.flatMap((t) => {
          return t.path
            .replace(/[MLZ]/g, '')
            .trim()
            .split(/\s+/)
            .reduce<{ x: number; y: number }[]>((acc, val, i, arr) => {
              if (i % 2 === 0 && i + 1 < arr.length) {
                acc.push({ x: parseFloat(val.replace(',', '')), y: parseFloat(arr[i + 1].replace(',', '')) });
              }
              return acc;
            }, []);
        });
        const minX = Math.min(...allPoints.map((p) => p.x)) - 10;
        const minY = Math.min(...allPoints.map((p) => p.y)) - 10;
        const maxX = Math.max(...allPoints.map((p) => p.x)) + 10;
        const maxY = Math.max(...allPoints.map((p) => p.y)) + 10;
        return (
          <rect
            key={continent.id}
            x={minX}
            y={minY}
            width={maxX - minX}
            height={maxY - minY}
            rx="12"
            fill={continent.color + '08'}
            stroke={continent.color + '15'}
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        );
      })}

      {/* Connection lines */}
      {connections.map((c) => (
        <line
          key={c.key}
          x1={c.x1}
          y1={c.y1}
          x2={c.x2}
          y2={c.y2}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}

      {/* Territory shapes */}
      {Object.values(territories).map((territory) => {
        const owner = territory.owner !== null ? players[territory.owner] : null;
        const continentColor = CONTINENTS[territory.continent].color;
        const isSelected = selectedTerritory === territory.id;
        const isTarget = targetTerritory === territory.id;
        const isHovered = hoveredTerritory === territory.id;

        // Determine if territory is a valid target
        let isValidTarget = false;
        if (phase === 'draft' && territory.owner === currentPlayer) {
          isValidTarget = true;
        } else if (phase === 'attack' && selectedTerritory) {
          const sel = territories[selectedTerritory];
          isValidTarget =
            territory.owner !== currentPlayer && sel.neighbors.includes(territory.id);
        } else if (phase === 'attack' && !selectedTerritory && territory.owner === currentPlayer && territory.troops > 1) {
          isValidTarget = true;
        } else if (phase === 'fortify' && territory.owner === currentPlayer) {
          isValidTarget = true;
        }

        const fillColor = owner ? owner.color + (isSelected ? 'cc' : isHovered && isValidTarget ? 'aa' : '66') : '#333333';
        const strokeColor = isSelected
          ? '#ffffff'
          : isTarget
          ? '#ff6666'
          : isHovered && isValidTarget
          ? '#ffffffaa'
          : owner
          ? owner.color + '88'
          : '#555555';

        return (
          <g key={territory.id}>
            <path
              d={territory.path}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isSelected || isTarget ? 3 : isHovered ? 2 : 1.5}
              filter={isSelected ? 'url(#selectedGlow)' : undefined}
              className={`transition-all duration-150 ${isValidTarget ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={() => onTerritoryClick(territory.id)}
              onMouseEnter={() => setHoveredTerritory(territory.id)}
              onMouseLeave={() => setHoveredTerritory(null)}
            />
          </g>
        );
      })}

      {/* Territory labels and troop counts */}
      {Object.values(territories).map((territory) => {
        const owner = territory.owner !== null ? players[territory.owner] : null;

        return (
          <g key={territory.id + '-label'}>
            {/* Territory name */}
            <text
              x={territory.labelX}
              y={territory.labelY - 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize="8"
              fontWeight="600"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', pointerEvents: 'none' }}
            >
              {territory.name}
            </text>

            {/* Troop count badge */}
            {territory.troops > 0 && (
              <>
                <circle
                  cx={territory.labelX}
                  cy={territory.labelY + 4}
                  r="12"
                  fill={owner ? owner.colorDark : '#333'}
                  stroke={owner ? owner.color : '#666'}
                  strokeWidth="2"
                  filter="url(#glow)"
                />
                <text
                  x={territory.labelX}
                  y={territory.labelY + 8}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {territory.troops}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Continent labels */}
      {Object.values(CONTINENTS).map((continent) => {
        const contTerritories = continent.territories.map((id) => territories[id]);
        const avgX = contTerritories.reduce((s, t) => s + t.labelX, 0) / contTerritories.length;
        const minY = Math.min(...contTerritories.map((t) => t.labelY)) - 30;
        return (
          <text
            key={continent.id + '-label'}
            x={avgX}
            y={minY}
            textAnchor="middle"
            fill={continent.color + '60'}
            fontSize="11"
            fontWeight="bold"
            letterSpacing="2"
            style={{ pointerEvents: 'none' }}
          >
            {continent.name.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

// ============================================================
// SETUP SCREEN
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#111827] to-[#0a0e1a] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-red-600 tracking-tight">
            RISK
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-red-500/50" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/50 font-semibold">
              Mission:Control Edition
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-red-500/50" />
          </div>
          <p className="text-white/30 text-sm mt-3">Conquer the gaming world. Choose your commanders.</p>
        </div>

        {/* Player selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
          {MC_TEAM.map((member, idx) => {
            const isSelected = selectedPlayers.includes(idx);
            const orderIdx = selectedPlayers.indexOf(idx);
            const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

            return (
              <button
                key={idx}
                onClick={() => togglePlayer(idx)}
                className={`relative p-3 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/5 bg-white/5 hover:bg-white/8 opacity-50'
                }`}
                style={isSelected ? { boxShadow: `0 0 15px ${COLORS[orderIdx]}30` } : undefined}
              >
                {isSelected && (
                  <div
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-black"
                    style={{ backgroundColor: COLORS[orderIdx] }}
                  >
                    {orderIdx + 1}
                  </div>
                )}
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold border-2"
                  style={{
                    borderColor: isSelected ? COLORS[orderIdx] : '#555',
                    backgroundColor: isSelected ? COLORS[orderIdx] + '33' : '#333',
                    color: isSelected ? COLORS[orderIdx] : '#888',
                  }}
                >
                  {member.fullName.split(' ').map(p => p[0]).join('').slice(0, 2)}
                </div>
                <div className="text-white text-xs font-bold text-center truncate">{member.fullName}</div>
                <div className="text-white/40 text-[10px] text-center truncate">{member.role}</div>
              </button>
            );
          })}
        </div>

        {/* Settings */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-white/40 text-sm">
            {selectedPlayers.length} players selected (Player 1 is human, rest are AI)
          </div>
          <button
            onClick={() => onStart(selectedPlayers, playerCount)}
            disabled={selectedPlayers.length < 2}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-lg
              hover:from-red-500 hover:to-red-400 transition-all shadow-lg shadow-red-500/25
              disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
          >
            START CONQUEST
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/20 text-[10px]">
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
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStart = useCallback((playerIndices: number[], playerCount: number) => {
    const state = initializeGame(playerCount);
    // Override players with selected team members
    const selectedPlayers = createPlayers(playerIndices);
    state.players = selectedPlayers;

    // Re-randomize territory assignment with correct player count
    const territoryIds = Object.keys(state.territories);
    const shuffled = territoryIds.sort(() => Math.random() - 0.5);
    shuffled.forEach((id, index) => {
      const playerIndex = index % playerCount;
      state.territories[id].owner = playerIndex;
      state.territories[id].troops = 1 + Math.floor(Math.random() * 3);
    });

    // Update stats
    state.players.forEach((p) => {
      const owned = Object.values(state.territories).filter((t) => t.owner === p.id);
      p.territories = owned.length;
      p.troops = owned.reduce((s, t) => s + t.troops, 0);
    });

    // Calculate draft
    const ownedCount = Object.values(state.territories).filter((t) => t.owner === 0).length;
    let draft = Math.max(3, Math.floor(ownedCount / 3));
    Object.values(state.continents).forEach((c) => {
      if (c.territories.every((tid) => state.territories[tid].owner === 0)) {
        draft += c.bonus;
      }
    });
    state.troopsToDraft = draft;
    state.message = `${state.players[0].name}'s turn - Place ${draft} troops`;

    setGameState(state);
    setShowSetup(false);
  }, []);

  // Handle AI turns
  useEffect(() => {
    if (!gameState || gameState.phase === 'gameover') return;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (!currentPlayer.isAI || isAIPlaying) return;

    setIsAIPlaying(true);
    const aiSteps = executeAITurn(gameState);

    if (aiSteps.length === 0) {
      setIsAIPlaying(false);
      return;
    }

    let stepIndex = 0;
    const playStep = () => {
      if (stepIndex < aiSteps.length) {
        setGameState(aiSteps[stepIndex]);
        stepIndex++;
        aiTimeoutRef.current = setTimeout(playStep, 300);
      } else {
        setIsAIPlaying(false);
      }
    };

    aiTimeoutRef.current = setTimeout(playStep, 500);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameState, isAIPlaying]);

  const handleTerritoryClick = useCallback(
    (territoryId: string) => {
      if (!gameState || isAIPlaying) return;
      const { phase, currentPlayer, selectedTerritory, territories } = gameState;
      const player = gameState.players[currentPlayer];
      if (player.isAI) return;

      const territory = territories[territoryId];

      if (phase === 'draft') {
        if (territory.owner === currentPlayer) {
          setGameState(placeTroop(gameState, territoryId));
        }
      } else if (phase === 'attack') {
        if (!selectedTerritory) {
          // Select attacking territory
          if (territory.owner === currentPlayer && territory.troops > 1) {
            setGameState({
              ...gameState,
              selectedTerritory: territoryId,
              message: `Attack from ${territory.name} - Select target`,
            });
          }
        } else if (selectedTerritory === territoryId) {
          // Deselect
          setGameState({
            ...gameState,
            selectedTerritory: null,
            targetTerritory: null,
            message: `${player.name} - Select territory to attack from`,
          });
        } else {
          const from = territories[selectedTerritory];
          if (territory.owner !== currentPlayer && from.neighbors.includes(territoryId)) {
            setGameState(attack(gameState, selectedTerritory, territoryId));
          } else if (territory.owner === currentPlayer && territory.troops > 1) {
            setGameState({
              ...gameState,
              selectedTerritory: territoryId,
              targetTerritory: null,
              message: `Attack from ${territory.name} - Select target`,
            });
          }
        }
      } else if (phase === 'fortify') {
        if (!gameState.fortifyFrom) {
          if (territory.owner === currentPlayer && territory.troops > 1) {
            setGameState({
              ...gameState,
              fortifyFrom: territoryId,
              message: `Fortify from ${territory.name} - Select destination`,
            });
          }
        } else if (gameState.fortifyFrom === territoryId) {
          setGameState({
            ...gameState,
            fortifyFrom: null,
            fortifyTo: null,
            message: `${player.name} - Select territory to fortify from`,
          });
        } else if (
          territory.owner === currentPlayer &&
          areConnected(territories, gameState.fortifyFrom, territoryId, currentPlayer)
        ) {
          setGameState({
            ...gameState,
            fortifyTo: territoryId,
          });
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
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  }, []);

  // Setup screen
  if (showSetup || !gameState) {
    return <SetupScreen onStart={handleStart} />;
  }

  const currentPlayerData = gameState.players[gameState.currentPlayer];
  const hoveredTerritoryData = hoveredTerritory ? gameState.territories[hoveredTerritory] : null;

  // Get continent bonuses per player
  const playerContinentBonuses = gameState.players.map((p) => {
    const bonuses: string[] = [];
    Object.values(gameState.continents).forEach((c) => {
      if (c.territories.every((tid) => gameState.territories[tid].owner === p.id)) {
        bonuses.push(c.name);
      }
    });
    return bonuses;
  });

  return (
    <div className="h-screen w-screen bg-[#0a0e1a] flex flex-col overflow-hidden select-none">
      {/* TOP BAR */}
      <div className="flex-shrink-0 h-14 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
            RISK
          </h1>
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Mission:Control</span>
          <div className="text-xs text-white/20 ml-2">Turn {gameState.turnNumber}</div>
        </div>

        <PhaseIndicator phase={gameState.phase} onEndPhase={handleEndPhase} />

        <div className="flex items-center gap-3">
          {gameState.phase === 'draft' && gameState.troopsToDraft > 0 && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-3 py-1">
              <span className="text-green-400 text-xs font-bold">+{gameState.troopsToDraft} troops</span>
            </div>
          )}
          <button
            onClick={handleNewGame}
            className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1"
          >
            New Game
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR - Players */}
        <div className="flex-shrink-0 w-56 bg-black/20 border-r border-white/5 p-3 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-bold">Commanders</div>
          {gameState.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isActive={player.id === gameState.currentPlayer}
              continentBonuses={playerContinentBonuses[player.id]}
            />
          ))}
          <div className="mt-auto pt-3 border-t border-white/5">
            <ContinentLegend continents={gameState.continents} />
          </div>
        </div>

        {/* MAP */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          <GameMap
            state={gameState}
            onTerritoryClick={handleTerritoryClick}
            hoveredTerritory={hoveredTerritory}
            setHoveredTerritory={setHoveredTerritory}
          />

          {/* Hover tooltip */}
          {hoveredTerritoryData && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 pointer-events-none">
              <div className="text-white text-xs font-bold">{hoveredTerritoryData.name}</div>
              <div className="text-white/40 text-[10px]">
                {CONTINENTS[hoveredTerritoryData.continent].name} •{' '}
                {hoveredTerritoryData.owner !== null
                  ? gameState.players[hoveredTerritoryData.owner].name
                  : 'Unowned'}{' '}
                • {hoveredTerritoryData.troops} troops
              </div>
            </div>
          )}

          {/* Dice result overlay */}
          {gameState.diceResult && gameState.phase === 'attack' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <DiceDisplay result={gameState.diceResult} />
            </div>
          )}

          {/* Fortify dialog */}
          {gameState.phase === 'fortify' && gameState.fortifyFrom && gameState.fortifyTo && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="text-white text-xs">
                Move troops from{' '}
                <span className="font-bold text-amber-400">
                  {gameState.territories[gameState.fortifyFrom].name}
                </span>{' '}
                to{' '}
                <span className="font-bold text-amber-400">
                  {gameState.territories[gameState.fortifyTo].name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFortifyTroops(Math.max(1, fortifyTroops - 1))}
                  className="w-7 h-7 rounded bg-white/10 text-white hover:bg-white/20 transition-colors text-sm font-bold"
                >
                  -
                </button>
                <span className="text-white font-bold text-lg w-8 text-center">{fortifyTroops}</span>
                <button
                  onClick={() =>
                    setFortifyTroops(
                      Math.min(gameState.territories[gameState.fortifyFrom!].troops - 1, fortifyTroops + 1)
                    )
                  }
                  className="w-7 h-7 rounded bg-white/10 text-white hover:bg-white/20 transition-colors text-sm font-bold"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleFortifyConfirm}
                className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-500 transition-colors"
              >
                Confirm
              </button>
            </div>
          )}

          {/* AI playing indicator */}
          {isAIPlaying && (
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-bold">{currentPlayerData.name} is thinking...</span>
            </div>
          )}

          {/* Victory overlay */}
          {gameState.phase === 'gameover' && gameState.winner !== null && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">👑</div>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 mb-2">
                  VICTORY
                </h2>
                <p className="text-white text-xl font-bold mb-1">
                  {gameState.players[gameState.winner].name}
                </p>
                <p className="text-white/50 text-sm mb-6">
                  {gameState.players[gameState.winner].role} dominates the gaming world!
                </p>
                <button
                  onClick={handleNewGame}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-lg
                    hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/25 active:scale-95"
                >
                  PLAY AGAIN
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR - Actions */}
        <div className="flex-shrink-0 w-52 bg-black/20 border-l border-white/5 p-3 flex flex-col">
          <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2 font-bold">Actions</div>

          {/* Current player info */}
          <div
            className="rounded-xl p-3 mb-3 border"
            style={{
              borderColor: currentPlayerData.color + '40',
              backgroundColor: currentPlayerData.color + '10',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                style={{ borderColor: currentPlayerData.color, color: currentPlayerData.color }}
              >
                {currentPlayerData.name.split(' ').map(p => p[0]).join('')}
              </div>
              <div>
                <div className="text-white text-xs font-bold">{currentPlayerData.name}</div>
                <div className="text-white/40 text-[10px]">{currentPlayerData.role}</div>
              </div>
            </div>
          </div>

          {/* Phase-specific instructions */}
          <div className="bg-white/5 rounded-lg p-3 mb-3 border border-white/5">
            <div className="text-white/80 text-xs leading-relaxed">
              {gameState.phase === 'draft' && (
                <>
                  <span className="text-green-400 font-bold">DRAFT PHASE</span>
                  <br />
                  Click your territories to place{' '}
                  <span className="text-green-400 font-bold">{gameState.troopsToDraft}</span> troops.
                </>
              )}
              {gameState.phase === 'attack' && (
                <>
                  <span className="text-red-400 font-bold">ATTACK PHASE</span>
                  <br />
                  {!gameState.selectedTerritory
                    ? 'Click a territory with 2+ troops to attack from.'
                    : 'Click an adjacent enemy territory to attack.'}
                </>
              )}
              {gameState.phase === 'fortify' && (
                <>
                  <span className="text-blue-400 font-bold">FORTIFY PHASE</span>
                  <br />
                  Move troops between connected territories, or end turn.
                </>
              )}
              {gameState.phase === 'gameover' && (
                <span className="text-amber-400 font-bold">GAME OVER</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {gameState.phase === 'attack' && !gameState.players[gameState.currentPlayer].isAI && (
              <button
                onClick={handleEndPhase}
                className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs font-bold
                  hover:bg-white/10 transition-all"
              >
                Skip to Fortify →
              </button>
            )}
            {gameState.phase === 'fortify' && !gameState.players[gameState.currentPlayer].isAI && (
              <button
                onClick={handleEndPhase}
                className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs font-bold
                  hover:bg-white/10 transition-all"
              >
                End Turn →
              </button>
            )}
          </div>

          {/* Message log */}
          <div className="mt-auto pt-3 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-bold">Status</div>
            <div className="text-white/60 text-xs leading-relaxed">{gameState.message}</div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="flex-shrink-0 h-8 bg-black/40 border-t border-white/5 flex items-center justify-between px-4">
        <div className="text-[10px] text-white/20">
          RISK: Mission:Control Edition • {Object.keys(gameState.territories).length} territories •{' '}
          {Object.keys(gameState.continents).length} continents
        </div>
        <div className="text-[10px] text-white/20">missioncontrol.io</div>
      </div>
    </div>
  );
}
