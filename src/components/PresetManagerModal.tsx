import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, Sparkles, Sliders, RefreshCw, Copy } from 'lucide-react';
import { Preset, ToneSnippet } from '../types';

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: Preset[];
  onSelectPreset: (presetId: string) => void;
  selectedPresetId: string;
  onSavePreset: (preset: Preset) => void;
  onDeletePreset: (presetId: string) => void;
  toneSnippets: ToneSnippet[];
  onSaveToneSnippet: (snippet: ToneSnippet) => void;
  onDeleteToneSnippet: (snippetId: string) => void;
  onInjectSnippet: (snippetText: string) => void;
}

export function PresetManagerModal({
  isOpen,
  onClose,
  presets,
  onSelectPreset,
  selectedPresetId,
  onSavePreset,
  onDeletePreset,
  toneSnippets,
  onSaveToneSnippet,
  onDeleteToneSnippet,
  onInjectSnippet,
}: PresetManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'snippets'>('presets');
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<ToneSnippet | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartCreatePreset = () => {
    setIsCreatingNew(true);
    setEditingPreset({
      id: `custom-preset-${Date.now()}`,
      name: '',
      yearTag: 'Custom User Tone',
      description: '',
      promptAdditions: '',
      category: 'custom',
      isCustom: true,
    });
  };

  const handleStartCreateSnippet = () => {
    setIsCreatingNew(true);
    setEditingSnippet({
      id: `custom-snip-${Date.now()}`,
      name: '',
      category: 'Custom Tone',
      snippet: '',
      description: '',
      isCustom: true,
    });
  };

  const handleSaveCurrentPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPreset || !editingPreset.name.trim() || !editingPreset.promptAdditions.trim()) return;
    onSavePreset({
      ...editingPreset,
      name: editingPreset.name.trim(),
      promptAdditions: editingPreset.promptAdditions.trim(),
      description: editingPreset.description.trim() || 'Custom user crafted tone preset',
    });
    setEditingPreset(null);
    setIsCreatingNew(false);
  };

  const handleSaveCurrentSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnippet || !editingSnippet.name.trim() || !editingSnippet.snippet.trim()) return;
    onSaveToneSnippet({
      ...editingSnippet,
      name: editingSnippet.name.trim(),
      snippet: editingSnippet.snippet.trim(),
      description: editingSnippet.description.trim() || 'User custom tone snippet',
    });
    setEditingSnippet(null);
    setIsCreatingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#24211e] border border-[#3a3530] rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl font-mono text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3a3530] bg-[#1c1917]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#141211] border border-[#f59e0b] flex items-center justify-center text-[#f59e0b]">
              <Sliders size={14} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f59e0b] tracking-wide">
                PRESET & TONE SNIPPET REPOSITORY
              </h2>
              <p className="text-[11px] text-[#a89f91]">
                Manage, edit, add, and inject tone snippets into prompts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#2c2722] text-[#a89f91] hover:text-[#ece7dc] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#181615] border-b border-[#332e29]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('presets');
                setEditingPreset(null);
                setEditingSnippet(null);
                setIsCreatingNew(false);
              }}
              className={`px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
                activeTab === 'presets'
                  ? 'bg-[#ea580c] text-[#141211]'
                  : 'bg-[#24211e] text-[#a89f91] hover:text-[#ece7dc]'
              }`}
            >
              <span>Film & Art Presets ({presets.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('snippets');
                setEditingPreset(null);
                setEditingSnippet(null);
                setIsCreatingNew(false);
              }}
              className={`px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
                activeTab === 'snippets'
                  ? 'bg-[#ea580c] text-[#141211]'
                  : 'bg-[#24211e] text-[#a89f91] hover:text-[#ece7dc]'
              }`}
            >
              <Sparkles size={12} />
              <span>Ready-to-Use Tone Snippets ({toneSnippets.length})</span>
            </button>
          </div>

          {!editingPreset && !editingSnippet && (
            <button
              onClick={activeTab === 'presets' ? handleStartCreatePreset : handleStartCreateSnippet}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e2819] hover:bg-[#2f3d26] text-[#84cc16] border border-[#374c2c] rounded font-bold transition"
            >
              <Plus size={13} />
              <span>{activeTab === 'presets' ? 'New Preset' : 'New Snippet'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* EDIT / CREATE FORM: PRESET */}
          {editingPreset && (
            <form onSubmit={handleSaveCurrentPreset} className="bg-[#181615] border border-[#ea580c] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#332e29]">
                <span className="font-bold text-[#f59e0b] flex items-center gap-1.5">
                  <Edit2 size={13} />
                  <span>{isCreatingNew ? 'CREATE CUSTOM PRESET' : `EDIT PRESET: ${editingPreset.name}`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPreset(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-[#a89f91] hover:text-[#ea580c]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a89f91] text-[10px] font-bold mb-1">PRESET NAME:</label>
                  <input
                    type="text"
                    required
                    value={editingPreset.name}
                    onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                    placeholder="e.g. 1970s Technicolor Dream"
                    className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-[#a89f91] text-[10px] font-bold mb-1">YEAR / TAG:</label>
                  <input
                    type="text"
                    value={editingPreset.yearTag}
                    onChange={(e) => setEditingPreset({ ...editingPreset, yearTag: e.target.value })}
                    placeholder="e.g. 1974 Kodachrome Pushed"
                    className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#ea580c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">SHORT DESCRIPTION:</label>
                <input
                  type="text"
                  value={editingPreset.description}
                  onChange={(e) => setEditingPreset({ ...editingPreset, description: e.target.value })}
                  placeholder="Summary of colors, grain, lens optics, and shadow behavior..."
                  className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">
                  PROMPT ADDITIONS (INJECTED INTO SYNTHESIS):
                </label>
                <textarea
                  required
                  rows={4}
                  value={editingPreset.promptAdditions}
                  onChange={(e) => setEditingPreset({ ...editingPreset, promptAdditions: e.target.value })}
                  placeholder="Precise photographic, stylistic, and optical keywords..."
                  className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none leading-relaxed focus:border-[#ea580c]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPreset(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-3 py-1.5 bg-[#24211e] hover:bg-[#2e2a26] text-[#a89f91] rounded border border-[#3a3530]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#ea580c] hover:bg-[#f97316] text-[#141211] rounded font-bold transition"
                >
                  Save Preset
                </button>
              </div>
            </form>
          )}

          {/* EDIT / CREATE FORM: SNIPPET */}
          {editingSnippet && (
            <form onSubmit={handleSaveCurrentSnippet} className="bg-[#181615] border border-[#84cc16] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#332e29]">
                <span className="font-bold text-[#84cc16] flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>{isCreatingNew ? 'CREATE TONE SNIPPET' : `EDIT SNIPPET: ${editingSnippet.name}`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSnippet(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-[#a89f91] hover:text-[#ea580c]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a89f91] text-[10px] font-bold mb-1">SNIPPET NAME:</label>
                  <input
                    type="text"
                    required
                    value={editingSnippet.name}
                    onChange={(e) => setEditingSnippet({ ...editingSnippet, name: e.target.value })}
                    placeholder="e.g. Oil Paint Rembrandt Style"
                    className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#84cc16]"
                  />
                </div>
                <div>
                  <label className="block text-[#a89f91] text-[10px] font-bold mb-1">CATEGORY:</label>
                  <input
                    type="text"
                    value={editingSnippet.category}
                    onChange={(e) => setEditingSnippet({ ...editingSnippet, category: e.target.value })}
                    placeholder="e.g. Art Style, Film, Lighting"
                    className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#84cc16]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">
                  SNIPPET TEXT (INJECTED INTO PROMPT):
                </label>
                <textarea
                  required
                  rows={3}
                  value={editingSnippet.snippet}
                  onChange={(e) => setEditingSnippet({ ...editingSnippet, snippet: e.target.value })}
                  placeholder="e.g. tactile oil impasto on canvas, dramatic Rembrandt chiaroscuro, glowing amber candlelight..."
                  className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none leading-relaxed focus:border-[#84cc16]"
                />
              </div>

              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">DESCRIPTION:</label>
                <input
                  type="text"
                  value={editingSnippet.description}
                  onChange={(e) => setEditingSnippet({ ...editingSnippet, description: e.target.value })}
                  placeholder="Short note explaining this tone's visual impact..."
                  className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#84cc16]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSnippet(null);
                    setIsCreatingNew(false);
                  }}
                  className="px-3 py-1.5 bg-[#24211e] hover:bg-[#2e2a26] text-[#a89f91] rounded border border-[#3a3530]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#84cc16] hover:bg-[#97df1f] text-[#141211] rounded font-bold transition"
                >
                  Save Snippet
                </button>
              </div>
            </form>
          )}

          {/* PRESETS LIST */}
          {activeTab === 'presets' && !editingPreset && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                return (
                  <div
                    key={preset.id}
                    className={`p-3.5 rounded-lg border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#181615] border-[#ea580c] ring-1 ring-[#ea580c]'
                        : 'bg-[#1b1816] border-[#332e29] hover:border-[#4d4439]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#f59e0b]">
                              {preset.name}
                            </span>
                            {preset.isCustom && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/40 font-bold">
                                USER
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#84cc16] block mt-0.5">
                            {preset.yearTag}
                          </span>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded bg-[#ea580c] text-[#141211] font-bold text-[10px] flex items-center gap-1">
                            <Check size={11} />
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#a89f91] mt-2 leading-relaxed">
                        {preset.description}
                      </p>

                      <div className="mt-2.5 p-2 rounded bg-[#141211] border border-[#2b2723] text-[10px] text-[#ece7dc]/80 font-mono line-clamp-2">
                        {preset.promptAdditions}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#2d2824] gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingPreset(preset)}
                          className="px-2 py-1 bg-[#24211e] hover:bg-[#332c25] text-[#a89f91] hover:text-[#f59e0b] border border-[#3a3530] rounded text-[11px] transition flex items-center gap-1"
                          title="Edit or Revise Preset"
                        >
                          <Edit2 size={11} />
                          <span>Edit / Revise</span>
                        </button>

                        {preset.isCustom && (
                          <button
                            onClick={() => onDeletePreset(preset.id)}
                            className="p-1 text-[#a89f91] hover:text-[#ea580c] transition"
                            title="Delete Custom Preset"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {!isSelected && (
                        <button
                          onClick={() => {
                            onSelectPreset(preset.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-[#24211e] hover:bg-[#ea580c] text-[#f59e0b] hover:text-[#141211] border border-[#ea580c]/50 rounded font-bold transition text-[11px]"
                        >
                          Select Preset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* READY-TO-USE TONE SNIPPETS LIST */}
          {activeTab === 'snippets' && !editingSnippet && (
            <div className="space-y-3">
              <div className="p-3 rounded bg-[#181615] border border-[#332e29] text-[11px] text-[#a89f91] flex items-center justify-between">
                <span>
                  Click <strong>"Inject into Prompt"</strong> to append any tone snippet directly to your idea!
                </span>
                <span className="text-[#84cc16]">Instant Style Stacking</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {toneSnippets.map((snip) => (
                  <div
                    key={snip.id}
                    className="p-3.5 rounded-lg bg-[#1b1816] border border-[#332e29] hover:border-[#4d4439] transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-[#84cc16] block">
                            {snip.name}
                          </span>
                          <span className="text-[10px] text-[#f59e0b] mt-0.5 block">
                            {snip.category}
                          </span>
                        </div>
                        {snip.isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#84cc16]/20 text-[#84cc16] border border-[#84cc16]/40 font-bold">
                            USER
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#a89f91] mt-1.5 leading-snug">
                        {snip.description}
                      </p>

                      <div className="mt-2.5 p-2 rounded bg-[#141211] border border-[#2b2723] text-[10px] text-[#ece7dc] font-mono leading-relaxed">
                        {snip.snippet}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#2d2824] gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingSnippet(snip)}
                          className="px-2 py-1 bg-[#24211e] hover:bg-[#332c25] text-[#a89f91] hover:text-[#f59e0b] border border-[#3a3530] rounded text-[11px] transition flex items-center gap-1"
                          title="Edit snippet"
                        >
                          <Edit2 size={11} />
                          <span>Edit</span>
                        </button>

                        {snip.isCustom && (
                          <button
                            onClick={() => onDeleteToneSnippet(snip.id)}
                            className="p-1 text-[#a89f91] hover:text-[#ea580c] transition"
                            title="Delete custom snippet"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onInjectSnippet(snip.snippet);
                          onClose();
                        }}
                        className="px-3 py-1 bg-[#1e2819] hover:bg-[#84cc16] text-[#84cc16] hover:text-[#141211] border border-[#374c2c] hover:border-[#84cc16] rounded font-bold transition text-[11px] flex items-center gap-1"
                      >
                        <Plus size={12} />
                        <span>Inject into Prompt</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#3a3530] bg-[#1c1917] flex items-center justify-between">
          <span className="text-[11px] text-[#a89f91]">
            Modifications saved to your workstation profile
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2a241f] hover:bg-[#383028] text-[#ece7dc] border border-[#4d4235] rounded font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
