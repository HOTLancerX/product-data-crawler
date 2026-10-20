'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';

interface JsonCodeViewerProps {
  data: any;
  title?: string;
  maxHeight?: string;
}

export default function JsonCodeViewer({
  data,
  title = 'JSON Output',
  maxHeight = '500px',
}: JsonCodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [indent, setIndent] = useState<2 | 0>(2);

  const jsonString = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, indent);
    } catch {
      return String(data);
    }
  }, [data, indent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredText = React.useMemo(() => {
    if (!search.trim()) return jsonString;
    const lines = jsonString.split('\n');
    const term = search.toLowerCase();
    return lines
      .filter((l) => l.toLowerCase().includes(term))
      .join('\n');
  }, [jsonString, search]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-950 text-gray-100 overflow-hidden shadow-sm font-mono text-xs">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Icon icon="solar:code-square-bold" className="w-4 h-4 text-orange-400" />
          <span className="font-semibold text-gray-200">{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
            {Array.isArray(data) ? `${data.length} items` : '1 object'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search in JSON */}
          <div className="relative">
            <Icon
              icon="solar:magnifer-linear"
              className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search JSON..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-2 py-1 rounded bg-gray-800 border border-gray-700 text-[11px] text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-500 w-32 sm:w-40"
            />
          </div>

          {/* Indent toggle */}
          <button
            type="button"
            onClick={() => setIndent(indent === 2 ? 0 : 2)}
            className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] transition-colors"
          >
            {indent === 2 ? 'Compact' : 'Pretty'}
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Icon icon={copied ? "solar:check-read-bold" : "solar:copy-bold"} className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Area */}
      <pre
        className="p-4 overflow-auto leading-relaxed text-emerald-400 selection:bg-orange-500 selection:text-white"
        style={{ maxHeight }}
      >
        <code>{filteredText}</code>
      </pre>
    </div>
  );
}
