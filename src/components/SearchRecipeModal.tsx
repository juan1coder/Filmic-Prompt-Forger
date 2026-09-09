import React, { useState } from 'react';
import {
  X,
  Search,
  BookOpen,
  Globe,
  Utensils,
  Layers,
  Check,
  Copy,
  Trash2,
  Download,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SearchLogEntry, RecipeIngredient } from '../types';

interface SearchRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchLogs: SearchLogEntry[];
  recipeIngredients: RecipeIngredient[];
  onClearLogs: () => void;
  onRemoveIngredient: (id: string) => void;
  onClearIngredients: () => void;
  onInjectSnippet: (text: string, term: string, category?: string) => void;
}

export const SearchRecipeModal: React.FC<SearchRecipeModalProps> = ({
  isOpen,
  onClose,
  searchLogs,
  recipeIngredients,
  onClearLogs,
  onRemoveIngredient,
  onClearIngredients,
  onInjectSnippet,
}) => {
  const [activeTab, setActiveTab] = useState<'recipe' | 'logs'>('recipe');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadRecipe = () => {
    const now = new Date();
    const lines = [
      '================================================================================',
      '             PROMPT FORGE :: RECIPE LEDGER & MORTAR INGREDIENTS AUDIT           ',
      '================================================================================',
      `Export Timestamp: ${now.toISOString()} (${now.toLocaleString()})`,
      `Total Active Ingredients: ${recipeIngredients.length}`,
      `Total Search Log Queries: ${searchLogs.length}`,
      '--------------------------------------------------------------------------------',
      'ACTIVE RECIPE INGREDIENTS (MORTAR BONDED INTO PROMPT):',
      '--------------------------------------------------------------------------------',
    ];

    if (recipeIngredients.length === 0) {
      lines.push('(No active ingredients currently inducted)');
    } else {
      recipeIngredients.forEach((ing, i) => {
        lines.push(`[${i + 1}] INGREDIENT #${i + 1} (${ing.category.toUpperCase()})`);
        lines.push(`    Search Term   : "${ing.searchTerm}" (${ing.source})`);
        lines.push(`    Mortar Snippet: "${ing.snippet}"`);
        if (ing.worthyReason) {
          lines.push(`    Mortar Value  : ${ing.worthyReason}`);
        }
        lines.push(`    Timestamp     : ${ing.timestamp}`);
        lines.push('');
      });
    }

    lines.push('--------------------------------------------------------------------------------');
    lines.push('SEARCH TERMS & DISCOVERY AUDIT LOG:');
    lines.push('--------------------------------------------------------------------------------');

    if (searchLogs.length === 0) {
      lines.push('(No searches logged)');
    } else {
      searchLogs.forEach((log, i) => {
        lines.push(`QUERY #${i + 1}: "${log.query}" [${log.source}] @ ${log.timeStr || log.timestamp}`);
        lines.push(`  Discovered Snippets (${log.snippets.length}):`);
        log.snippets.forEach((s, sIdx) => {
          const wasInjected = log.injectedSnippets.includes(s);
          lines.push(`    [${sIdx + 1}] ${wasInjected ? '[INDUCTED INTO RECIPE] ' : ''}${s}`);
        });
        lines.push('');
      });
    }

    lines.push('================================================================================');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-recipe-audit-${now.toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-[#1c1a17] border border-[#3a3530] rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#332e29] bg-[#141211]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#2a2217] border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b]">
              <Utensils size={15} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#ece7dc] tracking-wide flex items-center gap-2">
                <span>PROMPT RECIPE & SEARCH AUDIT LEDGER</span>
                <span className="text-[10px] bg-[#24211e] text-[#f59e0b] px-2 py-0.5 rounded border border-[#3a3530]">
                  {recipeIngredients.length} INGREDIENT{recipeIngredients.length === 1 ? '' : 'S'}
                </span>
              </h2>
              <p className="text-[11px] text-[#a89f91]">
                Real-time search terms, inducted mortar snippets, and ingredient provenance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadRecipe}
              className="px-2.5 py-1 text-xs bg-[#1f281b] hover:bg-[#2c3a26] text-[#84cc16] border border-[#3a4d29] rounded transition flex items-center gap-1.5 cursor-pointer"
              title="Download entire recipe ledger as text"
            >
              <Download size={12} />
              <span className="hidden sm:inline">Export Audit</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#a89f91] hover:text-[#ece7dc] rounded hover:bg-[#25201b] transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#332e29] bg-[#171513] px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('recipe')}
            className={`pb-2 px-3 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'recipe'
                ? 'border-[#f59e0b] text-[#f59e0b]'
                : 'border-transparent text-[#a89f91] hover:text-[#ece7dc]'
            }`}
          >
            <Utensils size={13} />
            <span>Active Recipe Mortar ({recipeIngredients.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2 px-3 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-[#f59e0b] text-[#f59e0b]'
                : 'border-transparent text-[#a89f91] hover:text-[#ece7dc]'
            }`}
          >
            <Clock size={13} />
            <span>Search Term History ({searchLogs.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'recipe' ? (
            <div>
              <div className="flex items-center justify-between mb-3 text-xs">
                <div className="text-[#a89f91] text-[11px] leading-relaxed">
                  Mortar fills in the cracks and gives shape to your image prompt. These ingredients were inducted into your active source prompt.
                </div>
                {recipeIngredients.length > 0 && (
                  <button
                    onClick={onClearIngredients}
                    className="text-[11px] text-[#6e675e] hover:text-[#ea580c] transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 size={11} />
                    <span>Clear Recipe</span>
                  </button>
                )}
              </div>

              {recipeIngredients.length === 0 ? (
                <div className="bg-[#141211] border border-[#332e29] border-dashed rounded-lg p-6 text-center text-xs text-[#a89f91]">
                  <Utensils size={24} className="mx-auto mb-2 text-[#6e675e]" />
                  <p className="font-bold text-[#ece7dc]">No recipe ingredients inducted yet</p>
                  <p className="text-[11px] text-[#6e675e] mt-1 max-w-md mx-auto">
                    Use Google Search Grounding to search any subject (e.g. "Pop Art", "Surrealism", "Witchcraft", "Oni Folklore") and click "Add into Source Prompt (+ Recipe)". They will appear here as the culinary recipe of your prompt.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recipeIngredients.map((ing, idx) => (
                    <div
                      key={ing.id}
                      className="bg-[#141211] border border-[#332e29] hover:border-[#4d4439] rounded p-3 flex flex-col gap-2 transition"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#f59e0b] font-bold">
                            INGREDIENT #{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 bg-[#221c16] text-[#f59e0b] border border-[#4d3a24] rounded font-bold">
                            {ing.category}
                          </span>
                          <span className="text-[#84cc16] flex items-center gap-1">
                            <Search size={10} />
                            <span>Query: "{ing.searchTerm}"</span>
                          </span>
                          <span className="text-[#6e675e]">{ing.source}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(ing.snippet, ing.id)}
                            className="p-1 text-[#a89f91] hover:text-[#ece7dc] transition cursor-pointer"
                            title="Copy snippet"
                          >
                            {copiedId === ing.id ? <Check size={12} className="text-[#84cc16]" /> : <Copy size={12} />}
                          </button>
                          <button
                            onClick={() => onRemoveIngredient(ing.id)}
                            className="p-1 text-[#6e675e] hover:text-[#ea580c] transition cursor-pointer"
                            title="Remove from recipe"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#ece7dc] leading-relaxed bg-[#191715] p-2.5 rounded border border-[#282420]">
                        "{ing.snippet}"
                      </p>

                      {ing.worthyReason && (
                        <div className="text-[10px] text-[#a89f91] flex items-center gap-1.5 bg-[#171c14] border border-[#2d3a24] px-2 py-1 rounded">
                          <Sparkles size={11} className="text-[#84cc16]" />
                          <span><strong className="text-[#84cc16]">Mortar Value:</strong> {ing.worthyReason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-[#a89f91] text-[11px]">
                  All search queries made during this session, showing discovered snippets vs. inducted items.
                </span>
                {searchLogs.length > 0 && (
                  <button
                    onClick={onClearLogs}
                    className="text-[11px] text-[#6e675e] hover:text-[#ea580c] transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Clear Search Logs</span>
                  </button>
                )}
              </div>

              {searchLogs.length === 0 ? (
                <div className="bg-[#141211] border border-[#332e29] border-dashed rounded-lg p-6 text-center text-xs text-[#a89f91]">
                  <Search size={24} className="mx-auto mb-2 text-[#6e675e]" />
                  <p className="font-bold text-[#ece7dc]">No searches logged yet</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {searchLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const inductedCount = log.injectedSnippets?.length || 0;
                    return (
                      <div
                        key={log.id}
                        className="bg-[#141211] border border-[#332e29] rounded p-3 text-xs flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between text-[11px] flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#ece7dc] flex items-center gap-1.5">
                              {log.source === 'Wikipedia' ? <BookOpen size={12} className="text-[#84cc16]" /> : <Globe size={12} className="text-[#38bdf8]" />}
                              <span>"{log.query}"</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e1c19] text-[#a89f91] border border-[#332e29]">
                              {log.source}
                            </span>
                            {inductedCount > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a2416] text-[#84cc16] border border-[#2f3d26] font-bold">
                                {inductedCount} In Recipe
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-[#6e675e]">
                            <span>{log.timeStr}</span>
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="p-1 text-[#a89f91] hover:text-[#ece7dc] transition cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Snippets listing */}
                        <div className="space-y-1.5 pl-2 border-l-2 border-[#2b2520]">
                          {(isExpanded ? log.snippets : log.snippets.slice(0, 2)).map((snip, sIdx) => {
                            const isInjected = log.injectedSnippets.includes(snip);
                            return (
                              <div
                                key={sIdx}
                                className={`text-[11px] p-2 rounded flex items-start justify-between gap-2 ${
                                  isInjected
                                    ? 'bg-[#182014] text-[#ece7dc] border border-[#2c3d22]'
                                    : 'bg-[#171513] text-[#a89f91]'
                                }`}
                              >
                                <p className="flex-1 leading-relaxed">
                                  {isInjected && (
                                    <span className="text-[#84cc16] font-bold mr-1">
                                      [INDUCTED]
                                    </span>
                                  )}
                                  "{snip}"
                                </p>
                                {!isInjected && (
                                  <button
                                    onClick={() => onInjectSnippet(snip, log.query, 'Visual Motif')}
                                    className="px-2 py-0.5 bg-[#251f18] hover:bg-[#382b1d] border border-[#f59e0b] text-[#f59e0b] rounded text-[10px] font-bold transition whitespace-nowrap cursor-pointer"
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {!isExpanded && log.snippets.length > 2 && (
                            <button
                              onClick={() => setExpandedLogId(log.id)}
                              className="text-[10px] text-[#f59e0b] hover:underline pt-0.5"
                            >
                              + Show {log.snippets.length - 2} more snippets
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#332e29] px-5 py-3 bg-[#141211] flex items-center justify-between text-xs text-[#a89f91]">
          <span>
            Recipe Principle: High-value mortar binds surfaces, smooths rough prompt edges, and prevents creative hallucination.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#24211e] hover:bg-[#332e29] text-[#ece7dc] rounded font-bold border border-[#3a3530] transition cursor-pointer"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
