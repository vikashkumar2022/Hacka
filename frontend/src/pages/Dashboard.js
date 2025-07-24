import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button
} from '@mui/material';
import {
  CloudUpload,
  VerifiedUser,
  Security,
  Timeline,
  TrendingUp,
  Warning,
  CheckCircle,
  Speed,
  Storage,
  AccountBalanceWallet
} from '@mui/icons-material';
import { useBlockchain } from '../context/BlockchainContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { isConnected, account, getTotalFiles, connectWallet } = useBlockchain();
  const { isAuthenticated, API_BASE_URL } = useAuth();
  
  const [stats, setStats] = useState({
    totalFiles: 0,
    userFiles: 0,
    verifiedFiles: 0,
    totalSize: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [isConnected, isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get blockchain stats
      const totalFiles = await getTotalFiles();
      
      // Get user stats from backend
      if (isAuthenticated) {
        const response = await axios.get(`${API_BASE_URL}/files/stats`);
        setStats(prev => ({
          ...prev,
          ...response.data,
          totalFiles
        }));
      } else {
        setStats(prev => ({
          ...prev,
          totalFiles
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card className="stat-card">
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: color, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const SecurityStatus = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
        Security Status
      </Typography>
      
      <List dense>
        <ListItem>
          <ListItemIcon>
            {isConnected ? <CheckCircle color="success" /> : <Warning color="warning" />}
          </ListItemIcon>
          <ListItemText 
            primary="Wallet Connection"
            secondary={isConnected ? `Connected: ${account}` : 'Not connected'}
          />
          {!isConnected && (
            <Button size="small" onClick={connectWallet} variant="outlined">
              Connect
            </Button>
          )}
        </ListItem>
        
        <ListItem>
          <ListItemIcon>
            {isAuthenticated ? <CheckCircle color="success" /> : <Warning color="warning" />}
          </ListItemIcon>
          <ListItemText 
            primary="Authentication"
            secondary={isAuthenticated ? 'Authenticated' : 'Not authenticated'}
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon>
            <CheckCircle color="success" />
          </ListItemIcon>
          <ListItemText 
            primary="Smart Contract"
            secondary="Connected to FileRegistry contract"
          />
        </ListItem>
      </List>
    </Paper>
  );

  const RecentActivity = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
        Recent Activity
      </Typography>
      
      {stats.recentActivity.length > 0 ? (
        <List dense>
          {stats.recentActivity.map((activity, index) => (
            <React.Fragment key={index}>
              <ListItem>
                <ListItemIcon>
                  {activity.type === 'upload' ? <CloudUpload /> : <VerifiedUser />}
                </ListItemIcon>
                <ListItemText 
                  primary={activity.fileName}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {activity.type === 'upload' ? 'Uploaded' : 'Verified'} • {activity.timestamp}
                      </Typography>
                      <Chip 
                        label={activity.status} 
                        size="small" 
                        color={activity.status === 'Success' ? 'success' : 'error'}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  }
                />
              </ListItem>
              {index < stats.recentActivity.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      ) : (
        <Typography color="textSecondary" sx={{ py: 2 }}>
          No recent activity
        </Typography>
      )}
    </Paper>
  );

  const QuickActions = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Quick Actions
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<CloudUpload />}
            onClick={() => window.location.href = '/upload'}
            disabled={!isConnected || !isAuthenticated}
          >
            Upload File
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<VerifiedUser />}
            onClick={() => window.location.href = '/verify'}
          >
            Verify File
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Monitor your file security and blockchain activity
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Files"
            value={stats.totalFiles}
            icon={<Storage />}
            color="primary.main"
            subtitle="On blockchain"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Your Files"
            value={stats.userFiles}
            icon={<CloudUpload />}
            color="success.main"
            subtitle="Uploaded by you"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Verified Files"
            value={stats.verifiedFiles}
            icon={<VerifiedUser />}
            color="info.main"
            subtitle="Successfully verified"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Size"
            value={`${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`}
            icon={<Speed />}
            color="warning.main"
            subtitle="Storage used"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <SecurityStatus />
          <QuickActions />
        </Grid>
        <Grid item xs={12} md={6}>
          <RecentActivity />
        </Grid>
      </Grid>

      {/* Connection Warning */}
      {(!isConnected || !isAuthenticated) && (
        <Paper 
          sx={{ 
            p: 3, 
            mt: 3, 
            backgroundColor: 'warning.light', 
            border: '1px solid',
            borderColor: 'warning.main'
          }}
        >
          <Box display="flex" alignItems="center">
            <Warning sx={{ mr: 2, color: 'warning.dark' }} />
            <Box>
              <Typography variant="h6" color="warning.dark">
                Setup Required
              </Typography>
              <Typography color="warning.dark">
                {!isConnected && !isAuthenticated 
                  ? 'Please connect your wallet and login to access all features.'
                  : !isConnected 
                  ? 'Please connect your wallet to upload files to the blockchain.'
                  : 'Please login to access your files and upload history.'
                }
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Dashboard;
