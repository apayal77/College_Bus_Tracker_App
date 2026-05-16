import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, MapPin, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface Stop {
  name: string;
  latitude: number;
  longitude: number;
}

const stopIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1483/1483336.png', // Map pin icon
    iconSize: [25, 25],
    iconAnchor: [12, 25],
});

const MapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapCenterUpdater = ({ coords }: { coords: {lat: number, lng: number} | null }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], 16);
    }
  }, [coords, map]);
  return null;
};

const ManageRoutes = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ routeName: '', driverId: '' });
  const [selectedStops, setSelectedStops] = useState<Stop[]>([]);
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  const [newStopName, setNewStopName] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Fetch Routes
    const unsubscribeRoutes = onSnapshot(collection(db, 'routes'), (snapshot) => {
      const routeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoutes(routeList);
      setLoading(false);
    });

    // Fetch Drivers for the dropdown
    const qDrivers = query(collection(db, 'users'), where('role', '==', 'driver'));
    const unsubscribeDrivers = onSnapshot(qDrivers, (snapshot) => {
      const driverList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driverList);
    });

    return () => {
      unsubscribeRoutes();
      unsubscribeDrivers();
    };
  }, []);

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationSearch.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setTempCoords({ lat: newLat, lng: newLng });
        setNewStopName(display_name.split(',')[0]); // Default stop name to first part of address
      } else {
        alert("Location not found. Try being more specific.");
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    setNewStopName('');
  };

  const confirmAddStop = () => {
    if (tempCoords && newStopName.trim()) {
      setSelectedStops([...selectedStops, { 
        name: newStopName.trim(), 
        latitude: tempCoords.lat, 
        longitude: tempCoords.lng 
      }]);
      setTempCoords(null);
      setNewStopName('');
    }
  };

  const removeStop = (index: number) => {
    setSelectedStops(selectedStops.filter((_, i) => i !== index));
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStops.length === 0) {
      alert("Please add at least one stop on the map.");
      return;
    }
    try {
      await addDoc(collection(db, 'routes'), {
        routeName: formData.routeName,
        stops: selectedStops,
        driverId: formData.driverId || null,
        studentIds: [],
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setFormData({ routeName: '', driverId: '' });
      setSelectedStops([]);
    } catch (error) {
      alert('Error adding route');
    }
  };

  const filteredRoutes = routes.filter(route => 
    route.routeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDriverName = (driverId: string) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : driverId;
  };

  return (
    <div>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Routes</h1>
          <p className="text-slate-400 mt-1">Define bus paths and assign drivers.</p>
        </div>
        <div className="flex w-full md:w-auto gap-4">
           <input 
              type="text"
              placeholder="Search routes..."
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white flex-1 md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
           />
           <button 
             onClick={() => setShowModal(true)}
             className="flex items-center gap-2 bg-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-500 transition-all shadow-lg shadow-amber-600/20 whitespace-nowrap"
           >
             <Plus size={20} />
             Create Route
           </button>
        </div>
      </header>

      {/* List View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <p className="text-slate-500 col-span-2 text-center py-10">Loading...</p>
        ) : filteredRoutes.length === 0 ? (
          <p className="text-slate-500 col-span-2 text-center py-10">No routes found.</p>
        ) : (
          filteredRoutes.map((route) => (
            <div key={route.id} className="card relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-amber-500/10 p-3 rounded-xl">
                  <MapPin className="text-amber-500" size={24} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                        if (window.confirm('Are you sure you want to delete this route?')) {
                            deleteDoc(doc(db, 'routes', route.id));
                        }
                    }}
                    className="p-2 text-slate-400 hover:text-red-400 bg-transparent transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{route.routeName}</h3>
              <p className="text-sm text-slate-400 mb-4">Driver: <span className="text-emerald-500">{getDriverName(route.driverId)}</span></p>
              
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stops ({route.stops?.length || 0})</p>
                <div className="flex flex-wrap gap-2">
                  {route.stops?.map((stop: any, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                      {typeof stop === 'string' ? stop : stop.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Route Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="card w-full max-w-5xl shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create New Route</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={handleAddRoute} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="card bg-slate-800/30 border-slate-700/50">
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4">Route Info</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Route Name</label>
                      <input 
                        type="text" required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg text-white p-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        placeholder="e.g. Route 01 - North"
                        value={formData.routeName}
                        onChange={(e) => setFormData({...formData, routeName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Assign Driver</label>
                      <select 
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg text-white p-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                        value={formData.driverId}
                        onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                      >
                        <option value="">Unassigned</option>
                        {drivers.map(driver => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} ({driver.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="card bg-slate-800/30 border-slate-700/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Added Stops ({selectedStops.length})</h3>
                    {selectedStops.length > 0 && (
                      <button type="button" onClick={() => setSelectedStops([])} className="text-[10px] text-red-400 hover:underline">Clear All</button>
                    )}
                  </div>
                  <div className="space-y-2 min-h-[150px] max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedStops.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
                        <MapPin size={24} className="mb-2 opacity-20" />
                        <p className="text-xs">No stops added yet.</p>
                        <p className="text-[10px] mt-1">Click the map to begin.</p>
                      </div>
                    ) : (
                      selectedStops.map((stop, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/30 group">
                          <div className="flex items-center gap-3">
                             <span className="w-5 h-5 flex items-center justify-center bg-amber-500 text-black rounded-full text-[10px] font-bold">{i+1}</span>
                             <span className="text-sm text-slate-200 font-medium">{stop.name}</span>
                          </div>
                          <button type="button" onClick={() => removeStop(i)} className="text-slate-500 hover:text-red-400 transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-600/20 transition-all">Create Route</button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-400">Search & Add Stops</label>
                   <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Search for a location/address..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:border-amber-500 outline-none"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation(e))}
                      />
                      <button 
                        type="button"
                        onClick={handleSearchLocation}
                        className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700"
                        disabled={isSearching}
                      >
                        {isSearching ? '...' : 'Search'}
                      </button>
                   </div>
                </div>
                
                <div className="h-[400px] rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative">
                  <MapContainer 
                    center={[16.65, 74.27]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapEvents onMapClick={handleMapClick} />
                    <MapCenterUpdater coords={tempCoords} />
                    
                    {/* Existing Stops */}
                    {selectedStops.map((stop, i) => (
                      <Marker key={i} position={[stop.latitude, stop.longitude]} icon={stopIcon}>
                        <Popup>{stop.name}</Popup>
                      </Marker>
                    ))}

                    {/* New Temporary Stop */}
                    {tempCoords && (
                      <Marker position={[tempCoords.lat, tempCoords.lng]} icon={stopIcon} />
                    )}
                  </MapContainer>

                  {/* Inline Stop Name Input overlay */}
                  {tempCoords && (
                    <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-slate-900/95 backdrop-blur p-4 rounded-xl border border-amber-500/50 shadow-2xl flex gap-2">
                       <input 
                         autoFocus
                         type="text"
                         placeholder="Enter stop name..."
                         className="flex-1 bg-slate-800 border-none rounded-lg text-white text-sm px-4 outline-none focus:ring-1 focus:ring-amber-500"
                         value={newStopName}
                         onChange={(e) => setNewStopName(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), confirmAddStop())}
                       />
                       <button 
                         type="button"
                         onClick={confirmAddStop}
                         disabled={!newStopName.trim()}
                         className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                       >
                         Add Stop
                       </button>
                       <button 
                         type="button"
                         onClick={() => setTempCoords(null)}
                         className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg"
                       >
                         <X size={16} />
                       </button>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 italic text-center">Tip: Search for an address above or click the map directly.</p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRoutes;
