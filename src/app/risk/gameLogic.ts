import { GameState, Territory, DiceResult, GamePhase } from './types';
import { TERRITORIES, CONTINENTS, createPlayers, DEFAULT_PLAYER_INDICES } from './gameData';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function initializeGame(playerCount: number): GameState {
  const territories = deepClone(TERRITORIES);
  const continents = deepClone(CONTINENTS);
  const players = createPlayers(DEFAULT_PLAYER_INDICES.slice(0, playerCount));

  // First player is human, rest are AI
  players.forEach((p, i) => {
    p.isAI = i > 0;
  });

  // Randomly assign territories to players
  const territoryIds = Object.keys(territories);
  const shuffled = territoryIds.sort(() => Math.random() - 0.5);

  shuffled.forEach((id, index) => {
    const playerIndex = index % playerCount;
    territories[id].owner = playerIndex;
    territories[id].troops = 1;
  });

  // Give each territory 1-3 random extra troops
  shuffled.forEach((id) => {
    const extra = Math.floor(Math.random() * 3);
    territories[id].troops += extra;
  });

  // Update player stats
  players.forEach((p) => {
    p.territories = Object.values(territories).filter((t) => t.owner === p.id).length;
    p.troops = Object.values(territories)
      .filter((t) => t.owner === p.id)
      .reduce((sum, t) => sum + t.troops, 0);
  });

  const troopsToDraft = calculateDraftTroops(territories, continents, 0);

  return {
    players,
    territories,
    continents,
    currentPlayer: 0,
    phase: 'draft',
    troopsToDraft,
    selectedTerritory: null,
    targetTerritory: null,
    diceResult: null,
    turnNumber: 1,
    conqueredThisTurn: false,
    message: `${players[0].name}'s turn - Place ${troopsToDraft} troops`,
    winner: null,
    fortifyFrom: null,
    fortifyTo: null,
  };
}

export function calculateDraftTroops(
  territories: Record<string, Territory>,
  continents: Record<string, import('./types').Continent>,
  playerId: number
): number {
  const ownedTerritories = Object.values(territories).filter((t) => t.owner === playerId);
  let troops = Math.max(3, Math.floor(ownedTerritories.length / 3));

  // Check continent bonuses
  Object.values(continents).forEach((continent) => {
    const ownsAll = continent.territories.every((tid) => territories[tid].owner === playerId);
    if (ownsAll) {
      troops += continent.bonus;
    }
  });

  return troops;
}

export function placeTroop(state: GameState, territoryId: string): GameState {
  const newState = deepClone(state);
  const territory = newState.territories[territoryId];

  if (territory.owner !== newState.currentPlayer) return state;
  if (newState.phase !== 'draft') return state;
  if (newState.troopsToDraft <= 0) return state;

  territory.troops += 1;
  newState.troopsToDraft -= 1;

  updatePlayerStats(newState);

  if (newState.troopsToDraft === 0) {
    newState.phase = 'attack';
    newState.message = `${newState.players[newState.currentPlayer].name} - Attack or skip to fortify`;
  } else {
    newState.message = `${newState.players[newState.currentPlayer].name} - Place ${newState.troopsToDraft} more troops`;
  }

  return newState;
}

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
}

export function resolveBattle(attackerTroops: number, defenderTroops: number): DiceResult {
  const attackDice = Math.min(3, attackerTroops - 1);
  const defendDice = Math.min(2, defenderTroops);

  const attacker = rollDice(attackDice);
  const defender = rollDice(defendDice);

  let attackerLosses = 0;
  let defenderLosses = 0;

  const comparisons = Math.min(attacker.length, defender.length);
  for (let i = 0; i < comparisons; i++) {
    if (attacker[i] > defender[i]) {
      defenderLosses++;
    } else {
      attackerLosses++;
    }
  }

  return { attacker, defender, attackerLosses, defenderLosses };
}

export function attack(state: GameState, fromId: string, toId: string): GameState {
  const newState = deepClone(state);
  const from = newState.territories[fromId];
  const to = newState.territories[toId];

  if (from.owner !== newState.currentPlayer) return state;
  if (to.owner === newState.currentPlayer) return state;
  if (from.troops <= 1) return state;
  if (!from.neighbors.includes(toId)) return state;

  const result = resolveBattle(from.troops, to.troops);
  from.troops -= result.attackerLosses;
  to.troops -= result.defenderLosses;

  newState.diceResult = result;
  newState.selectedTerritory = fromId;
  newState.targetTerritory = toId;

  if (to.troops <= 0) {
    // Territory conquered
    const previousOwner = to.owner!;
    to.owner = newState.currentPlayer;
    const moveTroops = Math.min(3, from.troops - 1);
    to.troops = moveTroops;
    from.troops -= moveTroops;
    newState.conqueredThisTurn = true;

    newState.message = `${newState.players[newState.currentPlayer].name} conquered ${to.name}!`;

    // Check if defender is eliminated
    const defenderTerritories = Object.values(newState.territories).filter(
      (t) => t.owner === previousOwner
    );
    if (defenderTerritories.length === 0) {
      newState.players[previousOwner].eliminated = true;
    }

    // Check win condition
    const activePlayers = newState.players.filter((p) => !p.eliminated);
    if (activePlayers.length === 1) {
      newState.phase = 'gameover';
      newState.winner = newState.currentPlayer;
      newState.message = `${newState.players[newState.currentPlayer].name} wins! World domination achieved!`;
    }
  } else {
    const aLoss = result.attackerLosses;
    const dLoss = result.defenderLosses;
    newState.message = `Battle: Attacker lost ${aLoss}, Defender lost ${dLoss}`;
  }

  updatePlayerStats(newState);
  return newState;
}

