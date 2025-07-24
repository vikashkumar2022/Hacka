import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import {
  TrendingUp,
  CloudUpload,
  VerifiedUser,
  Security,
  Timeline,
  Speed,
  Assessment,
  DateRange
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useBlockchain } from '../context/BlockchainContext';
import axios from 'axios';
import { format, subDays, startOfDay } from 'date-fns';

const Analytics = () => {
  const { isAuthenticated, API_BASE_URL } = useAuth();
  const { isConnected, getTotalFiles } = useBlockchain();
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState({
    overview: {
      totalFiles: 0,
      totalVerifications: 0,
      totalUsers: 0,
      totalSize: 0
    },
    uploadTrend: [],
    verificationTrend: [],
    fileTypes: [],
    userActivity: [],
    blockchainStats: {
      gasUsed: 0,
      avgBlockTime: 0,
      totalTransactions: 0
    }
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, isAuthenticated]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      // Load analytics data
      const [overviewRes, trendsRes, blockchainRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/analytics/overview`),
        axios.get(`${API_BASE_URL}/analytics/trends?range=${timeRange}`),
        axios.get(`${API_BASE_URL}/analytics/blockchain-stats`)
      ]);

      // Get blockchain total files if connected
      let blockchainTotalFiles = 0;
      if (isConnected) {
        try {
          blockchainTotalFiles = await getTotalFiles();
        } catch (error) {
          console.error('Error getting blockchain total files:', error);
        }
      }

      setAnalytics({
        overview: {
          totalFiles: overviewRes.data.overview?.total_files || 0,
          totalVerifications: overviewRes.data.overview?.verified_files || 0,
          totalUsers: overviewRes.data.overview?.total_users || 0,
          totalSize: overviewRes.data.overview?.total_size || 0,
          recentUploads: overviewRes.data.overview?.recent_uploads || 0,
          blockchainTransactions: overviewRes.data.overview?.blockchain_transactions || 0,
          blockchainTotalFiles
        },
        uploadTrend: trendsRes.data.trends || [],
        verificationTrend: trendsRes.data.trends || [],
        fileTypes: trendsRes.data.fileTypes || [],
        userActivity: trendsRes.data.userActivity || [],
        blockchainStats: {
          gasUsed: blockchainRes.data.blockchain?.gas_price || '0 gwei',
          avgBlockTime: blockchainRes.data.blockchain?.last_block_time || 0,
          totalTransactions: blockchainRes.data.blockchain?.total_transactions || 0,
          blockHeight: blockchainRes.data.blockchain?.block_height || 0,
          networkStatus: blockchainRes.data.blockchain?.network_status || 'unknown'
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    const numValue = Number(num);
    if (numValue >= 1000000) return (numValue / 1000000).toFixed(1) + 'M';
    if (numValue >= 1000) return (numValue / 1000).toFixed(1) + 'K';
    return numValue.toString();
  };

  const StatCard = ({ title, value, subtitle, icon, color, trend }) => (
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
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUp 
                  sx={{ 
                    fontSize: 16, 
                    mr: 0.5, 
                    color: trend > 0 ? 'success.main' : 'error.main' 
                  }} 
                />
                <Typography 
                  variant="caption" 
                  color={trend > 0 ? 'success.main' : 'error.main'}
                >
                  {trend > 0 ? '+' : ''}{trend}% from last period
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: color, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (!isAuthenticated) {
    return (
      <Alert severity="warning">
        Please login to view analytics.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Comprehensive insights into file security and system performance
      </Typography>

      {/* Time Range Selector */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          System Overview
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="90d">Last 90 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Files"
            value={formatNumber(analytics.overview.totalFiles)}
            subtitle="Files uploaded"
            icon={<CloudUpload />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Verifications"
            value={formatNumber(analytics.overview.totalVerifications)}
            subtitle="Files verified"
            icon={<VerifiedUser />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Users"
            value={formatNumber(analytics.overview.totalUsers)}
            subtitle="Registered users"
            icon={<Security />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Storage"
            value={formatBytes(analytics.overview.totalSize)}
            subtitle="Data secured"
            icon={<Speed />}
            color="warning.main"
          />
        </Grid>
      </Grid>

      {/* Blockchain Stats */}
      {isConnected && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                Blockchain Statistics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {analytics.overview.blockchainTotalFiles}
                    </Typography>
                    <Typography color="textSecondary">
                      Files on Blockchain
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {formatNumber(analytics.blockchainStats.totalTransactions)}
                    </Typography>
                    <Typography color="textSecondary">
                      Total Transactions
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {analytics.blockchainStats.gasUsed}
                    </Typography>
                    <Typography color="textSecondary">
                      Gas Price
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Upload Trend */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Timeline sx={{ mr: 1, verticalAlign: 'middle' }} />
              Upload Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.uploadTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Area 
                  type="monotone" 
                  dataKey="uploads" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Verification Trend */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <VerifiedUser sx={{ mr: 1, verticalAlign: 'middle' }} />
              Verification Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.verificationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Line 
                  type="monotone" 
                  dataKey="verifications" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="successful" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* File Types Distribution */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
              File Types Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.fileTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.fileTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* User Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <DateRange sx={{ mr: 1, verticalAlign: 'middle' }} />
              User Activity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.userActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Refresh Button */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Button
          variant="outlined"
          onClick={loadAnalytics}
          startIcon={<TrendingUp />}
          disabled={loading}
        >
          Refresh Analytics
        </Button>
      </Box>
    </Box>
  );
};

export default Analytics;
