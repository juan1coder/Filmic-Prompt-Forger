import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, X, Code2 } from 'lucide-react';

interface PythonScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonScriptModal: React.FC<PythonScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      const res = await fetch('/app.py');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app.py';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download app.py directly. You can copy the code from the box below.');
    }
  };

  const handleCopyCmd = () => {
    navigator.clipboard.writeText('sudo apt install python3-tk python3-pil python3-pil.imagetk python3-tkdnd\nchmod +x app.py\npython3 app.py');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e1b18] border-2 border-[#ea580c] rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#26221e] border-b border-[#3d3730]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#ea580c] animate-pulse" />
            <h2 className="text-lg font-bold text-[#f59e0b] tracking-wider">
              DEBIAN DESKTOP SCRIPT // app.py (v2.1.0-analog)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#a89f91] hover:text-[#ece7dc] hover:bg-[#342f29] rounded transition"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-[#181614] border-b border-[#332c25] text-xs text-[#a89f91] flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[#84cc16] font-bold">✓ Drag & Drop Fixed:</span> Automatically intercepts drops from Thunar, Nautilus, & Dolphin into the prompt box, decodes <code className="text-[#fbbf24]">file://</code> URIs, removes the raw path from the idea prompt, and loads it directly into the vision slot.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCmd}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2b2620] hover:bg-[#383129] text-[#f59e0b] rounded border border-[#4d4439] text-xs"
            >
              <Terminal size={13} />
              {copiedCmd ? 'Commands Copied!' : 'Copy Debian Commands'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#ea580c] hover:bg-[#f97316] text-[#141211] font-bold rounded text-xs transition"
            >
              <Download size={13} />
              Download app.py
            </button>
          </div>
        </div>

        {/* Content explanation & terminal snippets */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#ece7dc]">
          <div className="p-3 bg-[#141211] rounded border border-[#3a3530]">
            <p className="text-[#84cc16] font-bold mb-1">To run on Debian / Linux Mint / Ubuntu:</p>
            <pre className="text-[#fbbf24] bg-[#0d0c0b] p-2.5 rounded border border-[#2a2622] overflow-x-auto select-all">
{`# 1. Install Tkinter and imaging libraries (if not already installed):
sudo apt update && sudo apt install -y python3-tk python3-pil python3-pil.imagetk python3-tkdnd

# 2. Make executable and run:
chmod +x app.py
python3 app.py`}
            </pre>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#f59e0b]">Key Features in Updated app.py:</h3>
            <ul className="list-disc list-inside space-y-1 text-[#a89f91] pl-2 leading-relaxed">
              <li><strong className="text-[#ece7dc]">Dual-Engine Drag & Drop:</strong> Works with both <code className="text-[#fbbf24]">TkinterDnD2</code> and native Linux X11 text drops from Thunar/Nautilus.</li>
              <li><strong className="text-[#ece7dc]">Text Interception & Cleanup:</strong> Dropping an image into the Idea prompt text widget automatically strips the raw <code className="text-[#fbbf24]">file:///home/...</code> path from the prompt while simultaneously loading the image into the Vision Slot.</li>
              <li><strong className="text-[#ece7dc]">70s Analog Film Aesthetic:</strong> High-contrast darkroom console with 12pt monospace input/output fonts for effortless prompt reading and editing.</li>
              <li><strong className="text-[#ece7dc]">Grep-Friendly Quick Saves:</strong> Writes to <code className="text-[#fbbf24]">~/.promptforge/saved_prompts/[ID]_[Date]_[Time].txt</code> with grep-structured headers.</li>
              <li><strong className="text-[#ece7dc]">l3afpad Integration:</strong> The <code className="text-[#fbbf24]">+</code> and <code className="text-[#fbbf24]">Edit</code> buttons open your presets and personas in <code className="text-[#fbbf24]">l3afpad</code> (or system editor).</li>
              <li><strong className="text-[#ece7dc]">Wikipedia Cultural Enrichment:</strong> Queries Wikipedia's REST API to inject historical and artistic context.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#24201c] border-t border-[#3d3730] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#332e28] hover:bg-[#423c34] text-[#ece7dc] rounded text-xs font-bold transition"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-1.5 bg-[#ea580c] hover:bg-[#f97316] text-[#141211] rounded text-xs font-bold transition shadow"
          >
            <Download size={14} />
            Download app.py to Run on Debian
          </button>
        </div>
      </div>
    </div>
  );
};
