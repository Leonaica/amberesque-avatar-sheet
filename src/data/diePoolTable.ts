import type { DiePool } from '../types/character';

export interface DiePoolEntry {
  cost: number;
  pool: DiePool;
  amberRanking: string;
}

export const DIE_POOL_TABLE: DiePoolEntry[] = [
  { cost: -40, pool: { dice: [4], notation: 'd4÷2', min: 1, max: 2, divisor: 2 }, amberRanking: 'Human' },
  { cost: -35, pool: { dice: [4], notation: 'd4', min: 1, max: 4 }, amberRanking: 'Human' },
  { cost: -30, pool: { dice: [6], notation: 'd6', min: 1, max: 6 }, amberRanking: 'Human' },
  { cost: -25, pool: { dice: [8], notation: 'd8', min: 1, max: 8 }, amberRanking: 'Human' },
  { cost: -20, pool: { dice: [10], notation: 'd10', min: 1, max: 10 }, amberRanking: 'Human' },
  { cost: -15, pool: { dice: [12], notation: 'd12', min: 1, max: 12 }, amberRanking: 'Human' },
  { cost: -10, pool: { dice: [12, 4], notation: 'd12 + d4', min: 2, max: 16 }, amberRanking: 'Chaos' },
  { cost: -5, pool: { dice: [12, 6], notation: 'd12 + d6', min: 2, max: 18 }, amberRanking: 'Chaos' },
  { cost: 0, pool: { dice: [12, 8], notation: 'd12 + d8', min: 2, max: 20 }, amberRanking: 'Amber' },
  { cost: 5, pool: { dice: [12, 10], notation: 'd12 + d10', min: 2, max: 22 }, amberRanking: '5' },
  { cost: 10, pool: { dice: [12, 12], notation: '2d12', min: 2, max: 24 }, amberRanking: '10' },
  { cost: 15, pool: { dice: [12, 12, 4], notation: '2d12 + d4', min: 3, max: 28 }, amberRanking: '20' },
  { cost: 20, pool: { dice: [12, 12, 6], notation: '2d12 + d6', min: 3, max: 30 }, amberRanking: '25' },
  { cost: 25, pool: { dice: [12, 12, 8], notation: '2d12 + d8', min: 3, max: 32 }, amberRanking: '30' },
  { cost: 30, pool: { dice: [12, 12, 10], notation: '2d12 + d10', min: 3, max: 34 }, amberRanking: '35' },
  { cost: 35, pool: { dice: [12, 12, 12], notation: '3d12', min: 3, max: 36 }, amberRanking: '40' },
  { cost: 40, pool: { dice: [12, 12, 12, 4], notation: '3d12 + d4', min: 4, max: 40 }, amberRanking: '50' },
  { cost: 45, pool: { dice: [12, 12, 12, 6], notation: '3d12 + d6', min: 4, max: 42 }, amberRanking: '55' },
  { cost: 50, pool: { dice: [12, 12, 12, 8], notation: '3d12 + d8', min: 4, max: 44 }, amberRanking: '60' },
  { cost: 55, pool: { dice: [12, 12, 12, 10], notation: '3d12 + d10', min: 4, max: 46 }, amberRanking: '65' },
  { cost: 60, pool: { dice: [12, 12, 12, 12], notation: '4d12', min: 4, max: 48 }, amberRanking: '70' },
];

export function getDiePool(cost: number): DiePool {
  // Find closest match (attribute costs must be -40 to +60)
  const clampedCost = Math.max(-40, Math.min(60, cost));
  const entry = DIE_POOL_TABLE.find(e => e.cost === clampedCost);
  if (entry) return entry.pool;
  
  // Interpolate if exact match not found
  const sorted = [...DIE_POOL_TABLE].sort((a, b) => a.cost - b.cost);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].cost <= clampedCost && sorted[i + 1].cost > clampedCost) {
      return sorted[i].pool; // Round down
    }
  }
  return DIE_POOL_TABLE[DIE_POOL_TABLE.length - 1].pool;
}
