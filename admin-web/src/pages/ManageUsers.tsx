import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';

const ManageUsers = ({ role }: { role: 'student' | 'driver' }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', routeAssigned: '' });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [role]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteDoc(doc(db, 'users', id));
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users'), {
        ...formData,
        role,
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setFormData({ name: '', phone: '', routeAssigned: '' });
    } catch (error) {
      alert('Error adding user');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  );

  return (
    <div>
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white capitalize">Manage {role}s</h1>
          <p className="text-slate-400 mt-1">Add, update, or remove {role}s from the system.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={20} />
          Add {role}
        </button>
      </header>

      <div className="card mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder={`Search ${role}s by name or phone...`}
            className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border-none rounded-xl text-white focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="px-6 py-4 text-slate-400 font-semibold uppercase text-xs">Name</th>
              <th className="px-6 py-4 text-slate-400 font-semibold uppercase text-xs">Phone</th>
              <th className="px-6 py-4 text-slate-400 font-semibold uppercase text-xs">Assigned Route</th>
              <th className="px-6 py-4 text-slate-400 font-semibold uppercase text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">Loading...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">No users found.</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                  <td className="px-6 py-4 text-slate-400">{user.phone}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm">
                      {user.routeAssigned || 'None'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button className="p-2 text-slate-400 hover:text-blue-400 bg-transparent">
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-400 hover:text-red-400 bg-transparent"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="card w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Add New {role}</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                <input 
                  type="text" required
                  className="w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Phone Number</label>
                <input 
                  type="tel" required
                  className="w-full"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: (e.target as HTMLInputElement).value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Assign Route (Optional)</label>
                <input 
                  type="text"
                  className="w-full"
                  value={formData.routeAssigned}
                  onChange={(e) => setFormData({...formData, routeAssigned: (e.target as HTMLInputElement).value})}
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
                <button type="submit" className="flex-1 bg-blue-600">
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
