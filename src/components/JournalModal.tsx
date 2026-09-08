import React, { useState } from 'react';
import { SavedRecord } from '../types';
import { X, Search, Copy, Download, Terminal, Check } from 'lucide-react';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SavedRecord[];
}

export const JournalModal: React.FC<JournalModalProps> = ({ isOpen, onClose, records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = records.filter(r =>
    r.positivePrompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.preset.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyRecord = (rec: SavedRecord) => {
    navigator.clipboard.writeText(rec.rawGrepContent);
    setCopiedId(rec.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadRecord = (rec: SavedRecord) => {
    const blob = new Blob([rec.rawGrepContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rec.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e1b18] border border-[#3a3530] rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#24201c] border-b border-[#3a3530]">
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-[#f59e0b]" />
            <h2 className="text-base font-bold text-[#f59e0b] tracking-wider">
              PROMPT JOURNAL // GREPPABLE RECORDS
            </h2>
            <span className="text-xs bg-[#12100e] text-[#84cc16] px-2 py-0.5 rounded border border-[#2b2722]">
              {records.length} SAVED ENTRIES
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#a89f91] hover:text-[#ece7dc] hover:bg-[#342f29] rounded transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-[#181614] border-b border-[#302b25] flex items-center gap-2">
          <Search size={16} className="text-[#a89f91]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Grep prompt text, preset, or filename..."
            className="w-full bg-[#12100e] text-xs text-[#ece7dc] px-3 py-2 rounded border border-[#3a3530] focus:border-[#f59e0b] outline-none"
          />
        </div>

        {/* List of Records */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#a89f91]">
              No saved prompts matching filter. Use "Quick Save" on any forged prompt to record it here.
            </div>
          ) : (
            filtered.map((rec) => (
              <div key={rec.id} className="bg-[#141211] border border-[#332e29] rounded p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#a89f91] border-b border-[#282420] pb-2">
                  <span className="text-[#84cc16] font-bold">{rec.filename}</span>
                  <span>{rec.timestamp}</span>
                </div>
                <div className="text-xs text-[#f59e0b] font-bold flex items-center gap-2">
                  <span>PRESET: {rec.preset}</span>
                  <span className="text-[#a89f91]">|</span>
                  <span className="text-[#a89f91]">MODEL: {rec.model}</span>
                </div>
                <p className="text-xs text-[#ece7dc] leading-relaxed select-all">
                  {rec.positivePrompt}
                </p>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#24201c]">
                  <button
                    onClick={() => handleCopyRecord(rec)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-[#24201c] hover:bg-[#302b26] text-[#f59e0b] rounded border border-[#3a3530]"
                  >
                    {copiedId === rec.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === rec.id ? 'Copied!' : 'Copy Raw Entry'}
                  </button>
                  <button
                    onClick={() => handleDownloadRecord(rec)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-[#ea580c] hover:bg-[#f97316] text-[#141211] font-bold rounded"
                  >
                    <Download size={12} />
                    Download .txt
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#24201c] border-t border-[#3a3530] text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#332e28] hover:bg-[#423c34] text-[#ece7dc] rounded text-xs font-bold transition"
          >
            Close Journal
          </button>
        </div>
      </div>
    </div>
  );
};
