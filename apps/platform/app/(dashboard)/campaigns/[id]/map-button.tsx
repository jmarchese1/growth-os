'use client';

import { useState, useEffect, useRef } from 'react';
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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !mapRef.current || mapInstanceRef.current) return;

    // Dynamically load Leaflet CSS + JS (no npm dependency needed)
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(linkEl);

    const scriptEl = document.createElement('script');
    scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptEl.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const centerLat = bbox ? (bbox.lat1 + bbox.lat2) / 2 : lat;
      const centerLon = bbox ? (bbox.lon1 + bbox.lon2) / 2 : lon;

      const map = L.map(mapRef.current, { zoomControl: true });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      if (bbox) {
        // Draw shaded rectangle for bbox
        const bounds = L.latLngBounds(
          [bbox.lat1, bbox.lon1], // SW
          [bbox.lat2, bbox.lon2], // NE
        );
        L.rectangle(bounds, {
          color: '#7c3aed',
          weight: 2,
          fillColor: '#7c3aed',
          fillOpacity: 0.15,
          dashArray: '6 4',
        }).addTo(map);

        // Fit map to bbox with padding
        map.fitBounds(bounds, { padding: [40, 40] });

        // Center marker
        L.circleMarker([centerLat, centerLon], {
          radius: 5,
          color: '#7c3aed',
          fillColor: '#7c3aed',
          fillOpacity: 1,
        }).addTo(map).bindPopup(`<b>${targetCity}</b><br>AI bounding box`);

      } else {
        // Draw shaded circle for 15km radius
        L.circle([lat, lon], {
          radius: 15000,
          color: '#f59e0b',
          weight: 2,
          fillColor: '#f59e0b',
          fillOpacity: 0.12,
          dashArray: '6 4',
        }).addTo(map);

        // Center marker
        L.circleMarker([lat, lon], {
          radius: 5,
          color: '#f59e0b',
          fillColor: '#f59e0b',
          fillOpacity: 1,
        }).addTo(map).bindPopup(`<b>${targetCity}</b><br>15km radius`);

        // Fit to the circle
        map.setView([lat, lon], 11);
      }
    };
    document.head.appendChild(scriptEl);

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [open, lat, lon, bbox, targetCity]);

  // Reset map instance when modal closes so it re-initializes on next open
  useEffect(() => {
    if (!open && mapInstanceRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapInstanceRef.current as any).remove();
      mapInstanceRef.current = null;
    }
  }, [open]);

  const isBbox = !!bbox;

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
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  isBbox
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isBbox ? 'bg-violet-400' : 'bg-amber-400'}`} />
                  {isBbox ? 'AI Bounding Box' : '15km Circle'}
                </span>
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">&times;</button>
              </div>
            </div>

            {/* Map container */}
            <div ref={mapRef} style={{ height: '500px', width: '100%' }} />

            {/* Footer with coords */}
            <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 font-mono">
                {bbox ? (
                  <>SW: {bbox.lat1.toFixed(4)}, {bbox.lon1.toFixed(4)} — NE: {bbox.lat2.toFixed(4)}, {bbox.lon2.toFixed(4)}</>
                ) : (
                  <>Center: {lat.toFixed(4)}, {lon.toFixed(4)} — Radius: 15km</>
                )}
              </div>
              {!bbox && (
                <p className="text-[10px] text-amber-400/70">
                  Re-create campaign with AI resolver for tighter boundaries
                </p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
