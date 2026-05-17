import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ManageRoutes from './pages/ManageRoutes';
import LiveMonitor from './pages/LiveMonitor';
import { isFirebaseConfigured } from './firebase';

function App() {
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            ⚠️
          </div>
          <h1 className="text-2xl font-bold mb-4">Firebase Config Missing</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            The database environment variables are not configured in your hosting platform (Netlify/Vercel). 
            Please configure the following environment keys in your Site Settings to launch the Admin dashboard:
          </p>
          <div className="text-left bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-500 space-y-1 mb-6 border border-slate-900">
            <div>• VITE_FIREBASE_API_KEY</div>
            <div>• VITE_FIREBASE_PROJECT_ID</div>
            <div>• VITE_FIREBASE_AUTH_DOMAIN</div>
            <div>• VITE_FIREBASE_APP_ID</div>
          </div>
          <p className="text-xs text-slate-500">
            Once added, trigger a new deploy on Netlify and your system will activate!
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<ManageUsers role="student" />} />
          <Route path="/drivers" element={<ManageUsers role="driver" />} />
          <Route path="/routes" element={<ManageRoutes />} />
          <Route path="/monitor" element={<LiveMonitor />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
