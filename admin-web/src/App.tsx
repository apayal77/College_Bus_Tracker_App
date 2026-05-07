import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ManageUsers from './pages/ManageUsers';
import ManageRoutes from './pages/ManageRoutes';
import LiveMonitor from './pages/LiveMonitor';

function App() {
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
