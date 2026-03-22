'use client';

import { useState } from 'react';
import { EMAIL_STYLES, COLOR_PRESETS } from '@/lib/email-styles';
import type { EmailStyleOptions } from '@/lib/email-styles';

interface Props {
  selectedStyle: string;
  onStyleChange: (styleId: string) => void;
  options: EmailStyleOptions;
  onOptionsChange: (opts: EmailStyleOptions) => void;
}

export function EmailStylePicker({ selectedStyle, onStyleChange, options, onOptionsChange }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="space-y-3">
      {/* Style buttons */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Style</label>
        <div className="grid grid-cols-5 gap-1.5">
          {EMAIL_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onStyleChange(style.id)}
              className={`px-2 py-2.5 rounded-xl border text-center transition-all ${
                selectedStyle === style.id
                  ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span className={`block text-[11px] font-semibold ${selectedStyle === style.id ? 'text-violet-700' : 'text-slate-600'}`}>
                {style.name}
              </span>
              <span className="block text-[9px] text-slate-400 mt-0.5 leading-tight">{style.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color + Logo row */}
      <div className="flex gap-3">
        {/* Brand color */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Brand Color</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="w-5 h-5 rounded-md border border-slate-200 flex-shrink-0" style={{ backgroundColor: options.color ?? '#7c3aed' }} />
              <span className="text-sm text-slate-700 font-mono">{options.color ?? '#7c3aed'}</span>
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-56">
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => { onOptionsChange({ ...options, color: preset.hex }); setShowColorPicker(false); }}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        options.color === preset.hex ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={options.color ?? '#7c3aed'}
                    onChange={(e) => onOptionsChange({ ...options, color: e.target.value })}
                    placeholder="#hex"
                    className="flex-1 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(false)}
                    className="px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logo URL */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Logo URL <span className="text-slate-400 font-normal">(optional)</span></label>
          <input
            type="text"
            value={options.logoUrl ?? ''}
            onChange={(e) => onOptionsChange({ ...options, logoUrl: e.target.value || undefined })}
            placeholder="https://your-logo.png"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300"
          />
        </div>
      </div>
    </div>
  );
}
