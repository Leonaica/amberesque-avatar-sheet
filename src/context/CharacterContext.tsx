import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import type {
  CharacterSkill,
  CharacterPower,
  Artifact,
  Ally,
  PersonalShadow,
  CharacterAspectRatings,
  CharacterFunctionRatings,
  AttributeName,
} from '../types/character';
import { ATTRIBUTES } from '../types/character';
import { getDiePoolEntry } from '../data/diePoolTable';
import { computeCharacter } from '../utils/calculations';
import { DEFAULT_ICON } from '../data/icons';

interface CharacterState {
  name: string;
  campaignLimit: number;
  avatarIcon: string;
  aspects: CharacterAspectRatings;
  functions: CharacterFunctionRatings;
  aspectExplanations: Record<string, string>;
  functionExplanations: Record<string, string>;
  skills: CharacterSkill[];
  powers: CharacterPower[];
  artifacts: Artifact[];
  allies: Ally[];
  personalShadows: PersonalShadow[];
}

interface CharacterContextValue extends CharacterState {
  // Computed values
  computedCharacter: ReturnType<typeof computeCharacter>;
  attributeValues: Record<AttributeName, number>;
  attributeDiePools: Record<AttributeName, ReturnType<typeof getDiePoolEntry>>;
  
  // Actions
  setName: (name: string | ((prev: string) => string)) => void;
  setCampaignLimit: (limit: number | ((prev: number) => number)) => void;
  setAvatarIcon: (icon: string | ((prev: string) => string)) => void;
  setAspects: (aspects: CharacterAspectRatings | ((prev: CharacterAspectRatings) => CharacterAspectRatings)) => void;
  setFunctions: (functions: CharacterFunctionRatings | ((prev: CharacterFunctionRatings) => CharacterFunctionRatings)) => void;
  setAspectExplanation: (aspectId: string, explanation: string) => void;
  setFunctionExplanation: (functionId: string, explanation: string) => void;
  setSkills: (skills: CharacterSkill[] | ((prev: CharacterSkill[]) => CharacterSkill[])) => void;
  setPowers: (powers: CharacterPower[] | ((prev: CharacterPower[]) => CharacterPower[])) => void;
  setArtifacts: (artifacts: Artifact[] | ((prev: Artifact[]) => Artifact[])) => void;
  setAllies: (allies: Ally[] | ((prev: Ally[]) => Ally[])) => void;
  setPersonalShadows: (shadows: PersonalShadow[] | ((prev: PersonalShadow[]) => PersonalShadow[])) => void;
  
  // Bulk operations
  loadCharacter: (data: Partial<CharacterState>) => void;
  saveCharacter: () => string;
  hasCharacter: boolean;
}

const defaultAspects: CharacterAspectRatings = {
  Form: 0,
  Flesh: 0,
  Mind: 0,
  Spirit: 0,
};

const defaultFunctions: CharacterFunctionRatings = {
  Resist: 0,
  Adapt: 0,
  Perceive: 0,
  Force: 0,
};

