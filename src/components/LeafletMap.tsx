import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const userIcon = L.divIcon({
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#3b82f6;border:3px solid white;
    box-shadow:0 0 0 4px rgba(59,130,246,0.25),0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

function clinicIcon(index: number) {
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:#f97316;border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      color:white;font-size:12px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
    ">${index}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}


export interface MapPin {
  lat: number;
  lng: number;
  label?: string;
  type?: 'user' | 'clinic';
  index?: number;
  // Optional rich data for clinic popups
  address?: string | null;
  phone?: string | null;
  openingHours?: string | null;
  website?: string | null;
  distance?: string | null;
  mapsUrl?: string | null;
}

interface Props {
  center: [number, number];
  zoom?: number;
  pins?: MapPin[];
  autoFit?: boolean;
  className?: string;
  userPos?: [number, number];
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length < 2) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48], maxZoom: 15 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(positions)]);
  return null;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center); }, [center, map]);
  return null;
}

function CenterOnUser({ position }: { position: [number, number] }) {
  const map = useMap();
  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '80px', marginRight: '10px', pointerEvents: 'auto' }}>
      <div className="leaflet-control">
        <button
          onClick={() => map.setView(position, 15)}
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'white', border: '2px solid rgba(0,0,0,0.15)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Centrar en mi ubicación"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function buildClinicPopup(pin: MapPin): string {
  const phoneHref = pin.phone
    ? `tel:${pin.phone.replace(/[\s\-()]/g, '')}`
    : null;

  const rows: string[] = [];

  if (pin.distance) {
    rows.push(`<span style="display:inline-block;background:#fff7ed;color:#ea580c;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-bottom:4px;">📍 ${pin.distance}</span>`);
  }
  if (pin.address) {
    rows.push(`<div style="color:#64748b;font-size:12px;margin-top:2px;">🏠 ${pin.address}</div>`);
  }
  if (pin.phone) {
    rows.push(`<div style="margin-top:3px;"><a href="${phoneHref}" style="color:#f97316;font-size:12px;font-weight:600;text-decoration:none;">📞 ${pin.phone}</a></div>`);
  }
  if (pin.openingHours) {
    rows.push(`<div style="color:#64748b;font-size:11px;margin-top:3px;">🕐 ${pin.openingHours}</div>`);
  }

  const links: string[] = [];
  if (pin.mapsUrl) {
    links.push(`<a href="${pin.mapsUrl}" target="_blank" rel="noopener noreferrer" style="background:#f1f5f9;color:#334155;font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;text-decoration:none;">Ver en Maps ↗</a>`);
  }
  if (pin.website) {
    links.push(`<a href="${pin.website}" target="_blank" rel="noopener noreferrer" style="background:#f1f5f9;color:#334155;font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;text-decoration:none;">Web ↗</a>`);
  }
  if (links.length) {
    rows.push(`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">${links.join('')}</div>`);
  }

  return `
    <div style="font-family:system-ui,sans-serif;min-width:180px;max-width:240px;">
      <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:4px;line-height:1.3;">${pin.label ?? 'Clínica Veterinaria'}</div>
      ${rows.join('')}
    </div>
  `;
}

export function LeafletMap({ center, zoom = 14, pins = [], autoFit = false, className = '', userPos }: Props) {
  const positions = pins.map<[number, number]>(p => [p.lat, p.lng]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {autoFit && positions.length > 1
        ? <FitBounds positions={positions} />
        : <RecenterMap center={center} />
      }

      {userPos && <CenterOnUser position={userPos} />}

      {pins.map((pin, i) => (
        <Marker
          key={i}
          position={[pin.lat, pin.lng]}
          icon={pin.type === 'user' ? userIcon : clinicIcon(pin.index ?? i)}
        >
          {pin.type === 'user' ? (
            <Popup>
              <div style={{ fontFamily: 'system-ui,sans-serif', fontWeight: 700, fontSize: 13 }}>
                📍 Tu ubicación
              </div>
            </Popup>
          ) : (
            <Popup>
              <div dangerouslySetInnerHTML={{ __html: buildClinicPopup(pin) }} />
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
