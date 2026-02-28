import { useState, useMemo } from 'react';
import type { RatingValue, CharacterSkill, CharacterPower, Artifact, Ally, PersonalShadow } from './types/character';
import { ASPECTS, FUNCTIONS, ATTRIBUTES, RATING_SCALE, RATING_LABELS, SKILL_RATINGS } from './types/character';
import { SKILLS } from './data/skills';
import { POWERS } from './data/powers';
import { getDiePool } from './data/diePoolTable';
import { computeCharacter, calculateSkillCosts, calculateTotalSkillBonuses } from './utils/calculations';
import { generateHomebreweryMarkdown } from './utils/homebreweryExport';
import { CharacterSheet } from './components/CharacterSheet';
import './components/CharacterSheet.css';
import { IconPicker } from './components/IconPicker';
import { ICONS, DEFAULT_ICON, type IconEntry } from './data/icons';

function App() {
  // Character state
  const [name, setName] = useState('');
  const [campaignLimit, setCampaignLimit] = useState(100);
  const [avatarIcon, setAvatarIcon] = useState<string>(DEFAULT_ICON.code);
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  const renderIcon = (icon: IconEntry) => {
    return icon.library === 'fontawesome' ? (
      <i className={icon.faClass || 'fa-solid fa-user'}></i>
    ) : (
      <span className="ei-icon">{icon.eiChar}</span>
    );
  };
  
  const [aspects, setAspects] = useState({
    Form: 0 as RatingValue,
    Flesh: 0 as RatingValue,
    Mind: 0 as RatingValue,
    Spirit: 0 as RatingValue,
  });
  
  const [functions, setFunctions] = useState({
    Resist: 0 as RatingValue,
    Adapt: 0 as RatingValue,
    Perceive: 0 as RatingValue,
    Force: 0 as RatingValue,
  });
  
  const [skills, setSkills] = useState<CharacterSkill[]>([]);
  const [powers, setPowers] = useState<CharacterPower[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [allies, setAllies] = useState<Ally[]>([]);
  const [personalShadows, setPersonalShadows] = useState<PersonalShadow[]>([]);
  
  // Computed values
  const computedCharacter = useMemo(() => {
    return computeCharacter(name, campaignLimit, aspects, functions, skills, powers, artifacts, allies, personalShadows);
  }, [name, campaignLimit, aspects, functions, skills, powers, artifacts, allies, personalShadows]);

  // Aspect/Function handlers
  const handleAspectChange = (aspectId: string, value: RatingValue) => {
    setAspects(prev => ({ ...prev, [aspectId]: value }));
  };

  const handleFunctionChange = (functionId: string, value: RatingValue) => {
    setFunctions(prev => ({ ...prev, [functionId]: value }));
  };

  // Skill handlers
  const addSkill = (skillId: string) => {
    if (!skills.find(s => s.skillId === skillId)) {
      setSkills(prev => [...prev, { skillId: skillId as any, rating: 'Average', specialty: '' }]);
    }
  };

  const updateSkill = (skillId: string, updates: Partial<CharacterSkill>) => {
    setSkills(prev => prev.map(s => s.skillId === skillId ? { ...s, ...updates } : s));
  };

  const removeSkill = (skillId: string) => {
    setSkills(prev => prev.filter(s => s.skillId !== skillId));
  };

  // Power handlers
  const addPower = (powerId: string) => {
    const power = POWERS.find(p => p.id === powerId);
    if (!power) return;
  
    if (powers.some(p => p.powerId === powerId)) return;
  
    const defaultPoints = power.levels.length > 0 ? power.levels[0].cost : 0;
    const defaultLabel = power.levels.length > 0 ? power.levels[0].name : power.name;
  
    setPowers([...powers, {
      id: crypto.randomUUID(),
      powerId,
      points: defaultPoints,
      label: defaultLabel,
      description: '',
    }]);
  };

  const updatePowerDescription = (id: string, description: string) => {
    setPowers(powers.map(p => p.id === id ? { ...p, description } : p));
  };

  const updatePowerPoints = (id: string, points: number) => {
    setPowers(powers.map(p => {
      if (p.id !== id) return p;
  
      // Find the power definition
      const power = POWERS.find(pow => pow.id === p.powerId);
      if (!power) return { ...p, points };
  
      // Only auto-update label if it's empty or still at a default value
      // For Minor Powers, never auto-update the label when points change
      if (power.id === 'MinorPower') {
        return { ...p, points };
      }
  
      // Check if label is empty or still a default (matches a level name)
      const isDefaultLabel = !p.label || power.levels.some(l => l.name === p.label);
      
      if (isDefaultLabel) {
        // Find the highest affordable level and use its name as label
        const affordableLevel = [...power.levels].reverse().find(l => points >= l.cost);
        const newLabel = affordableLevel?.name || power.levels[0]?.name || power.name;
        return { ...p, points, label: newLabel };
      }
  
      // User has a custom label, keep it
      return { ...p, points };
    }));
  };

  const updatePowerLabel = (id: string, label: string) => {
    setPowers(prev => prev.map(p => p.id === id ? { ...p, label } : p));
  };

  const removePower = (id: string) => {
    setPowers(prev => prev.filter(p => p.id !== id));
  };

  // Artifact handlers
  const addArtifact = () => {
    setArtifacts(prev => [...prev, {
      id: crypto.randomUUID(),
      name: 'New Artifact',
      description: '',
      cost: 0,
      quantity: 1,
    }]);
  };

  const updateArtifact = (id: string, updates: Partial<Artifact>) => {
    setArtifacts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeArtifact = (id: string) => {
    setArtifacts(prev => prev.filter(a => a.id !== id));
  };

  // Ally handlers
  const addAlly = () => {
    setAllies(prev => [...prev, {
      id: crypto.randomUUID(),
      name: 'New Ally',
      description: '',
      cost: 1,
      loyalty: 1,
    }]);
  };

  const updateAlly = (id: string, updates: Partial<Ally>) => {
    setAllies(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeAlly = (id: string) => {
    setAllies(prev => prev.filter(a => a.id !== id));
  };

  // Shadow handlers
  const addShadow = () => {
    setPersonalShadows(prev => [...prev, {
      id: crypto.randomUUID(),
      name: 'New Shadow',
      description: '',
      cost: 0,
    }]);
  };

  const handleIconSelect = (icon: IconEntry) => {
    setAvatarIcon(icon.code);
  };

  // Export handler
  const handleExportMarkdown = () => {
    const markdown = generateHomebreweryMarkdown(
      name,
      avatarIcon,
      campaignLimit,
      aspects,
      functions,
      skills,
      powers,
      artifacts,
      allies,
      personalShadows,
      computedCharacter.stuff,
      computedCharacter.surge
    );
    
    // Copy to clipboard
    navigator.clipboard.writeText(markdown).then(() => {
      alert('Markdown copied to clipboard!');
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name || 'avatar'}.md`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // JSON Save/Load handlers
  const handleSave = () => {
    const data = {
      name,
      avatarIcon,
      campaignLimit,
      aspects,
      functions,
      skills,
      powers,
      artifacts,
      allies,
      personalShadows,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'avatar'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        setName(data.name || '');
        setAvatarIcon(data.avatarIcon || DEFAULT_ICON.code);
        setCampaignLimit(data.campaignLimit ?? 100);
        setAspects(data.aspects || { Form: 0, Flesh: 0, Mind: 0, Spirit: 0 });
        setFunctions(data.functions || { Resist: 0, Adapt: 0, Perceive: 0, Force: 0 });
        setSkills(data.skills || []);
        setPowers(data.powers || []);
        setArtifacts(data.artifacts || []);
        setAllies(data.allies || []);
        setPersonalShadows(data.personalShadows || []);
        
        alert('Character loaded successfully!');
      } catch (error) {
        alert('Failed to load character file. Make sure it\'s a valid JSON save file.');
      }
    };
    input.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const updateShadow = (id: string, updates: Partial<PersonalShadow>) => {
    setPersonalShadows(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeShadow = (id: string) => {
    setPersonalShadows(prev => prev.filter(s => s.id !== id));
  };

  // Calculate power costs

  const powerCosts = useMemo(() => {
    return powers.reduce((sum, cp) => sum + cp.points, 0);
  }, [powers]);

  // Update total points calculation
  const totalPointsSpent = useMemo(() => {
    let total = 0;
    total += aspects.Form + aspects.Flesh + aspects.Mind + aspects.Spirit;
    total += functions.Resist + functions.Adapt + functions.Perceive + functions.Force;
    total += calculateSkillCosts(skills);
    total += powerCosts;
    total += artifacts.reduce((sum, a) => sum + a.cost * a.quantity, 0);
    total += allies.reduce((sum, a) => sum + a.cost, 0);
    total += personalShadows.reduce((sum, s) => sum + s.cost, 0);
    return total;
  }, [aspects, functions, skills, powerCosts, artifacts, allies, personalShadows]);

  const stuff = campaignLimit - totalPointsSpent;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1"></div>
            <h1 className="text-xl font-bold text-amber-400">Amberesque Avatar Sheet</h1>
            <div className="flex-1 flex justify-end">
              <a
                href="https://storage.googleapis.com/amberesque/Amberesque.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded transition-colors"
              >
                📖 Rules
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-sm text-slate-400 mb-1">Character Name</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowIconPicker(true)}
                  className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-xl hover:bg-slate-600 transition-colors"
                  title="Choose icon"
                >
                  {renderIcon(ICONS.find(i => i.code === avatarIcon) || DEFAULT_ICON)}
                </button>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter name..."
                />
              </div>
            </div>
            <div className="w-32">
              <label className="block text-sm text-slate-400 mb-1">Point Limit</label>
              <input
                type="number"
                value={campaignLimit}
                onChange={(e) => setCampaignLimit(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={handleLoad}
              className="bg-slate-600 hover:bg-slate-500 text-slate-100 px-4 py-2 rounded font-medium transition-colors"
            >
              📂 Load
            </button>
            <button
              onClick={handleSave}
              className="bg-slate-600 hover:bg-slate-500 text-slate-100 px-4 py-2 rounded font-medium transition-colors"
            >
              💾 Save
            </button>
            <button
              onClick={handleExportMarkdown}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2 rounded font-medium transition-colors"
            >
              📜 Export for Homebrewery
            </button>
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-slate-500 text-slate-900 px-4 py-2 rounded font-medium transition-colors"
            >
              🖨️ Print PDF
            </button>
          </div>
        </div>
      </header>

      {/* Summary Bar */}
      <div className="bg-slate-800/50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-400">Spent: </span>
              <span className="font-bold text-amber-400">{totalPointsSpent}</span>
              <span className="text-slate-500"> / {campaignLimit}</span>
            </div>
            <div>
              <span className="text-slate-400">Stuff: </span>
              <span className={`font-bold ${stuff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stuff >= 0 ? `+${stuff} Good` : `${stuff} Bad`}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Surge: </span>
              <span className="font-bold text-cyan-400">{computedCharacter.surge}</span>
            </div>
            <div>
              <span className="text-slate-400">Skill Cap: </span>
              <span className="font-bold text-purple-400">+{computedCharacter.skillCap}</span>
            </div>
            <div>
              <span className="text-slate-400">Skill Max: </span>
              <span className="font-bold text-purple-400">{computedCharacter.skillMaximum}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        
      {/* Step 1: Aspects, Functions, and Attributes */}
        <section className="space-y-6">
          {/* Aspects and Functions side by side */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Aspects */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                <span>🧩</span> Aspects <span className="text-slate-500 text-sm font-normal">(What you are)</span>
              </h2>
              <div className="space-y-3">
                {ASPECTS.map(aspect => (
                  <div key={aspect.id}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">
                        {aspect.emoji} {aspect.name}
                      </label>
                      <span className="text-xs text-slate-400">
                        {aspects[aspect.id] >= 0 ? '+' : ''}{aspects[aspect.id]} pts
                      </span>
                    </div>
                    <select
                      value={aspects[aspect.id]}
                      onChange={(e) => handleAspectChange(aspect.id, parseInt(e.target.value) as RatingValue)}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {RATING_SCALE.map(val => (
                        <option key={val} value={val}>
                          {val >= 0 ? '+' : ''}{val} — {RATING_LABELS[val]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Aspect Total:</span>
                  <span className="font-bold text-amber-400">
                    {Object.values(aspects).reduce<number>((sum, v) => sum + v, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Functions */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                <span>⚡</span> Functions <span className="text-slate-500 text-sm font-normal">(What you do)</span>
              </h2>
              <div className="space-y-3">
                {FUNCTIONS.map(func => (
                  <div key={func.id}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium">
                        {func.emoji} {func.name}
                      </label>
                      <span className="text-xs text-slate-400">
                        {functions[func.id] >= 0 ? '+' : ''}{functions[func.id]} pts
                      </span>
                    </div>
                    <select
                      value={functions[func.id]}
                      onChange={(e) => handleFunctionChange(func.id, parseInt(e.target.value) as RatingValue)}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {RATING_SCALE.map(val => (
                        <option key={val} value={val}>
                          {val >= 0 ? '+' : ''}{val} — {RATING_LABELS[val]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Function Total:</span>
                  <span className="font-bold text-amber-400">
                    {Object.values(functions).reduce<number>((sum, v) => sum + v, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Attributes Grid - 4x4 table */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <span>📊</span> Attributes <span className="text-slate-500 text-sm font-normal">(Derived = Function + Aspect)</span>
            </h2>
            
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
                          {aspects[aspect.id] >= 0 ? '+' : ''}{aspects[aspect.id]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FUNCTIONS.map(func => {
                    const funcRating = functions[func.id];
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
                          const value = funcRating + aspects[aspect.id];
                          const pool = getDiePool(value);
                          return (
                            <td key={aspect.id} className="p-2 text-center border-b border-slate-700">
                              <div className="font-medium text-slate-200">{attr.name}</div>
                              <div className={`text-xs font-bold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {value >= 0 ? '+' : ''}{value}
                              </div>
                              <div className="text-xs text-cyan-400">{pool.notation}</div>
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
        </section>

        {/* Step 2: Skills */}
        <section className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              <span>🎓</span> Skills
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">
                Cap: <span className="text-purple-400">+{computedCharacter.skillCap}</span>
              </span>
              <span className="text-slate-400">
                Used: <span className={calculateTotalSkillBonuses(skills) > computedCharacter.skillMaximum ? 'text-red-400' : 'text-green-400'}>
                  {calculateTotalSkillBonuses(skills)}
                </span> / {computedCharacter.skillMaximum}
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addSkill(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                value=""
              >
                <option value="">+ Add Skill</option>
                {SKILLS.filter(s => !skills.find(cs => cs.skillId === s.id)).map(skill => (
                  <option key={skill.id} value={skill.id}>
                    {skill.emoji} {skill.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {skills.length === 0 ? (
            <p className="text-slate-500 text-sm">No skills selected. Add skills using the dropdown above.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {skills.map(skillEntry => {
                const skill = SKILLS.find(s => s.id === skillEntry.skillId);
                if (!skill) return null;
                return (
                  <div key={skillEntry.skillId} className="bg-slate-700/50 rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">{skill.emoji} {skill.name}</div>
                        <div className="text-xs text-slate-500">{skill.category}</div>
                      </div>
                      <button
                        onClick={() => removeSkill(skillEntry.skillId)}
                        className="text-slate-500 hover:text-red-400 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={skillEntry.rating}
                        onChange={(e) => updateSkill(skillEntry.skillId, { rating: e.target.value as any })}
                        className="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {SKILL_RATINGS
                          .filter(r => {
                            // Always show current rating (even if now invalid due to attribute changes)
                            if (r.rating === skillEntry.rating) return true;
                            
                            // Filter by skill cap (max modifier allowed for this character)
                            if (r.modifier > computedCharacter.skillCap) return false;
                            
                            // Filter by skill maximum (sum of all modifiers must not exceed max)
                            const currentTotal = skills.reduce((sum, s) => {
                              const rating = SKILL_RATINGS.find(sr => sr.rating === s.rating);
                              return sum + (rating?.modifier || 0);
                            }, 0);
                            
                            // Remove modifier of current rating, add modifier of new rating
                            const currentRatingModifier = SKILL_RATINGS.find(sr => sr.rating === skillEntry.rating)?.modifier || 0;
                            const projectedTotal = currentTotal - currentRatingModifier + r.modifier;
                            
                            return projectedTotal <= computedCharacter.skillMaximum;
                          })
                          .map(r => (
                            <option key={r.rating} value={r.rating}>
                              {r.rating} ({r.modifier >= 0 ? '+' : ''}{r.modifier}/die)
                              {r.cost !== 0 ? ` [${r.cost >= 0 ? '+' : ''}${r.cost} pts]` : ''}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <input
                      type="text"
                      value={skillEntry.specialty}
                      onChange={(e) => updateSkill(skillEntry.skillId, { specialty: e.target.value })}
                      placeholder="Specialty..."
                      className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

  {/* Step 3: Powers */}
  <section className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              <span>✨</span> Powers
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">
                Total: <span className="text-amber-400 font-bold">{powerCosts}</span> pts
              </span>
            </div>
          </div>

          {/* Add power buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {POWERS.map(power => (
              <button
                key={power.id}
                onClick={() => addPower(power.id)}
                className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-3 py-1 text-sm transition-colors"
              >
                {power.emoji} {power.name}
              </button>
            ))}
          </div>

          {powers.length === 0 ? (
            <p className="text-slate-500 text-sm">No powers selected. Click a power above to add it.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {powers.map(powerEntry => {
                const power = POWERS.find(p => p.id === powerEntry.powerId);
                if (!power) return null;
                
                const getTier = (pts: number, levels: { cost: number }[], powerId: string) => {
                  // Special handling for Minor Power
                  if (powerId === 'MinorPower') {
                    if (pts < 0) return { name: 'Limitation', color: 'text-red-400' };
                    if (pts === 0) return { name: 'Trivial', color: 'text-slate-400' };
                    return { name: 'Minor', color: 'text-green-400' };
                  }
                  
                  // Standard tier calculation for other powers
                  if (levels.length === 0) return { name: 'Custom', color: 'text-slate-400' };
                  if (levels.length >= 3 && pts >= levels[2].cost) return { name: 'Exalted', color: 'text-purple-400' };
                  if (levels.length >= 2 && pts >= levels[1].cost) return { name: 'Advanced', color: 'text-blue-400' };
                  if (pts >= levels[0].cost) return { name: 'Standard', color: 'text-green-400' };
                  return { name: 'Below Standard', color: 'text-slate-500' };
                };
                const tier = getTier(powerEntry.points, power.levels, power.id);
                
                return (
                  <div key={powerEntry.id} className="bg-slate-700/50 rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{power.emoji} {power.name}</div>
                        <div className="text-xs text-slate-500">{power.category}</div>
                      </div>
                      <button
                        onClick={() => removePower(powerEntry.id)}
                        className="text-slate-500 hover:text-red-400 text-sm ml-2"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{power.description}</p>
                    
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Points</label>
                        {power.id === 'MinorPower' ? (
                          <select
                            value={powerEntry.points}
                            onChange={(e) => updatePowerPoints(powerEntry.id, parseInt(e.target.value))}
                            className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value={-5}>Limitation (-5)</option>
                            <option value={-4}>Limitation (-4)</option>
                            <option value={-3}>Limitation (-3)</option>
                            <option value={-2}>Limitation (-2)</option>
                            <option value={-1}>Limitation (-1)</option>
                            <option value={0}>Trivial (0)</option>
                            <option value={1}>Minor (1)</option>
                            <option value={2}>Minor (2)</option>
                            <option value={3}>Minor (3)</option>
                            <option value={4}>Minor (4)</option>
                            <option value={5}>Minor (5)</option>
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={powerEntry.points}
                            onChange={(e) => updatePowerPoints(powerEntry.id, parseInt(e.target.value) || 0)}
                            min="0"
                            className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        )}
                      </div>
                      <div className={`text-sm font-medium ${tier.color}`}>
                        {tier.name}
                      </div>
                    </div>
                    
                    {/* Quick-set buttons based on power's standard levels */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {power.id === 'MinorPower' ? (
                        // Simplified buttons for Minor Power
                        <>
                          {[-3, 3, 5].map(cost => (
                            <button
                              key={cost}
                              onClick={() => updatePowerPoints(powerEntry.id, cost)}
                              className={`text-xs px-2 py-0.5 rounded ${
                                powerEntry.points === cost
                                  ? 'bg-amber-500 text-slate-900'
                                  : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                              }`}
                            >
                              {cost < 0 ? `Limitation (${cost})` : cost === 0 ? `Trivial (${cost})` : `Minor (+${cost})`}
                            </button>
                          ))}
                        </>
                      ) : (
                        // Standard buttons for other powers
                        power.levels.map((level, idx) => (
                          <button
                            key={idx}
                            onClick={() => updatePowerPoints(powerEntry.id, level.cost)}
                            className={`text-xs px-2 py-0.5 rounded ${
                              powerEntry.points === level.cost
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                            }`}
                          >
                            {level.name} ({level.cost})
                          </button>
                        ))
                      )}
                    </div>
                    
                    {/* Custom label for this power purchase */}
                    {/* Label for this power purchase */}
                    <div className="mt-2">
                      <label className="block text-xs text-slate-400 mb-1">Label</label>
                      <input
                        type="text"
                        value={powerEntry.label || ''}
                        onChange={(e) => updatePowerLabel(powerEntry.id, e.target.value)}
                        placeholder={(() => {
                          if (power.id === 'MinorPower') {
                            if (powerEntry.points < 0) return 'Limitation';
                            if (powerEntry.points === 0) return 'Trivial';
                            return 'Minor';
                          }
                          const affordableLevel = [...power.levels].reverse().find(l => powerEntry.points >= l.cost);
                          return affordableLevel?.name || power.levels[0]?.name || power.name;
                        })()}
                        className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    
                    {/* Description of how this power manifests */}
                    <div className="mt-2">
                      <label className="block text-xs text-slate-400 mb-1">Description</label>
                      <textarea
                        value={powerEntry.description || ''}
                        onChange={(e) => updatePowerDescription(powerEntry.id, e.target.value)}
                        placeholder="How does this power manifest for your avatar?"
                        rows={2}
                        className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Step 4: Artifacts, Allies, Shadows */}
        <section className="grid lg:grid-cols-3 gap-6">
          {/* Artifacts */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>🗡️</span> Artifacts
              </h2>
              <button
                onClick={addArtifact}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {artifacts.map(artifact => (
                <div key={artifact.id} className="bg-slate-700/50 rounded p-2">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={artifact.name}
                      onChange={(e) => updateArtifact(artifact.id, { name: e.target.value })}
                      className="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="number"
                      value={artifact.cost}
                      onChange={(e) => updateArtifact(artifact.id, { cost: parseInt(e.target.value) || 0 })}
                      className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => removeArtifact(artifact.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Qty:</span>
                    <input
                      type="number"
                      value={artifact.quantity}
                      onChange={(e) => updateArtifact(artifact.id, { quantity: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-12 bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span>= {artifact.cost * artifact.quantity} pts</span>
                  </div>
                </div>
              ))}
              {artifacts.length === 0 && (
                <p className="text-slate-500 text-sm">No artifacts.</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 text-sm">
              <span className="text-slate-400">Total: </span>
              <span className="font-bold text-amber-400">
                {artifacts.reduce((sum, a) => sum + a.cost * a.quantity, 0)} pts
              </span>
            </div>
          </div>

          {/* Allies */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>🤝</span> Allies & Nemeses
              </h2>
              <button
                onClick={addAlly}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {allies.map(ally => (
                <div key={ally.id} className="bg-slate-700/50 rounded p-2">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={ally.name}
                      onChange={(e) => updateAlly(ally.id, { name: e.target.value })}
                      className="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <select
                      value={ally.loyalty}
                      onChange={(e) => updateAlly(ally.id, { 
                        loyalty: parseInt(e.target.value),
                        cost: parseInt(e.target.value)
                      })}
                      className="w-24 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value={-6}>Nemesis (-6)</option>
                      <option value={-3}>Enemy (-3)</option>
                      <option value={-1}>Annoyance (-1)</option>
                      <option value={1}>Contact (1)</option>
                      <option value={3}>Ally (3)</option>
                      <option value={6}>Devotee (6)</option>
                    </select>
                    <button
                      onClick={() => removeAlly(ally.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {allies.length === 0 && (
                <p className="text-slate-500 text-sm">No allies or nemeses.</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 text-sm">
              <span className="text-slate-400">Total: </span>
              <span className={`font-bold ${allies.reduce((sum, a) => sum + a.cost, 0) < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                {allies.reduce((sum, a) => sum + a.cost, 0)} pts
              </span>
            </div>
          </div>

          {/* Personal Shadows */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span>🌓</span> Personal Shadows
              </h2>
              <button
                onClick={addShadow}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {personalShadows.map(shadow => (
                <div key={shadow.id} className="bg-slate-700/50 rounded p-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shadow.name}
                      onChange={(e) => updateShadow(shadow.id, { name: e.target.value })}
                      className="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="number"
                      value={shadow.cost}
                      onChange={(e) => updateShadow(shadow.id, { cost: parseInt(e.target.value) || 0 })}
                      className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      onClick={() => removeShadow(shadow.id)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {personalShadows.length === 0 && (
                <p className="text-slate-500 text-sm">No personal shadows.</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 text-sm">
              <span className="text-slate-400">Total: </span>
              <span className="font-bold text-amber-400">
                {personalShadows.reduce((sum, s) => sum + s.cost, 0)} pts
              </span>
            </div>
          </div>
        </section>

        {/* Point Summary */}
        <section className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
            <span>📋</span> Point Summary
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-700/50 rounded p-3">
              <div className="text-slate-400 mb-2">Aspects & Functions</div>
              <div className="text-xl font-bold text-amber-400">
                {Object.values(aspects).reduce<number>((s, v) => s + v, 0) + Object.values(functions).reduce<number>((s, v) => s + v, 0)} pts
              </div>
            </div>
            <div className="bg-slate-700/50 rounded p-3">
              <div className="text-slate-400 mb-2">Skills</div>
              <div className="text-xl font-bold text-amber-400">
                {calculateSkillCosts(skills)} pts
              </div>
            </div>
            <div className="bg-slate-700/50 rounded p-3">
              <div className="text-slate-400 mb-2">Powers</div>
              <div className="text-xl font-bold text-amber-400">
                {powerCosts} pts
              </div>
            </div>
            <div className="bg-slate-700/50 rounded p-3">
              <div className="text-slate-400 mb-2">Artifacts, Allies, Shadows</div>
              <div className="text-xl font-bold text-amber-400">
                {artifacts.reduce((s, a) => s + a.cost * a.quantity, 0) + allies.reduce((s, a) => s + a.cost, 0) + personalShadows.reduce((s, s2) => s + s2.cost, 0)} pts
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap gap-6">
            <div>
              <span className="text-slate-400">Total Spent: </span>
              <span className="text-2xl font-bold text-amber-400">{totalPointsSpent}</span>
              <span className="text-slate-500"> / {campaignLimit}</span>
            </div>
            <div>
              <span className="text-slate-400">Stuff: </span>
              <span className={`text-2xl font-bold ${stuff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stuff >= 0 ? `+${stuff} Good` : `${stuff} Bad`}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Surge: </span>
              <span className="text-2xl font-bold text-cyan-400">{computedCharacter.surge}</span>
            </div>
          </div>
        </section>

      </main>
      {/* Print-only character sheet */}
      <CharacterSheet
        name={name}
        campaignLimit={campaignLimit}
        aspects={aspects}
        functions={functions}
        skills={skills}
        powers={powers}
        artifacts={artifacts}
        allies={allies}
        personalShadows={personalShadows}
        stuff={stuff}
        surge={computedCharacter.surge}
      />
      {/* Icon Picker Modal */}
      <IconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={handleIconSelect}
        currentIcon={avatarIcon}
      />
    </div>
  );
}

export default App;
