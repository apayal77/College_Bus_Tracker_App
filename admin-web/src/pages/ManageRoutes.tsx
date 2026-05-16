import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, MapPin, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
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

const ManageRoutes = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ routeName: '', driverId: '' });
  const [selectedStops, setSelectedStops] = useState<Stop[]>([]);

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

  const handleMapClick = (lat: number, lng: number) => {
    const stopName = window.prompt("Enter name for this stop (e.g., Main Gate):");
    if (stopName) {
      setSelectedStops([...selectedStops, { name: stopName, latitude: lat, longitude: lng }]);
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
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Routes</h1>
          <p className="text-slate-400 mt-1">Define bus paths and assign drivers.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-500 transition-all shadow-lg shadow-amber-600/20"
        >
          <Plus size={20} />
          Create Route
        </button>
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
                    className="p-2 text-slate-400 hover:text-red-400 bg-transparent"
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
          <div className="card w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create New Route</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={handleAddRoute} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Route Name</label>
                  <input 
                    type="text" required
                    className="w-full bg-[#0f172a] border-slate-700 rounded-lg text-white"
                    placeholder="e.g. Route 01 - North"
                    value={formData.routeName}
                    onChange={(e) => setFormData({...formData, routeName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Assign Driver</label>
                  <select 
                    className="w-full bg-[#0f172a] border-slate-700 rounded-lg text-white p-2.5"
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
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Added Stops ({selectedStops.length})</label>
                  <div className="bg-[#0f172a] rounded-lg p-3 space-y-2 min-h-[150px] max-h-[250px] overflow-y-auto border border-slate-800">
                    {selectedStops.length === 0 ? (
                      <p className="text-slate-500 text-xs italic">Click on the map to add stops...</p>
                    ) : (
                      selectedStops.map((stop, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-800 p-2 rounded text-sm">
                          <span className="truncate mr-2">{i+1}. {stop.name}</span>
                          <button type="button" onClick={() => removeStop(i)} className="text-red-400 hover:text-red-300 p-1 bg-transparent">
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 bg-amber-600 font-bold py-3 rounded-xl">Create Route</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-400">Click Map to Add Stops</label>
                <div className="h-[400px] rounded-xl overflow-hidden border border-slate-700">
                  <MapContainer 
                    center={[16.65, 74.27]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapEvents onMapClick={handleMapClick} />
                    {selectedStops.map((stop, i) => (
                      <Marker key={i} position={[stop.latitude, stop.longitude]} icon={stopIcon}>
                        <Popup>{stop.name}</Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRoutes;
