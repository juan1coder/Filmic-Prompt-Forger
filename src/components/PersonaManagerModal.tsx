import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, UserCheck, Sparkles, Film, Eye, Terminal, Camera, PenTool } from 'lucide-react';
import { SystemPersona } from '../types';

interface PersonaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: SystemPersona[];
  selectedPersonaId: string;
  onSelectPersona: (personaId: string) => void;
  onSavePersona: (persona: SystemPersona) => void;
  onDeletePersona: (personaId: string) => void;
}

export function PersonaManagerModal({
  isOpen,
  onClose,
  personas,
  selectedPersonaId,
  onSelectPersona,
  onSavePersona,
  onDeletePersona,
}: PersonaManagerModalProps) {
  const [editingPersona, setEditingPersona] = useState<SystemPersona | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setEditingPersona({
      id: `custom-persona-${Date.now()}`,
      name: '',
      title: 'Custom Workstation Alter Ego',
      tagline: '',
      instructions: '',
      avatarIcon: 'Sparkles',
      isCustom: true,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPersona || !editingPersona.name.trim() || !editingPersona.instructions.trim()) return;
    onSavePersona({
      ...editingPersona,
      name: editingPersona.name.trim(),
      title: editingPersona.title.trim() || 'Prompt Forge Alter Ego',
      tagline: editingPersona.tagline.trim() || 'Custom prompt aesthetic voice.',
      instructions: editingPersona.instructions.trim(),
    });
    setEditingPersona(null);
    setIsCreatingNew(false);
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Film':
        return <Film size={15} className="text-[#ea580c]" />;
      case 'Eye':
        return <Eye size={15} className="text-[#38bdf8]" />;
      case 'Terminal':
        return <Terminal size={15} className="text-[#84cc16]" />;
      case 'Camera':
        return <Camera size={15} className="text-[#fbbf24]" />;
      case 'PenTool':
        return <PenTool size={15} className="text-[#ec4899]" />;
      default:
        return <Sparkles size={15} className="text-[#f59e0b]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#24211e] border border-[#3a3530] rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl font-mono text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3a3530] bg-[#1c1917]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#141211] border border-[#ea580c] flex items-center justify-center text-[#ea580c]">
              <UserCheck size={14} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f59e0b] tracking-wide">
                SYSTEM PERSONA // APP ALTER EGO
              </h2>
              <p className="text-[11px] text-[#a89f91]">
                Shape how the AI thinks, reasons, and styles your prompts
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

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#181615] border-b border-[#332e29]">
          <span className="text-[11px] text-[#a89f91]">
            Active Alter Ego directly guides the prompt synthesis engine
          </span>
          {!editingPersona && (
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e2819] hover:bg-[#2f3d26] text-[#84cc16] border border-[#374c2c] rounded font-bold transition"
            >
              <Plus size={13} />
              <span>New Alter Ego</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* EDIT / CREATE FORM */}
          {editingPersona && (
            <form onSubmit={handleSave} className="bg-[#181615] border border-[#ea580c] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#332e29]">
                <span className="font-bold text-[#f59e0b] flex items-center gap-1.5">
                  <Edit2 size={13} />
                  <span>{isCreatingNew ? 'CREATE CUSTOM ALTER EGO' : `EDIT: ${editingPersona.name}`}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPersona(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-[#a89f91] hover:text-[#ea580c]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a89f91] text-[10px] font-bold mb-1">PERSONA NAME:</label>
                  <input
                    type="text"
                    required
                    value={editingPersona.name}
                    onChange={(e) => setEditingPersona({ ...editingPersona, name: e.target.value })}
                    placeholder="e.g. The Brutalist Minimalist"
                    className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#ea580c]"
                  />
                </div>
                <div>
                  <label className="block text-[#a89f91] text-[10px] font-bold mb-1">TITLE / ARCHETYPE:</label>
                  <input
                    type="text"
                    value={editingPersona.title}
                    onChange={(e) => setEditingPersona({ ...editingPersona, title: e.target.value })}
                    placeholder="e.g. Architectural Purist"
                    className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#ea580c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">TAGLINE / PHILOSOPHY:</label>
                <input
                  type="text"
                  value={editingPersona.tagline}
                  onChange={(e) => setEditingPersona({ ...editingPersona, tagline: e.target.value })}
                  placeholder="One sentence describing its aesthetic focus..."
                  className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none focus:border-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-[#a89f91] text-[10px] font-bold mb-1">
                  SYSTEM INSTRUCTIONS (BEHAVIOR & TONE DIRECTIVE):
                </label>
                <textarea
                  required
                  rows={4}
                  value={editingPersona.instructions}
                  onChange={(e) => setEditingPersona({ ...editingPersona, instructions: e.target.value })}
                  placeholder="Tell the model who it is, what textures to prioritize, what cameras/lenses to choose, and what tone to enforce..."
                  className="w-full bg-[#141211] text-[#ece7dc] border border-[#3a3530] rounded p-2 outline-none leading-relaxed focus:border-[#ea580c]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPersona(null);
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
                  Save Persona
                </button>
              </div>
            </form>
          )}

          {/* PERSONAS GRID */}
          {!editingPersona && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {personas.map((persona) => {
                const isSelected = persona.id === selectedPersonaId;
                return (
                  <div
                    key={persona.id}
                    className={`p-4 rounded-lg border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#181615] border-[#ea580c] ring-1 ring-[#ea580c]'
                        : 'bg-[#1b1816] border-[#332e29] hover:border-[#4d4439]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-[#141211] border border-[#3a3530] flex items-center justify-center">
                            {renderIcon(persona.avatarIcon)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-[#f59e0b]">
                                {persona.name}
                              </span>
                              {persona.isCustom && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/40 font-bold">
                                  USER
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#84cc16] block">
                              {persona.title}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded bg-[#ea580c] text-[#141211] font-bold text-[10px] flex items-center gap-1">
                            <Check size={11} />
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-[#ece7dc] mt-2.5 font-medium leading-snug">
                        "{persona.tagline}"
                      </p>

                      <div className="mt-2.5 p-2 rounded bg-[#141211] border border-[#2b2723] text-[10px] text-[#a89f91] font-mono line-clamp-3">
                        {persona.instructions}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#2d2824] gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingPersona(persona)}
                          className="px-2 py-1 bg-[#24211e] hover:bg-[#332c25] text-[#a89f91] hover:text-[#f59e0b] border border-[#3a3530] rounded text-[11px] transition flex items-center gap-1"
                        >
                          <Edit2 size={11} />
                          <span>Edit / Revise</span>
                        </button>

                        {persona.isCustom && (
                          <button
                            onClick={() => onDeletePersona(persona.id)}
                            className="p-1 text-[#a89f91] hover:text-[#ea580c] transition"
                            title="Delete persona"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {!isSelected && (
                        <button
                          onClick={() => {
                            onSelectPersona(persona.id);
                            onClose();
                          }}
                          className="px-3 py-1 bg-[#24211e] hover:bg-[#ea580c] text-[#f59e0b] hover:text-[#141211] border border-[#ea580c]/50 rounded font-bold transition text-[11px]"
                        >
                          Adopt Persona
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#3a3530] bg-[#1c1917] flex items-center justify-between">
          <span className="text-[11px] text-[#a89f91]">
            Custom alter egos are persisted in your local storage
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
