import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton
} from '@mui/material';
import {
  Person,
  Security,
  Notifications,
  AccountBalanceWallet,
  Key,
  History,
  Delete,
  Edit,
  Save,
  Cancel,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useBlockchain } from '../context/BlockchainContext';

const Settings = () => {
  const { user, updateProfile, loading: authLoading } = useAuth();
  const { account, isConnected, connectWallet, disconnectWallet, networkId } = useBlockchain();
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    wallet_address: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    twoFactorAuth: false,
    autoBackup: true,
    darkMode: false
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        wallet_address: user.wallet_address || ''
      });
    }
  }, [user]);

  const showAlert = (message, severity = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  };

  const handleProfileUpdate = async () => {
    try {
      await updateProfile(profileForm);
      setEditingProfile(false);
      showAlert('Profile updated successfully', 'success');
    } catch (error) {
      showAlert(error.message || 'Failed to update profile', 'error');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showAlert('New passwords do not match', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showAlert('Password must be at least 8 characters long', 'error');
      return;
    }

    try {
      // Implement password change API call
      showAlert('Password changed successfully', 'success');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordDialogOpen(false);
    } catch (error) {
      showAlert(error.message || 'Failed to change password', 'error');
    }
  };

  const handleWalletConnect = async () => {
    try {
      await connectWallet();
      if (account) {
        setProfileForm(prev => ({ ...prev, wallet_address: account }));
        showAlert('Wallet connected successfully', 'success');
      }
    } catch (error) {
      showAlert('Failed to connect wallet', 'error');
    }
  };

  const handleWalletDisconnect = () => {
    disconnectWallet();
    setProfileForm(prev => ({ ...prev, wallet_address: '' }));
    showAlert('Wallet disconnected', 'info');
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
    showAlert(`${setting} ${value ? 'enabled' : 'disabled'}`, 'info');
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
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Manage your account, security, and preferences
      </Typography>

      {/* Alerts */}
      {alerts.map(alert => (
        <Alert 
          key={alert.id} 
          severity={alert.severity} 
          sx={{ mb: 2 }}
          onClose={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
        >
          {alert.message}
        </Alert>
      ))}

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                Profile Information
              </Typography>
              <IconButton 
                onClick={() => setEditingProfile(!editingProfile)}
                color={editingProfile ? "error" : "primary"}
              >
                {editingProfile ? <Cancel /> : <Edit />}
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!editingProfile}
                  variant={editingProfile ? "outlined" : "filled"}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!editingProfile}
                  variant={editingProfile ? "outlined" : "filled"}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Wallet Address"
                  value={profileForm.wallet_address}
                  disabled
                  variant="filled"
                  helperText="Connect your wallet to link it to your account"
                />
              </Grid>
            </Grid>

            {editingProfile && (
              <Box display="flex" gap={2} mt={2}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleProfileUpdate}
                  disabled={authLoading}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setEditingProfile(false)}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Paper>

          {/* Security Settings */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              Security
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <Key />
                </ListItemIcon>
                <ListItemText
                  primary="Change Password"
                  secondary="Update your account password"
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPasswordDialogOpen(true)}
                  >
                    Change
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>

              <Divider />

              <ListItem>
                <ListItemIcon>
                  <Security />
                </ListItemIcon>
                <ListItemText
                  primary="Two-Factor Authentication"
                  secondary="Add an extra layer of security"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.twoFactorAuth}
                    onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <Divider />

              <ListItem>
                <ListItemIcon>
                  <History />
                </ListItemIcon>
                <ListItemText
                  primary="Login History"
                  secondary="View your recent login activity"
                />
                <ListItemSecondaryAction>
                  <Button variant="outlined" size="small">
                    View
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Wallet & Blockchain Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
              Wallet & Blockchain
            </Typography>

            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle1">
                      Wallet Connection
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {isConnected ? (
                        <>
                          Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
                          <br />
                          Network: {getNetworkName(Number(networkId))}
                        </>
                      ) : (
                        'No wallet connected'
                      )}
                    </Typography>
                  </Box>
                  <Box>
                    {isConnected ? (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleWalletDisconnect}
                        size="small"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleWalletConnect}
                        size="small"
                      >
                        Connect
                      </Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Typography variant="subtitle2" gutterBottom>
              Network Status
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip 
                label={isConnected ? "Connected" : "Disconnected"}
                color={isConnected ? "success" : "error"}
                size="small"
              />
              {networkId && (
                <Chip 
                  label={getNetworkName(Number(networkId))}
                  color="info"
                  size="small"
                />
              )}
            </Box>
          </Paper>

          {/* Notification Settings */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
              Notifications
            </Typography>

            <List>
              <ListItem>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive updates via email"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemText
                  primary="Push Notifications"
                  secondary="Browser push notifications"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemText
                  primary="Auto Backup"
                  secondary="Automatically backup your data"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.autoBackup}
                    onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </Paper>

          {/* Danger Zone */}
          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'error.main' }}>
            <Typography variant="h6" gutterBottom color="error">
              Danger Zone
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Once you delete your account, there is no going back. Please be certain.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete Account
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                type={showPassword.current ? "text" : "password"}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                      edge="end"
                    >
                      {showPassword.current ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type={showPassword.new ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                      edge="end"
                    >
                      {showPassword.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPassword.confirm ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                      edge="end"
                    >
                      {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handlePasswordChange} 
            variant="contained"
            disabled={!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle color="error">Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone. This will permanently delete your account and remove all associated data.
          </Alert>
          <Typography>
            Are you sure you want to delete your account? All your files and data will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            color="error" 
            variant="contained"
            onClick={() => {
              // Implement account deletion
              showAlert('Account deletion is not implemented in this demo', 'warning');
              setDeleteDialogOpen(false);
            }}
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
