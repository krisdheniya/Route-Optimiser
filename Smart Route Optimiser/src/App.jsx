import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Navigation, MapPin, Loader2, Clock, Ruler, Info, ChevronRight, Menu, X } from 'lucide-react';
import { Dijkstra, calculateDistance } from './utils/dijkstra';
import { fetchOSMData, buildGraphFromOSM, findNearestNode } from './utils/osm';

// Custom Marker Icons
const createCustomIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div class="marker-inner" style="background-color: ${color}"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const startIcon = createCustomIcon('#8b5cf6'); // Violet
const endIcon = createCustomIcon('#ec4899'); // Pink

function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function RouteFocus({ path }) {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 0) {
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [path, map]);
  return null;
}

export default function App() {
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleMapClick = (latlng) => {
    if (!source) {
      setSource([latlng.lat, latlng.lng]);
    } else if (!destination) {
      setDestination([latlng.lat, latlng.lng]);
    } else {
      setSource([latlng.lat, latlng.lng]);
      setDestination(null);
      setPath([]);
      setRouteInfo(null);
    }
  };

  const calculateRoute = async () => {
    if (!source || !destination) return;
    
    setLoading(true);
    try {
      // Increase padding to 0.05 to ensure we get a larger road network around the points
      const bbox = [
        Math.min(source[0], destination[0]) - 0.05,
        Math.min(source[1], destination[1]) - 0.05,
        Math.max(source[0], destination[0]) + 0.05,
        Math.max(source[1], destination[1]) + 0.05,
      ];

      const data = await fetchOSMData(bbox);
      const dijkstra = new Dijkstra();
      buildGraphFromOSM(data, dijkstra, calculateDistance);

      const startNodeId = findNearestNode(source[0], source[1], data);
      const endNodeId = findNearestNode(destination[0], destination[1], data);

      if (startNodeId && endNodeId) {
        const result = dijkstra.findShortestPath(startNodeId, endNodeId);
        if (result) {
          setPath(result);
          
          // Calculate distance
          let totalDist = 0;
          for(let i=0; i<result.length-1; i++) {
            totalDist += calculateDistance(result[i][0], result[i][1], result[i+1][0], result[i+1][1]);
          }
          
          setRouteInfo({
            distance: (totalDist / 1000).toFixed(2),
            time: Math.max(1, Math.round(totalDist / (13.8 * 60))) // average speed 50km/h, converted to minutes
          });
        } else {
          alert('No route found between these points.');
        }
      }
    } catch (error) {
      console.error(error);
      alert('Error calculating route. Please try a smaller area.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (source && destination) {
      calculateRoute();
    }
  }, [source, destination]);

  return (
    <div className="relative h-screen w-screen bg-[#111] font-sans selection:bg-primary/30">
      {/* Sidebar */}
      <div className={`absolute top-0 left-0 h-full z-[1000] transition-all duration-500 ease-in-out ${sidebarOpen ? 'w-96' : 'w-0 overflow-hidden'}`}>
        <div className="h-full glass-panel m-4 rounded-3xl flex flex-col p-6 border-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Navigation className="text-primary w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Route Optimiser
              </h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 text-white/40" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Input Groups */}
            <div className="relative space-y-3">
              <div className="absolute left-[1.35rem] top-8 bottom-8 w-[2px] bg-white/5 border-l border-dashed border-white/20"></div>
              
              <div className="relative flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                <div className="relative z-10 w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">Source</p>
                  <p className="text-sm text-white/80 truncate">
                    {source ? `${source[0].toFixed(4)}, ${source[1].toFixed(4)}` : "Click on map to set source"}
                  </p>
                </div>
              </div>

              <div className="relative flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                <div className="relative z-10 w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]"></div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">Destination</p>
                  <p className="text-sm text-white/80 truncate">
                    {destination ? `${destination[0].toFixed(4)}, ${destination[1].toFixed(4)}` : "Click on map to set destination"}
                  </p>
                </div>
              </div>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-primary/5 rounded-3xl border border-primary/10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-primary/80 font-medium animate-pulse">Calculating optimal path...</p>
              </div>
            )}

            {routeInfo && !loading && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 text-white/40 mb-2">
                      <Ruler className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider font-bold">Distance</span>
                    </div>
                    <p className="text-xl font-bold text-white">{routeInfo.distance} <span className="text-sm font-normal text-white/40">km</span></p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 text-white/40 mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-wider font-bold">Duration</span>
                    </div>
                    <p className="text-xl font-bold text-white">{routeInfo.time} <span className="text-sm font-normal text-white/40">min</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Route Steps</h3>
                    <span className="text-[10px] text-primary font-bold">{path.length} points</span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400">1</div>
                      <p className="text-xs text-white/60">Start from origin point</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/40">2</div>
                      <p className="text-xs text-white/60">Proceed through optimized road network</p>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="w-5 h-5 rounded-full bg-pink-500/20 flex items-center justify-center text-[10px] font-bold text-pink-400">3</div>
                      <p className="text-xs text-white/60">Arrive at destination</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Info className="w-5 h-5 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                Using Dijkstra's algorithm with Overpass API data for real-world geographic routing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 z-[1000] p-4 glass-panel rounded-2xl hover:bg-white/10 transition-all group"
        >
          <Menu className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Map */}
      <div className="h-full w-full">
        <MapContainer 
          center={[19.7506, 75.7139]} 
          zoom={7} 
          className="h-full w-full"
          zoomControl={false}
          maxBounds={[[15.6, 72.6], [22.1, 80.9]]}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <MapEvents onMapClick={handleMapClick} />
          
          {source && <Marker position={source} icon={startIcon} />}
          {destination && <Marker position={destination} icon={endIcon} />}
          
          {path.length > 0 && (
            <>
              <Polyline 
                positions={path} 
                pathOptions={{ 
                  color: '#8b5cf6', 
                  weight: 6, 
                  opacity: 0.3 
                }} 
              />
              <Polyline 
                positions={path} 
                className="route-polyline"
                pathOptions={{ 
                  color: '#8b5cf6', 
                  weight: 4, 
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: '1, 10'
                }} 
              />
              <RouteFocus path={path} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Bottom Floating Card (Attribution) */}
      <div className="absolute bottom-6 right-6 z-[1000] p-3 px-5 glass-panel rounded-full border-white/5">
        <p className="text-[10px] text-white/40 tracking-widest uppercase font-bold">
          Developed by Krish Dheniya • 2025
        </p>
      </div>
    </div>
  );
}
