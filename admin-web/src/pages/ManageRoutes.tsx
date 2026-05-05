import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, Search, MapPin } from 'lucide-react';

const ManageRoutes = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ routeName: '', stops: '', driverId: '' });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'routes'), (snapshot) => {
      const routeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoutes(routeList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      await deleteDoc(doc(db, 'routes', id));
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const stopsArray = formData.stops.split(',').map(s => s.trim()).filter(s => s !== '');
      await addDoc(collection(db, 'routes'), {
        routeName: formData.routeName,
        stops: stopsArray,
        driverId: formData.driverId || null,
        studentIds: [],
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setFormData({ routeName: '', stops: '', driverId: '' });
    } catch (error) {
      alert('Error adding route');
    }
  };

  const filteredRoutes = routes.filter(route => 
    route.routeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <div className="card mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search routes by name..."
            className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border-none rounded-xl text-white focus:ring-2 focus:ring-amber-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

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
                  <button className="p-2 text-slate-400 hover:text-blue-400 bg-transparent">
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(route.id)}
                    className="p-2 text-slate-400 hover:text-red-400 bg-transparent"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{route.routeName}</h3>
              <p className="text-sm text-slate-400 mb-4">Driver: <span className="text-emerald-500">{route.driverId || 'Unassigned'}</span></p>
              
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stops</p>
                <div className="flex flex-wrap gap-2">
                  {route.stops?.map((stop: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                      {stop}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="card w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Create New Route</h2>
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Route Name</label>
                <input 
                  type="text" required
                  className="w-full"
                  placeholder="e.g. Route 01 - North"
                  value={formData.routeName}
                  onChange={(e) => setFormData({...formData, routeName: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Stops (Comma separated)</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-3 text-white"
                  placeholder="e.g. Main Gate, Library, Block A"
                  value={formData.stops}
                  onChange={(e) => setFormData({...formData, stops: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Driver ID (Optional)</label>
                <input 
                  type="text"
                  className="w-full"
                  placeholder="e.g. driver_john_id"
                  value={formData.driverId}
                  onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                />
              </div>
              <div className="flex gap-4 mt-8">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-amber-600">
                  Create Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRoutes;
