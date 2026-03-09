import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { AspectName } from '../types/character';

export type WoundLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface WoundState {
  Form: WoundLevel;
  Flesh: WoundLevel;
  Mind: WoundLevel;
  Spirit: WoundLevel;
}

export interface RestorationPoints {
  Form: number;
  Flesh: number;
  Mind: number;
  Spirit: number;
}

export interface TemporaryModifier {
  id: string;
  description: string;
  value: number;
}

export interface ArmorValues {
  Toughness: number;
  Endurance: number;
  Willpower: number;
  Resilience: number;
}

interface GameStateContextValue {
  // Surge
  surgeSpent: number;
  spendSurge: (amount: number) => void;
  resetSurge: () => void;
  
  // Wounds
  wounds: WoundState;
  setWound: (aspect: AspectName, level: WoundLevel) => void;
  woundPenalty: number; // Highest penalty from any aspect
  
  // Restoration points (for healing)
  restorationPoints: RestorationPoints;
  addRestorationPoints: (aspect: AspectName, points: number) => void;
  clearRestorationPoints: (aspect: AspectName) => void;
  
  // Armor
  armor: ArmorValues;
  setArmor: (defense: keyof ArmorValues, value: number) => void;
  
  // Temporary modifiers
  modifiers: TemporaryModifier[];
  addModifier: (description: string, value: number) => void;
  removeModifier: (id: string) => void;
  totalModifier: number;
  
  // Reset all
  resetAll: () => void;
}

const WOUND_PENALTIES: Record<WoundLevel, number> = {
  0: 0,   // No wound
  1: 0,   // Near Miss
  2: 0,   // Scrape
  3: -1,  // Wound
  4: -2,  // Bleeding Wound
  5: -3,  // Life-Threatening
  6: -4,  // Maimed
  7: -5,  // Mortal Wound
  8: -6,  // Death Blow
};

const WOUND_LABELS: Record<WoundLevel, { label: string; emoji: string }> = {
  0: { label: 'None', emoji: '' },
  1: { label: 'Near Miss', emoji: '⚠️' },
  2: { label: 'Scrape', emoji: '🟢' },
  3: { label: 'Wound', emoji: '🟡' },
  4: { label: 'Bleeding Wound', emoji: '🟠' },
  5: { label: 'Life-Threatening', emoji: '🔴' },
  6: { label: 'Maimed', emoji: '🦿' },
  7: { label: 'Mortal Wound', emoji: '☠️' },
  8: { label: 'Death Blow', emoji: '⚰️' },
};

const defaultWounds: WoundState = {
  Form: 0,
  Flesh: 0,
  Mind: 0,
  Spirit: 0,
};

const defaultRestoration: RestorationPoints = {
  Form: 0,
  Flesh: 0,
  Mind: 0,
  Spirit: 0,
};

const defaultArmor: ArmorValues = {
  Toughness: 0,
  Endurance: 0,
  Willpower: 0,
  Resilience: 0,
};

const GameStateContext = createContext<GameStateContextValue | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [surgeSpent, setSurgeSpent] = useState(0);
  const [wounds, setWounds] = useState<WoundState>(defaultWounds);
  const [restorationPoints, setRestorationPoints] = useState<RestorationPoints>(defaultRestoration);
  const [armor, setArmorState] = useState<ArmorValues>(defaultArmor);
  const [modifiers, setModifiers] = useState<TemporaryModifier[]>([]);

  const spendSurge = useCallback((amount: number) => {
    setSurgeSpent(prev => prev + amount);
  }, []);

  const resetSurge = useCallback(() => {
    setSurgeSpent(0);
  }, []);

  const setWound = useCallback((aspect: AspectName, level: WoundLevel) => {
    setWounds(prev => ({ ...prev, [aspect]: level }));
  }, []);

  const woundPenalty = useMemo(() => {
    return Math.min(
      WOUND_PENALTIES[wounds.Form],
      WOUND_PENALTIES[wounds.Flesh],
      WOUND_PENALTIES[wounds.Mind],
      WOUND_PENALTIES[wounds.Spirit]
    );
  }, [wounds]);

  const addRestorationPoints = useCallback((aspect: AspectName, points: number) => {
    setRestorationPoints(prev => ({
      ...prev,
      [aspect]: prev[aspect] + points,
    }));
  }, []);

  const clearRestorationPoints = useCallback((aspect: AspectName) => {
    setRestorationPoints(prev => ({
      ...prev,
      [aspect]: 0,
    }));
  }, []);

  const setArmor = useCallback((defense: keyof ArmorValues, value: number) => {
    setArmorState(prev => ({ ...prev, [defense]: Math.max(0, value) }));
  }, []);

  const addModifier = useCallback((description: string, value: number) => {
    const id = crypto.randomUUID();
    setModifiers(prev => [...prev, { id, description, value }]);
  }, []);

  const removeModifier = useCallback((id: string) => {
    setModifiers(prev => prev.filter(m => m.id !== id));
  }, []);

  const totalModifier = useMemo(() => {
    return modifiers.reduce((sum, m) => sum + m.value, 0);
  }, [modifiers]);

  const resetAll = useCallback(() => {
    setSurgeSpent(0);
    setWounds(defaultWounds);
    setRestorationPoints(defaultRestoration);
    setArmorState(defaultArmor);
    setModifiers([]);
  }, []);

  const value: GameStateContextValue = {
    surgeSpent,
    spendSurge,
    resetSurge,
    wounds,
    setWound,
    woundPenalty,
    restorationPoints,
    addRestorationPoints,
    clearRestorationPoints,
    armor,
    setArmor,
    modifiers,
    addModifier,
    removeModifier,
    totalModifier,
    resetAll,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}

export { WOUND_PENALTIES, WOUND_LABELS };