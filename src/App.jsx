import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import NetworkBanner from './components/NetworkBanner.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Gallery from './pages/Gallery.jsx';
import Mint from './pages/Mint.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leaderboard from './pages/Leaderboard.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <NetworkBanner />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/mint" element={<Mint />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<div className="max-w-6xl mx-auto px-5 py-20 text-center text-mute">Page not found.</div>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
