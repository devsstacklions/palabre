import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '../../lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'Code' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  if (!code || code.trim().length === 0) {
    return null;
  }

  return (
    <div className="relative rounded-xl overflow-hidden my-3 border border-palabre-border shadow-sm group">
      <div className="flex items-center justify-between px-4 py-2 bg-[#080E0C] border-b border-[#1C2C26] text-xs text-[#9DB0A8]">
        <span className="font-mono uppercase tracking-wider">{language.toUpperCase()}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#14201C] hover:bg-[#1E2E28] text-white text-xs transition-colors cursor-pointer border border-[#2B3E37]"
          aria-label="Copier le code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copié !</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copier le code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 bg-palabre-codeBg text-palabre-codeText overflow-x-auto text-sm font-mono leading-relaxed selection:bg-[#0F5C4A] selection:text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
};