export function fortify(state: GameState, fromId: string, toId: string, troops: number): GameState {
  const newState = deepClone(state);
  const from = newState.territories[fromId];
  const to = newState.territories[toId];

  if (from.owner !== newState.currentPlayer) return state;
  if (to.owner !== newState.currentPlayer) return state;
  if (from.troops <= troops) return state;
  if (!areConnected(newState.territories, fromId, toId, newState.currentPlayer)) return state;

  from.troops -= troops;
  to.troops += troops;

  updatePlayerStats(newState);
  return newState;
}

export function areConnected(
  territories: Record<string, Territory>,
  fromId: string,
  toId: string,
  playerId: number
): boolean {
  const visited = new Set<string>();
  const queue = [fromId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const territory = territories[current];
    territory.neighbors.forEach((n) => {
      if (!visited.has(n) && territories[n].owner === playerId) {
        queue.push(n);
      }
    });
  }

  return false;
}

export function endPhase(state: GameState): GameState {
  const newState = deepClone(state);

  if (newState.phase === 'attack') {
    newState.phase = 'fortify';
    newState.selectedTerritory = null;
    newState.targetTerritory = null;
    newState.diceResult = null;
    newState.fortifyFrom = null;
    newState.fortifyTo = null;
    newState.message = `${newState.players[newState.currentPlayer].name} - Fortify or end turn`;
  } else if (newState.phase === 'fortify') {
    return nextTurn(newState);
  }

  return newState;
}

export function nextTurn(state: GameState): GameState {
  const newState = deepClone(state);
  newState.conqueredThisTurn = false;
  newState.selectedTerritory = null;
  newState.targetTerritory = null;
  newState.diceResult = null;
  newState.fortifyFrom = null;
  newState.fortifyTo = null;

  // Find next active player
  let next = (newState.currentPlayer + 1) % newState.players.length;
  while (newState.players[next].eliminated) {
    next = (next + 1) % newState.players.length;
  }

  newState.currentPlayer = next;
  if (next <= newState.currentPlayer || next === 0) {
    newState.turnNumber++;
  }

  const troopsToDraft = calculateDraftTroops(newState.territories, newState.continents, next);
  newState.troopsToDraft = troopsToDraft;
  newState.phase = 'draft';
  newState.message = `${newState.players[next].name}'s turn - Place ${troopsToDraft} troops`;

  return newState;
}

function updatePlayerStats(state: GameState): void {
  state.players.forEach((player) => {
    const owned = Object.values(state.territories).filter((t) => t.owner === player.id);
    player.territories = owned.length;
    player.troops = owned.reduce((sum, t) => sum + t.troops, 0);
  });
}

// AI Logic
export function executeAITurn(state: GameState): GameState[] {
  const steps: GameState[] = [];
  let current = deepClone(state);
  const playerId = current.currentPlayer;

  // Draft phase: place troops on territories bordering enemies, preferring those with most enemy neighbors
  if (current.phase === 'draft') {
    while (current.troopsToDraft > 0) {
      const ownTerritories = Object.values(current.territories)
        .filter((t) => t.owner === playerId)
        .sort((a, b) => {
          const aEnemyNeighbors = a.neighbors.filter(
            (n) => current.territories[n].owner !== playerId
          ).length;
          const bEnemyNeighbors = b.neighbors.filter(
            (n) => current.territories[n].owner !== playerId
          ).length;
          return bEnemyNeighbors - aEnemyNeighbors;
        });

      if (ownTerritories.length > 0) {
        current = placeTroop(current, ownTerritories[0].id);
        steps.push(deepClone(current));
      } else {
        break;
      }
    }
  }

  // Attack phase: attack weak neighbors
  if (current.phase === 'attack') {
    let attacks = 0;
    const maxAttacks = 5;

    while (attacks < maxAttacks) {
      const attackOptions: { from: string; to: string; ratio: number }[] = [];

      Object.values(current.territories)
        .filter((t) => t.owner === playerId && t.troops > 1)
        .forEach((t) => {
          t.neighbors.forEach((nId) => {
            const neighbor = current.territories[nId];
            if (neighbor.owner !== playerId) {
              const ratio = t.troops / Math.max(1, neighbor.troops);
              if (ratio > 1.3) {
                attackOptions.push({ from: t.id, to: nId, ratio });
              }
            }
          });
        });

      if (attackOptions.length === 0) break;

      attackOptions.sort((a, b) => b.ratio - a.ratio);
      const best = attackOptions[0];
      current = attack(current, best.from, best.to);
      steps.push(deepClone(current));
      attacks++;

      if (current.phase === 'gameover') return steps;
    }

    current = endPhase(current);
    steps.push(deepClone(current));
  }

  // Fortify phase: move troops from interior to border
  if (current.phase === 'fortify') {
    const interiorTerritories = Object.values(current.territories)
      .filter((t) => {
        if (t.owner !== playerId || t.troops <= 1) return false;
        return t.neighbors.every((n) => current.territories[n].owner === playerId);
      })
      .sort((a, b) => b.troops - a.troops);

    if (interiorTerritories.length > 0) {
      const from = interiorTerritories[0];
      const borderTerritories = Object.values(current.territories)
        .filter(
          (t) =>
            t.owner === playerId &&
            t.neighbors.some((n) => current.territories[n].owner !== playerId) &&
            areConnected(current.territories, from.id, t.id, playerId)
        )
        .sort((a, b) => a.troops - b.troops);

      if (borderTerritories.length > 0) {
        const to = borderTerritories[0];
        current = fortify(current, from.id, to.id, from.troops - 1);
        steps.push(deepClone(current));
      }
    }

    current = endPhase(current);
    steps.push(deepClone(current));
  }

  return steps;
}
