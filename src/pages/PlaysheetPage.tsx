import { useState } from 'react';
import { useCharacter } from '../context/CharacterContext';
import { useGameState, WOUND_LABELS, WOUND_PENALTIES, type WoundLevel } from '../context/GameStateContext';
import { ASPECTS, FUNCTIONS, ATTRIBUTES, type AspectName, type AttributeName, type ArmorAttributeName } from '../types/character';
import { ICONS, DEFAULT_ICON, type IconEntry } from '../data/icons';
import { DIE_POOL_TABLE } from '../data/diePoolTable';
import type { DiePoolEntry } from '../data/diePoolTable';
import { resolveTest } from '../utils/resolution';

const DEFENSE_ATTRIBUTES: Record<AspectName, AttributeName> = {
  Form: 'Toughness',
  Flesh: 'Endurance',
  Mind: 'Willpower',
  Spirit: 'Resilience',
};

const HEALING_ATTRIBUTES: Record<AspectName, AttributeName> = {
  Form: 'Endurance',    // Form wounds healed by Flesh
  Flesh: 'Endurance',   // Flesh wounds healed by Flesh
  Mind: 'Willpower',    // Mind wounds healed by Mind
  Spirit: 'Resilience', // Spirit wounds healed by Spirit
};

export function PlaysheetPage() {
  const character = useCharacter();
  const gameState = useGameState();
  const [activeHealAspect, setActiveHealAspect] = useState<AspectName | null>(null);
  const [healPoolRank, setHealPoolRank] = useState(5); // Default: d12
  const [healSkillBonus, setHealSkillBonus] = useState(0);
  const [healModifier, setHealModifier] = useState(0);
  const [healResult, setHealResult] = useState<{ aspect: AspectName; successes: number; roll: number } | null>(null);

  const renderIcon = (icon: IconEntry) => {
    return icon.library === 'fontawesome' ? (
      <i className={icon.faClass || 'fa-solid fa-user'}></i>
    ) : (
      <span className="ei-icon">{icon.eiChar}</span>
    );
  };

  const currentSurge = character.computedCharacter.surge - gameState.surgeSpent;
  const surgePercentage = (currentSurge / character.computedCharacter.surge) * 100;

  // Check if restoration points would heal the wound
  const wouldHeal = (aspect: AspectName) => {
    const currentLevel = gameState.wounds[aspect];
    if (currentLevel <= 1) return false;
    const pointsNeeded = currentLevel;
    return gameState.restorationPoints[aspect] >= pointsNeeded;
  };

  // Apply healing if restoration points are sufficient
  const applyHealing = (aspect: AspectName) => {
    const currentLevel = gameState.wounds[aspect];
    if (currentLevel <= 1) return;
    const pointsNeeded = currentLevel;
    if (gameState.restorationPoints[aspect] >= pointsNeeded) {
      gameState.setWound(aspect, (currentLevel - 1) as WoundLevel);
      gameState.addRestorationPoints(aspect, -pointsNeeded);
    }
  };

  // Natural healing roll using the resolution system
  const rollNaturalHealing = (aspect: AspectName) => {
    const healingAttr = HEALING_ATTRIBUTES[aspect];
    const diePoolEntry = character.attributeDiePools[healingAttr];
    
    const result = resolveTest({
      attributePool: diePoolEntry.pool,
      poolRank: diePoolEntry.rank,
      skillBonus: 0, // Natural healing doesn't use skill
      woundPenalty: gameState.woundPenalty,
      situationalModifier: gameState.totalModifier,
      isContest: false,
      targetNumber: 4,
      approach: 'roll',
    });
    
    if (result.successes > 0) {
      gameState.addRestorationPoints(aspect, result.successes);
    }
    
    setHealResult({
      aspect,
      successes: result.successes,
      roll: result.result,
    });
  };

  // Aided healing roll using the resolution system
  const rollAidedHealing = (aspect: AspectName) => {
    const poolEntry = DIE_POOL_TABLE.find((e: DiePoolEntry) => e.rank === healPoolRank) || DIE_POOL_TABLE[5];
    
    const result = resolveTest({
      attributePool: poolEntry.pool,
      poolRank: healPoolRank,
      skillBonus: healSkillBonus,
      woundPenalty: gameState.woundPenalty,
      situationalModifier: healModifier,
      isContest: false,
      targetNumber: 4,
      approach: 'roll',
    });
    
    if (result.successes > 0) {
      gameState.addRestorationPoints(aspect, result.successes);
    }
    
    setHealResult({
      aspect,
      successes: result.successes,
      roll: result.result,
    });
    setActiveHealAspect(null);
  };

  if (!character.hasCharacter) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <div className="bg-slate-800 rounded-lg p-8">
          <h2 className="text-xl font-bold text-amber-400 mb-4">No Avatar Loaded</h2>
          <p className="text-slate-400 mb-6">
            Build an avatar in the Avatar Builder first, then switch to the Playsheet.
          </p>
          <a
            href="/"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 px-6 py-2 rounded font-medium transition-colors"
          >
            Go to Avatar Builder
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Character Header */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl">
            {renderIcon(ICONS.find(i => i.code === character.avatarIcon) || DEFAULT_ICON)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-400">{character.name || 'Unnamed Avatar'}</h1>
            <div className="text-sm text-slate-400">
              {character.computedCharacter.totalPointsSpent} / {character.campaignLimit} points
              {character.computedCharacter.stuff !== 0 && (
                <span className="ml-4">
                  {character.computedCharacter.stuff > 0 ? '🌕' : '🌑'}{' '}
                  {Math.abs(character.computedCharacter.stuff)} {character.computedCharacter.stuff > 0 ? 'Good' : 'Bad'} Stuff
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Healing Result Toast */}
      {healResult && (
        <div className="bg-slate-800 rounded-lg p-4 border border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-400">Healing {healResult.aspect}: </span>
              <span className="text-white font-bold">Rolled {healResult.roll}</span>
              {healResult.successes > 0 ? (
                <span className="text-green-400 ml-2">+{healResult.successes} restoration point{healResult.successes > 1 ? 's' : ''}</span>
              ) : (
                <span className="text-red-400 ml-2">No restoration points</span>
              )}
            </div>
            <button
              onClick={() => setHealResult(null)}
              className="text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Attributes & Die Pools */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attributes Grid */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-bold text-amber-400 mb-4">Attributes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    <th className="p-2"></th>
                    {ASPECTS.map(aspect => (
                      <th key={aspect.id} className="p-2 text-center border-b border-slate-600">
                        <div className="font-bold text-amber-300">{aspect.emoji} {aspect.name}</div>
                        <div className="text-xs text-slate-400">
                          {character.aspects[aspect.id] >= 0 ? '+' : ''}{character.aspects[aspect.id]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FUNCTIONS.map(func => {
                    const funcRating = character.functions[func.id];
                    return (
                      <tr key={func.id}>
                        <td className="p-2 text-xl">{func.emoji}</td>
                        <td className="p-2 border-b border-slate-700">
                          <div className="font-bold text-amber-300">{func.name}</div>
                          <div className="text-xs text-slate-400">
                            {funcRating >= 0 ? '+' : ''}{funcRating}
                          </div>
                        </td>
                        {ASPECTS.map(aspect => {
                          const attr = ATTRIBUTES.find(a => a.func === func.id && a.aspect === aspect.id);
                          if (!attr) return <td key={aspect.id} className="p-2"></td>;
                          const entry = character.attributeDiePools[attr.id];
                          return (
                            <td key={aspect.id} className="p-2 text-center border-b border-slate-700">
                              <div className="font-medium text-slate-200">{attr.name}</div>
                              <div className="text-xs text-slate-400">Rank {entry.rank}</div>
                              <div className="text-sm font-bold text-cyan-400">{entry.pool.notation}</div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Skills */}
          {character.skills.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="text-lg font-bold text-amber-400 mb-4">Skills</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {character.skills.map(skillEntry => {
                  const skill = character.skills.find(s => s.skillId === skillEntry.skillId);
                  const rating = character.skills.find(s => s.skillId === skillEntry.skillId);
                  if (!skill) return null;
                  const skillData = { ...skillEntry, ...rating };
                  return (
                    <div key={skillEntry.skillId} className="bg-slate-700/50 rounded p-2 text-sm">
                      <div className="font-medium">{skillData.skillId}</div>
                      <div className="text-xs text-slate-400">
                        {skillData.rating} ({skillData.rating === 'Poor' ? '-1' : skillData.rating === 'Average' ? '0' : `+${['Good', 'Great', 'Exceptional', 'Extraordinary'].indexOf(skillData.rating) + 1}`}/die)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Powers */}
          {character.powers.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="text-lg font-bold text-amber-400 mb-4">Powers</h2>
              <div className="grid md:grid-cols-2 gap-2">
                {character.powers.map(powerEntry => (
                  <div key={powerEntry.id} className="bg-slate-700/50 rounded p-2 text-sm">
                    <div className="font-medium">{powerEntry.label || powerEntry.powerId}</div>
                    <div className="text-xs text-slate-400">{powerEntry.points} pts</div>
                    {powerEntry.description && (
                      <div className="text-xs text-slate-500 mt-1">{powerEntry.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Play State */}
        <div className="space-y-6">
          {/* Surge Tracker */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-bold text-amber-400 mb-4">⚡ Surge</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current</span>
                <span className={`text-2xl font-bold ${currentSurge <= 0 ? 'text-red-400' : currentSurge <= 2 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                  {currentSurge} / {character.computedCharacter.surge}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    currentSurge <= 0 ? 'bg-red-500' : currentSurge <= 2 ? 'bg-yellow-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.max(0, surgePercentage)}%` }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => gameState.spendSurge(1)}
                  disabled={currentSurge <= 0}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 px-3 py-2 rounded text-sm transition-colors"
                >
                  🟨 Spend 1
                </button>
                <button
                  onClick={() => gameState.spendSurge(2)}
                  disabled={currentSurge <= 1}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 px-3 py-2 rounded text-sm transition-colors"
                >
                  🟧 Spend 2
                </button>
                <button
                  onClick={() => gameState.spendSurge(3)}
                  disabled={currentSurge <= 2}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 px-3 py-2 rounded text-sm transition-colors"
                >
                  🟥 Spend 3
                </button>
              </div>
              <button
                onClick={gameState.resetSurge}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded text-sm transition-colors"
              >
                🌅 Long Rest (Reset Surge)
              </button>
            </div>
          </div>

          {/* Wounds */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-bold text-amber-400 mb-2">🩸 Wounds</h2>
            {gameState.woundPenalty < 0 && (
              <div className="mb-3 p-2 bg-red-900/30 border border-red-500/50 rounded text-sm text-red-400">
                Global Penalty: {gameState.woundPenalty}/die
              </div>
            )}
            <div className="space-y-3">
              {ASPECTS.map(aspect => {
                const woundLevel = gameState.wounds[aspect.id];
                const woundInfo = WOUND_LABELS[woundLevel];
                const defenseAttr = DEFENSE_ATTRIBUTES[aspect.id];
                const diePool = character.attributeDiePools[defenseAttr];
                const armor = gameState.armor[defenseAttr as ArmorAttributeName];
                const restoration = gameState.restorationPoints[aspect.id];
                const canHeal = wouldHeal(aspect.id);
                const healingAttr = HEALING_ATTRIBUTES[aspect.id];
                const healingPool = character.attributeDiePools[healingAttr];

                return (
                  <div key={aspect.id} className="bg-slate-700/50 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{aspect.emoji}</span>
                        <span className="font-medium">{aspect.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {woundInfo.emoji && <span>{woundInfo.emoji}</span>}
                        <select
                          value={woundLevel}
                          onChange={(e) => gameState.setWound(aspect.id, parseInt(e.target.value) as WoundLevel)}
                          className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {Array.from({ length: 9 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? 'None' : `L${i} ${WOUND_LABELS[i as WoundLevel].label}`}
                              {WOUND_PENALTIES[i as WoundLevel] < 0 ? ` (${WOUND_PENALTIES[i as WoundLevel]}/die)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Defense: {diePool.pool.notation} + {armor} armor</span>
                      {woundLevel > 2 && (
                        <span>
                          Heal: {restoration}/{woundLevel} pts
                          {canHeal && (
                            <button
                              onClick={() => applyHealing(aspect.id)}
                              className="ml-2 text-green-400 hover:text-green-300"
                            >
                              ✓ Apply
                            </button>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Healing controls */}
                    {woundLevel > 1 && (
                      <div className="mt-2 pt-2 border-t border-slate-600">
                        <div className="flex gap-2">
                          <button
                            onClick={() => rollNaturalHealing(aspect.id)}
                            className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 px-2 py-1 rounded text-xs"
                          >
                            🎲 Natural ({healingPool.pool.notation})
                          </button>
                          <button
                            onClick={() => setActiveHealAspect(activeHealAspect === aspect.id ? null : aspect.id)}
                            className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 px-2 py-1 rounded text-xs"
                          >
                            💚 Aided Heal
                          </button>
                        </div>
                        
                        {activeHealAspect === aspect.id && (
                          <div className="mt-2 space-y-2">
                            <select
                              value={healPoolRank}
                              onChange={(e) => setHealPoolRank(parseInt(e.target.value))}
                              className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs"
                            >
                              {DIE_POOL_TABLE.map((entry: DiePoolEntry) => (
                                <option key={entry.rank} value={entry.rank}>
                                  {entry.pool.notation} (Rank {entry.rank})
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Skill</label>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setHealSkillBonus(Math.max(-1, healSkillBonus - 1))}
                                    className="bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded text-xs"
                                  >
                                    -
                                  </button>
                                  <span className={`flex-1 text-center ${healSkillBonus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {healSkillBonus >= 0 ? '+' : ''}{healSkillBonus}
                                  </span>
                                  <button
                                    onClick={() => setHealSkillBonus(Math.min(4, healSkillBonus + 1))}
                                    className="bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Mod</label>
                                <input
                                  type="number"
                                  value={healModifier}
                                  onChange={(e) => setHealModifier(parseInt(e.target.value) || 0)}
                                  className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-xs text-center"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => rollAidedHealing(aspect.id)}
                              className="w-full bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs"
                            >
                              🎲 Roll Healing
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Armor */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-bold text-amber-400 mb-4">🛡️ Armor</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['Toughness', 'Endurance', 'Willpower', 'Resilience'] as const).map(defense => (
                <div key={defense} className="flex items-center gap-2">
                  <label className="text-sm text-slate-400 w-20">{defense}</label>
                  <input
                    type="number"
                    value={gameState.armor[defense]}
                    onChange={(e) => gameState.setArmor(defense, parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Temporary Modifiers */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-bold text-amber-400 mb-4">📊 Modifiers</h2>
            
            {gameState.modifiers.length > 0 && (
              <div className="space-y-1 mb-3">
                {gameState.modifiers.map(mod => (
                  <div key={mod.id} className="flex items-center justify-between bg-slate-700/50 rounded px-2 py-1 text-sm">
                    <span>{mod.description}</span>
                    <div className="flex items-center gap-2">
                      <span className={mod.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {mod.value >= 0 ? '+' : ''}{mod.value}
                      </span>
                      <button
                        onClick={() => gameState.removeModifier(mod.id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div className="text-sm text-slate-400 pt-2 border-t border-slate-600">
                  Total: <span className={gameState.totalModifier >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {gameState.totalModifier >= 0 ? '+' : ''}{gameState.totalModifier}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Description"
                id="mod-description"
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
              />
              <input
                type="number"
                placeholder="+/-"
                id="mod-value"
                className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-center"
              />
              <button
                onClick={() => {
                  const desc = (document.getElementById('mod-description') as HTMLInputElement).value;
                  const val = parseInt((document.getElementById('mod-value') as HTMLInputElement).value) || 0;
                  if (desc) {
                    gameState.addModifier(desc, val);
                    (document.getElementById('mod-description') as HTMLInputElement).value = '';
                    (document.getElementById('mod-value') as HTMLInputElement).value = '';
                  }
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1 rounded text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={gameState.resetAll}
            className="w-full bg-red-900/50 hover:bg-red-800/50 border border-red-500/50 text-red-400 px-4 py-2 rounded text-sm transition-colors"
          >
            🔄 Reset All Play State
          </button>
        </div>
      </div>
    </div>
  );
}