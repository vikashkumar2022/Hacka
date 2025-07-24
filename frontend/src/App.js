import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Verify from './pages/Verify';
import AuditTrail from './pages/AuditTrail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { BlockchainProvider } from './context/BlockchainContext';
import { AuthProvider } from './context/AuthContext';
import { FileProvider } from './contexts/FileContext';

function App() {
  return (
    <AuthProvider>
      <BlockchainProvider>
        <FileProvider>
          <div className="App">
            <Navbar />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/audit" element={<AuditTrail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Container>
          </div>
        </FileProvider>
      </BlockchainProvider>
    </AuthProvider>
  );
}

export default App;
