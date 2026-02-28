import type { Character, AttributeName, FunctionName, DiePool } from '../types/character';
import { ATTRIBUTES, SKILL_RATINGS } from '../types/character';
import { getDiePool, DIE_POOL_TABLE } from '../data/diePoolTable';

// Calculate attribute value from function + aspect ratings
export function calculateAttribute(
  funcRating: number,
  aspectRating: number
): number {
  return funcRating + aspectRating;
}

// Calculate die pool sum from attribute value
export function attributeToDiePoolSum(attrValue: number): number {
  const clampedValue = Math.max(-35, Math.min(60, attrValue));
  const entry = DIE_POOL_TABLE.find(e => e.cost === clampedValue);
  if (entry) {
    return entry.pool.dice.reduce((sum, d) => sum + d, 0);
  }
  // Interpolate
  const sorted = [...DIE_POOL_TABLE].sort((a, b) => a.cost - b.cost);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].cost <= clampedValue && sorted[i + 1].cost > clampedValue) {
      return sorted[i].pool.dice.reduce((sum, d) => sum + d, 0);
    }
  }
  return 48; // 4d12
}

// Calculate skill cap (based on Willpower)
export function calculateSkillCap(willpowerPool: number): number {
  const cap = Math.floor(willpowerPool / 4);
  return Math.min(cap, 4); // Hard max of Extraordinary (+4)
}

// Calculate skill maximum (based on Memory)
export function calculateSkillMaximum(memoryPool: number): number {
  return Math.floor(memoryPool / 2);
}

// Calculate total skill bonuses
export function calculateTotalSkillBonuses(skills: Character['skills']): number {
  return skills.reduce((total, skill) => {
    const rating = SKILL_RATINGS.find(r => r.rating === skill.rating);
    return total + (rating?.modifier ?? 0);
  }, 0);
}

// Calculate skill point costs
export function calculateSkillCosts(skills: Character['skills']): number {
  return skills.reduce((total, skill) => {
    const rating = SKILL_RATINGS.find(r => r.rating === skill.rating);
    return total + (rating?.cost ?? 0);
  }, 0);
}

// Calculate surge points
export function calculateSurge(
  diePools: Record<AttributeName, DiePool>,
  stuff: number
): number {
  // Calculate total dice count for each Function
  const functionDice: Record<FunctionName, number> = {
    Resist: 0,
    Adapt: 0,
    Perceive: 0,
    Force: 0,
  };

  // Sum dice counts per function
  ATTRIBUTES.forEach(attr => {
    const pool = diePools[attr.id];
    const diceCount = pool.dice.length; // Count of dice, not sum of values
    functionDice[attr.func] += diceCount;
  });

  // Find highest function's dice count (base surge)
  const baseSurge = Math.max(
    functionDice['Resist'],
    functionDice['Adapt'],
    functionDice['Perceive'],
    functionDice['Force']
  );

  // Stuff adjustment: every 5 points adds/subtracts 1
  const stuffModifier = Math.floor(stuff / 5);

  return Math.max(1, baseSurge + stuffModifier);
}

// Calculate stuff (good or bad)
export function calculateStuff(campaignLimit: number, pointsSpent: number): number {
  return campaignLimit - pointsSpent;
}

// Build a complete computed character
export function computeCharacter(
  name: string,
  campaignLimit: number,
  aspects: Character['aspects'],
  functions: Character['functions'],
  skills: Character['skills'],
  powers: Character['powers'],
  artifacts: Character['artifacts'],
  allies: Character['allies'],
  personalShadows: Character['personalShadows']
): Character {
  // Calculate all attributes
  const attributes: Record<AttributeName, number> = {} as Record<AttributeName, number>;
  const diePools: Record<AttributeName, { dice: number[]; notation: string; min: number; max: number }> = 
    {} as Record<AttributeName, { dice: number[]; notation: string; min: number; max: number }>;
  
  ATTRIBUTES.forEach(attr => {
    const value = calculateAttribute(
      functions[attr.func],
      aspects[attr.aspect]
    );
    attributes[attr.id] = value;
    diePools[attr.id] = getDiePool(value);
  });
  
  // Calculate derived values
  const willpowerPool = diePools['Willpower'].dice.reduce((sum, d) => sum + d, 0);
  const memoryPool = diePools['Memory'].dice.reduce((sum, d) => sum + d, 0);
  
  const skillCap = calculateSkillCap(willpowerPool);
  const skillMaximum = calculateSkillMaximum(memoryPool);
  
  // Calculate total points
  let totalPointsSpent = 0;
  
  // Aspects
  totalPointsSpent += aspects.Form;
  totalPointsSpent += aspects.Flesh;
  totalPointsSpent += aspects.Mind;
  totalPointsSpent += aspects.Spirit;
  
  // Functions
  totalPointsSpent += functions.Resist;
  totalPointsSpent += functions.Adapt;
  totalPointsSpent += functions.Perceive;
  totalPointsSpent += functions.Force;
  
  // Skills
  skills.forEach(skill => {
    const rating = SKILL_RATINGS.find(r => r.rating === skill.rating);
    if (rating) totalPointsSpent += rating.cost;
  });
  
  // Artifacts, allies, shadows
  totalPointsSpent += artifacts.reduce((sum, a) => sum + a.cost, 0);
  totalPointsSpent += allies.reduce((sum, a) => sum + a.cost, 0);
  totalPointsSpent += personalShadows.reduce((sum, s) => sum + s.cost, 0);
  
  const stuff = calculateStuff(campaignLimit, totalPointsSpent);
  const surge = calculateSurge(diePools, stuff);
  return {
    name,
    campaignLimit,
    aspects,
    functions,
    skills,
    powers,
    artifacts,
    allies,
    personalShadows,
    attributes,
    diePools,
    skillCap,
    skillMaximum,
    totalPointsSpent,
    stuff,
    surge,
  };
}
