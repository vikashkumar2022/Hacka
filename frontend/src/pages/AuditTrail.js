import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Grid,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Pagination,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Timeline,
  CloudUpload,
  VerifiedUser,
  Security,
  Person,
  CalendarToday,
  FilterList,
  Search
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';

const AuditTrail = () => {
  const { isAuthenticated, API_BASE_URL } = useAuth();
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [stats, setStats] = useState({
    totalLogs: 0,
    uploads: 0,
    verifications: 0,
    logins: 0
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadAuditLogs();
      loadAuditStats();
    }
  }, [isAuthenticated, page, filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await axios.get(`${API_BASE_URL}/analytics/audit-logs?${params}`);
      setAuditLogs(response.data.logs);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/audit-stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading audit stats:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
    setPage(1);
  };

  const getActionIcon = (action) => {
    const iconMap = {
      'file_uploaded': <CloudUpload color="primary" />,
      'file_verified': <VerifiedUser color="success" />,
      'file_deleted': <Security color="error" />,
      'login_success': <Person color="success" />,
      'login_failed': <Person color="error" />,
      'user_registered': <Person color="primary" />,
      'profile_updated': <Person color="info" />,
      'password_changed': <Security color="warning" />
    };
    return iconMap[action] || <Timeline />;
  };

  const getActionColor = (action) => {
    const colorMap = {
      'file_uploaded': 'primary',
      'file_verified': 'success',
      'file_deleted': 'error',
      'login_success': 'success',
      'login_failed': 'error',
      'user_registered': 'primary',
      'profile_updated': 'info',
      'password_changed': 'warning'
    };
    return colorMap[action] || 'default';
  };

  const formatAction = (action) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" color={color}>
              {value}
            </Typography>
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
        Please login to view audit trail.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Audit Trail
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Track all system activities and user actions
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Events"
            value={stats.totalLogs}
            icon={<Timeline />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="File Uploads"
            value={stats.uploads}
            icon={<CloudUpload />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Verifications"
            value={stats.verifications}
            icon={<VerifiedUser />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Login Events"
            value={stats.logins}
            icon={<Person />}
            color="warning.main"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filters
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="Search"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search logs..."
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={filters.action}
                label="Action"
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="file_uploaded">File Uploaded</MenuItem>
                <MenuItem value="file_verified">File Verified</MenuItem>
                <MenuItem value="file_deleted">File Deleted</MenuItem>
                <MenuItem value="login_success">Login Success</MenuItem>
                <MenuItem value="login_failed">Login Failed</MenuItem>
                <MenuItem value="user_registered">User Registered</MenuItem>
                <MenuItem value="profile_updated">Profile Updated</MenuItem>
                <MenuItem value="password_changed">Password Changed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Resource Type</InputLabel>
              <Select
                value={filters.resourceType}
                label="Resource Type"
                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="file">File</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="From Date"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              label="To Date"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              fullWidth
              sx={{ height: 56 }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Audit Logs */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : auditLogs.length === 0 ? (
          <Alert severity="info">
            No audit logs found matching your criteria.
          </Alert>
        ) : (
          <>
            <div className="audit-timeline">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="audit-item">
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box sx={{ mt: 0.5 }}>
                      {getActionIcon(log.action)}
                    </Box>
                    
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {formatAction(log.action)}
                        </Typography>
                        <Chip 
                          label={log.resource_type}
                          size="small"
                          color={getActionColor(log.action)}
                          variant="outlined"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="textSecondary" mb={1}>
                        {log.details && typeof log.details === 'object' ? (
                          <Box>
                            {Object.entries(log.details).map(([key, value]) => (
                              <Box key={key} component="span" sx={{ mr: 2 }}>
                                <strong>{key}:</strong> {String(value)}
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          log.details || 'No additional details'
                        )}
                      </Typography>
                      
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="caption" color="textSecondary">
                          <CalendarToday sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                          {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </Typography>
                        
                        {log.ip_address && (
                          <Typography variant="caption" color="textSecondary">
                            IP: {log.ip_address}
                          </Typography>
                        )}
                        
                        {log.resource_id && (
                          <Typography variant="caption" color="textSecondary">
                            ID: {log.resource_id}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={3}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, newPage) => setPage(newPage)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AuditTrail;