const CharacterContext = createContext<CharacterContextValue | null>(null);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [nameState, setNameState] = useState('');
  const [campaignLimitState, setCampaignLimitState] = useState(100);
  const [avatarIconState, setAvatarIconState] = useState<string>(DEFAULT_ICON.code);
  const [aspectsState, setAspectsState] = useState<CharacterAspectRatings>(defaultAspects);
  const [functionsState, setFunctionsState] = useState<CharacterFunctionRatings>(defaultFunctions);
  const [aspectExplanationsState, setAspectExplanationsState] = useState<Record<string, string>>({});
  const [functionExplanationsState, setFunctionExplanationsState] = useState<Record<string, string>>({});
  const [skillsState, setSkillsState] = useState<CharacterSkill[]>([]);
  const [powersState, setPowersState] = useState<CharacterPower[]>([]);
  const [artifactsState, setArtifactsState] = useState<Artifact[]>([]);
  const [alliesState, setAlliesState] = useState<Ally[]>([]);
  const [personalShadowsState, setPersonalShadowsState] = useState<PersonalShadow[]>([]);

  // Wrapper setters that support both direct values and callback functions
  const setName = useCallback((value: string | ((prev: string) => string)) => {
    setNameState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setCampaignLimit = useCallback((value: number | ((prev: number) => number)) => {
    setCampaignLimitState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setAvatarIcon = useCallback((value: string | ((prev: string) => string)) => {
    setAvatarIconState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setAspects = useCallback((value: CharacterAspectRatings | ((prev: CharacterAspectRatings) => CharacterAspectRatings)) => {
    setAspectsState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setFunctions = useCallback((value: CharacterFunctionRatings | ((prev: CharacterFunctionRatings) => CharacterFunctionRatings)) => {
    setFunctionsState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setSkills = useCallback((value: CharacterSkill[] | ((prev: CharacterSkill[]) => CharacterSkill[])) => {
    setSkillsState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setPowers = useCallback((value: CharacterPower[] | ((prev: CharacterPower[]) => CharacterPower[])) => {
    setPowersState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setArtifacts = useCallback((value: Artifact[] | ((prev: Artifact[]) => Artifact[])) => {
    setArtifactsState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setAllies = useCallback((value: Ally[] | ((prev: Ally[]) => Ally[])) => {
    setAlliesState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const setPersonalShadows = useCallback((value: PersonalShadow[] | ((prev: PersonalShadow[]) => PersonalShadow[])) => {
    setPersonalShadowsState(prev => typeof value === 'function' ? value(prev) : value);
  }, []);

  const computedCharacter = useMemo(() => {
    return computeCharacter(nameState, campaignLimitState, aspectsState, functionsState, skillsState, powersState, artifactsState, alliesState, personalShadowsState);
  }, [nameState, campaignLimitState, aspectsState, functionsState, skillsState, powersState, artifactsState, alliesState, personalShadowsState]);

  const attributeValues = useMemo(() => {
    const values: Record<AttributeName, number> = {} as Record<AttributeName, number>;
    for (const attr of ATTRIBUTES) {
      values[attr.id] = functionsState[attr.func] + aspectsState[attr.aspect];
    }
    return values;
  }, [aspectsState, functionsState]);

  const attributeDiePools = useMemo(() => {
    const pools: Record<AttributeName, ReturnType<typeof getDiePoolEntry>> = {} as Record<AttributeName, ReturnType<typeof getDiePoolEntry>>;
    for (const attr of ATTRIBUTES) {
      pools[attr.id] = getDiePoolEntry(attributeValues[attr.id]);
    }
    return pools;
  }, [attributeValues]);

  const setAspectExplanation = useCallback((aspectId: string, explanation: string) => {
    setAspectExplanationsState(prev => ({ ...prev, [aspectId]: explanation }));
  }, []);

  const setFunctionExplanation = useCallback((functionId: string, explanation: string) => {
    setFunctionExplanationsState(prev => ({ ...prev, [functionId]: explanation }));
  }, []);

  const loadCharacter = useCallback((data: Partial<CharacterState>) => {
    if (data.name !== undefined) setNameState(data.name);
    if (data.campaignLimit !== undefined) setCampaignLimitState(data.campaignLimit);
    if (data.avatarIcon !== undefined) setAvatarIconState(data.avatarIcon);
    if (data.aspects) setAspectsState(data.aspects);
    if (data.functions) setFunctionsState(data.functions);
    if (data.aspectExplanations) setAspectExplanationsState(data.aspectExplanations);
    if (data.functionExplanations) setFunctionExplanationsState(data.functionExplanations);
    if (data.skills) setSkillsState(data.skills);
    if (data.powers) setPowersState(data.powers);
    if (data.artifacts) setArtifactsState(data.artifacts);
    if (data.allies) setAlliesState(data.allies);
    if (data.personalShadows) setPersonalShadowsState(data.personalShadows);
  }, []);

  const saveCharacter = useCallback(() => {
    const data = {
      name: nameState,
      avatarIcon: avatarIconState,
      campaignLimit: campaignLimitState,
      aspects: aspectsState,
      functions: functionsState,
      aspectExplanations: aspectExplanationsState,
      functionExplanations: functionExplanationsState,
      skills: skillsState,
      powers: powersState,
      artifacts: artifactsState,
      allies: alliesState,
      personalShadows: personalShadowsState,
    };
    return JSON.stringify(data, null, 2);
  }, [nameState, avatarIconState, campaignLimitState, aspectsState, functionsState, aspectExplanationsState, functionExplanationsState, skillsState, powersState, artifactsState, alliesState, personalShadowsState]);

const hasCharacter = nameState.trim() !== '' || skillsState.length > 0 || powersState.length > 0;

const value: CharacterContextValue = {
  name: nameState,
  campaignLimit: campaignLimitState,
  avatarIcon: avatarIconState,
  aspects: aspectsState,
  functions: functionsState,
  aspectExplanations: aspectExplanationsState,
  functionExplanations: functionExplanationsState,
  skills: skillsState,
  powers: powersState,
  artifacts: artifactsState,
  allies: alliesState,
  personalShadows: personalShadowsState,
  computedCharacter,
  attributeValues,
  attributeDiePools,
  setName,
  setCampaignLimit,
  setAvatarIcon,
  setAspects,
  setFunctions,
  setAspectExplanation,
  setFunctionExplanation,
  setSkills,
  setPowers,
  setArtifacts,
  setAllies,
  setPersonalShadows,
  loadCharacter,
  saveCharacter,
  hasCharacter,
};

  return (
    <CharacterContext.Provider value={value}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  const context = useContext(CharacterContext);
  if (!context) {
    throw new Error('useCharacter must be used within a CharacterProvider');
  }
  return context;
}