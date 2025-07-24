import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar
} from '@mui/material';
import {
  AccountBalanceWallet,
  Dashboard,
  CloudUpload,
  VerifiedUser,
  Timeline,
  Analytics,
  Settings,
  AccountCircle,
  Logout
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBlockchain } from '../context/BlockchainContext';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { account, isConnected, connectWallet, disconnectWallet, loading, networkId } = useBlockchain();
  const { user, isAuthenticated, login, register, logout } = useAuth();

  // Debug authentication state
  console.log('🔍 Navbar render - isAuthenticated:', isAuthenticated, 'user:', user);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [walletError, setWalletError] = useState('');

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: <Dashboard /> },
    { label: 'Upload', path: '/upload', icon: <CloudUpload /> },
    { label: 'Verify', path: '/verify', icon: <VerifiedUser /> },
    { label: 'Audit Trail', path: '/audit', icon: <Timeline /> },
    { label: 'Analytics', path: '/analytics', icon: <Analytics /> },
    { label: 'Settings', path: '/settings', icon: <Settings /> }
  ];

  const handleMenuClick = (path) => {
    navigate(path);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLoginSubmit = async () => {
    try {
      setLoginError('');
      console.log('🚀 Login form submitted');
      console.log('📧 Email from form:', loginForm.email);
      console.log('🔒 Password provided:', loginForm.password ? 'YES' : 'NO');
      
      const result = await login(loginForm.email, loginForm.password);
      console.log('✅ Login successful in Navbar:', result);
      
      // Close dialog and clear form
      setLoginOpen(false);
      setLoginForm({ email: '', password: '' });
      
      console.log('🔄 Dialog closed, form cleared');
    } catch (error) {
      console.error('❌ Login error in Navbar:', error);
      console.error('📋 Error details:', {
        message: error.message,
        error: error.error,
        response: error.response,
        full: error
      });
      
      // Extract meaningful error message
      let errorMessage = 'Login failed';
      if (error.error) {
        errorMessage = error.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      console.log('💥 Setting error message:', errorMessage);
      setLoginError(errorMessage);
    }
  };

  const handleRegisterSubmit = async () => {
    try {
      setRegisterError('');
      
      if (registerForm.password !== registerForm.confirmPassword) {
        setRegisterError('Passwords do not match');
        return;
      }
      
      if (registerForm.password.length < 6) {
        setRegisterError('Password must be at least 6 characters');
        return;
      }
      
      await register({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password
      });
      setRegisterOpen(false);
      setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
    } catch (error) {
      setRegisterError(error.message || 'Registration failed');
    }
  };

  const handleWalletConnect = async () => {
    try {
      setWalletError('');
      await connectWallet();
    } catch (error) {
      console.error('Wallet connection error:', error);
      if (error.message?.includes('MetaMask not found')) {
        setWalletError('MetaMask not detected. Please install MetaMask browser extension.');
      } else if (error.message?.includes('User rejected')) {
        setWalletError('Connection rejected. Please approve the connection in MetaMask.');
      } else {
        setWalletError(error.message || 'Failed to connect wallet. Please try again.');
      }
    }
  };

  const getNetworkName = (chainId) => {
    const networks = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      11155111: 'Sepolia Testnet',
      137: 'Polygon Mainnet',
      80001: 'Polygon Mumbai',
      1337: 'Local Network'
    };
    return networks[chainId] || `Network ${chainId}`;
  };

  return (
    <>
      <AppBar position="sticky" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            🔐 Blockchain File Security
          </Typography>

          {/* Navigation Menu */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}>
            {menuItems.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                startIcon={item.icon}
                onClick={() => handleMenuClick(item.path)}
                sx={{
                  mx: 0.5,
                  backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Wallet Connection */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isConnected ? (
              <>
                <Chip
                  label={getNetworkName(Number(networkId))}
                  size="small"
                  color="secondary"
                  variant="filled"
                />
                <Chip
                  icon={<AccountBalanceWallet />}
                  label={`${account.slice(0, 6)}...${account.slice(-4)}`}
                  onClick={disconnectWallet}
                  color="success"
                  variant="filled"
                />
              </>
            ) : (
              <Button
                variant="outlined"
                startIcon={<AccountBalanceWallet />}
                onClick={handleWalletConnect}
                disabled={loading}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Connect Wallet
              </Button>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <>
                <IconButton onClick={handleUserMenuOpen} color="inherit">
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || <AccountCircle />}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleUserMenuClose}
                >
                  <MenuItem onClick={() => { handleUserMenuClose(); navigate('/settings'); }}>
                    <Settings sx={{ mr: 1 }} /> Settings
                  </MenuItem>
                  <MenuItem onClick={() => { handleUserMenuClose(); logout(); }}>
                    <Logout sx={{ mr: 1 }} /> Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setRegisterOpen(true)}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Register
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setLoginOpen(true)}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Login
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onClose={() => setLoginOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Login to Your Account</DialogTitle>
        <DialogContent>
          {loginError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={loginForm.email}
            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleLoginSubmit()}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleLoginSubmit()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleLoginSubmit} 
            variant="contained"
            disabled={!loginForm.email || !loginForm.password}
          >
            Login
          </Button>
          <Button 
            onClick={() => {
              setLoginOpen(false);
              setRegisterOpen(true);
            }}
          >
            Need an account? Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* Registration Dialog */}
      <Dialog open={registerOpen} onClose={() => setRegisterOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Account</DialogTitle>
        <DialogContent>
          {registerError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registerError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={registerForm.username}
            onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={registerForm.email}
            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={registerForm.password}
            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Confirm Password"
            type="password"
            fullWidth
            variant="outlined"
            value={registerForm.confirmPassword}
            onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleRegisterSubmit()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRegisterSubmit} 
            variant="contained"
            disabled={!registerForm.username || !registerForm.email || !registerForm.password || !registerForm.confirmPassword}
          >
            Register
          </Button>
          <Button 
            onClick={() => {
              setRegisterOpen(false);
              setLoginOpen(true);
            }}
          >
            Have an account? Login
          </Button>
        </DialogActions>
      </Dialog>

      {/* Wallet Error Snackbar */}
      <Snackbar
        open={!!walletError}
        autoHideDuration={6000}
        onClose={() => setWalletError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setWalletError('')}>
          {walletError}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Navbar;
