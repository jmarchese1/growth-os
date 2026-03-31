'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  campaignName: string;
  targetCity: string;
  lat: number;
  lon: number;
  bbox: { lon1: number; lat1: number; lon2: number; lat2: number } | null;
}

export function MapButton({ campaignName, targetCity, lat, lon, bbox }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Build OpenStreetMap embed URL with the bbox region
  // Use the bbox center and zoom to fit the area
  const centerLat = bbox ? (bbox.lat1 + bbox.lat2) / 2 : lat;
  const centerLon = bbox ? (bbox.lon1 + bbox.lon2) / 2 : lon;

  // Estimate zoom level from bbox size
  const latRange = bbox ? Math.abs(bbox.lat2 - bbox.lat1) : 0.15;
  const lonRange = bbox ? Math.abs(bbox.lon2 - bbox.lon1) : 0.15;
  const maxRange = Math.max(latRange, lonRange);
  let zoom = 13;
  if (maxRange > 0.5) zoom = 10;
  else if (maxRange > 0.2) zoom = 11;
  else if (maxRange > 0.1) zoom = 12;
  else if (maxRange > 0.05) zoom = 13;
  else if (maxRange > 0.02) zoom = 14;
  else zoom = 15;

  // Build bbox string for OSM embed
  const bboxParam = bbox
    ? `${bbox.lon1},${bbox.lat1},${bbox.lon2},${bbox.lat2}`
    : `${lon - 0.08},${lat - 0.06},${lon + 0.08},${lat + 0.06}`;

  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxParam}&layer=mapnik&marker=${centerLat},${centerLon}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-sky-600/20 border border-sky-500/30 text-sky-300 text-xs font-medium rounded-lg hover:bg-sky-600/30 hover:text-sky-200 transition-colors flex items-center gap-1.5"
        title="View search area on map"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
        Map
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-semibold text-white">Search Area</h2>
                <p className="text-xs text-slate-500 mt-0.5">{campaignName} — {targetCity}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">&times;</button>
            </div>

            {/* Map */}
            <div className="relative">
              <iframe
                src={osmUrl}
                className="w-full border-0"
                style={{ height: '480px' }}
                title="Campaign search area"
                loading="lazy"
              />

              {/* Bbox overlay info */}
              {bbox && (
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                  <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider mb-1">Bounding Box</p>
                  <p className="text-[11px] text-slate-300 font-mono">
                    SW: {bbox.lat1.toFixed(4)}, {bbox.lon1.toFixed(4)}
                  </p>
                  <p className="text-[11px] text-slate-300 font-mono">
                    NE: {bbox.lat2.toFixed(4)}, {bbox.lon2.toFixed(4)}
                  </p>
                </div>
              )}

              {!bbox && (
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-amber-500/20">
                  <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">15km Circle (no bbox)</p>
                  <p className="text-[11px] text-slate-400">
                    This campaign uses a fixed 15km radius. Re-create with AI location resolver for a tighter boundary.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
