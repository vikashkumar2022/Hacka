import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ContentCopy as ContentCopyIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useBlockchain } from '../context/BlockchainContext';
import { useAuth } from '../context/AuthContext';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import { useFiles } from '../contexts/FileContext';

const Upload = () => {
  const { isConnected, account, uploadFileToBlockchain, loading: blockchainLoading } = useBlockchain();
  const { isAuthenticated, API_BASE_URL } = useAuth();
  const { uploadedFiles, addFile, updateFile, removeFile, clearFiles } = useFiles();
  
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const steps = ['Select Files', 'Generate Hashes', 'Upload to Blockchain', 'Complete'];

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      hash: null,
      progress: 0,
      blockchainTx: null,
      ipfsHash: null,
      error: null
    }));
    
    newFiles.forEach(file => addFile(file));
    if (activeStep === 0) setActiveStep(1);
  }, [activeStep, addFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'text/*': ['.txt', '.csv', '.json'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const generateFileHash = async (file) => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const arrayBuffer = e.target.result;
            const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
            const hash = CryptoJS.SHA256(wordArray).toString();
            console.log('Generated hash for file:', file.file.name, hash);
            resolve(hash);
          } catch (error) {
            console.error('Error processing file data:', error);
            reject(error);
          }
        };
        reader.onerror = (error) => {
          console.error('Error reading file:', error);
          reject(error);
        };
        reader.readAsArrayBuffer(file.file);
      } catch (error) {
        console.error('Error setting up file reader:', error);
        reject(error);
      }
    });
  };

  const generateHashes = async () => {
    setActiveStep(1);
    console.log('Starting hash generation for', uploadedFiles.length, 'files');
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.hash) {
        console.log('Skipping file (already has hash):', file.file.name);
        continue;
      }
      
      try {
        console.log('Processing file:', file.file.name);
        setUploadProgress(prev => ({ ...prev, [file.id]: 25 }));
        const hash = await generateFileHash(file);
        
        updateFile(file.id, { hash, status: 'hashed' });
        setUploadProgress(prev => ({ ...prev, [file.id]: 100 }));
        console.log('Hash generation completed for:', file.file.name);
      } catch (error) {
        console.error('Hash generation error:', error);
        updateFile(file.id, { status: 'error', error: 'Hash generation failed' });
        setUploadProgress(prev => ({ ...prev, [file.id]: 0 }));
      }
    }
    
    console.log('Hash generation process completed');
    setActiveStep(2);
  };

  const uploadToIPFS = async (file) => {
    try {
      console.log('Uploading file to IPFS:', file.file.name);
      const formData = new FormData();
      formData.append('file', file.file);
      
      // Ensure we have the current token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await axios.post(`${API_BASE_URL}/files/upload-ipfs`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('IPFS upload response:', response.data);
      return response.data.ipfsHash;
    } catch (error) {
      console.error('IPFS upload error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.error || 'IPFS upload failed');
    }
  };

  const handleUploadToBlockchain = async () => {
    try {
      await uploadToBlockchain();
    } catch (error) {
      console.error('Button click error:', error);
      alert('Upload failed: ' + error.message);
    }
  };

  const uploadToBlockchain = async () => {
    console.log('uploadToBlockchain called');
    console.log('isConnected:', isConnected);
    console.log('isAuthenticated:', isAuthenticated);
    console.log('Current token:', localStorage.getItem('token'));
    
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!isAuthenticated) {
      alert('Please login first');
      return;
    }

    // Double-check token exists
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No authentication token found. Please login again.');
      return;
    }

    setUploading(true);
    setActiveStep(2);

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.status !== 'hashed') continue;

      try {
        setUploadProgress(prev => ({ ...prev, [file.id]: 60 }));
        
        // Upload to IPFS first
        const ipfsHash = await uploadToIPFS(file);
        updateFile(file.id, { ipfsHash });
        setUploadProgress(prev => ({ ...prev, [file.id]: 75 }));

        // Upload to blockchain
        const result = await uploadFileToBlockchain(
          '0x' + file.hash,
          file.name,
          file.size,
          ipfsHash
        );

        // Save metadata to backend
        const token = localStorage.getItem('token');
        console.log('🔐 Saving metadata to backend with token:', token ? 'YES' : 'NO');
        console.log('📤 Metadata payload:', {
          fileName: file.name,
          fileHash: file.hash,
          fileSize: file.size,
          ipfsHash: ipfsHash,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          walletAddress: account
        });
        
        const metadataResponse = await axios.post(`${API_BASE_URL}/files/upload`, {
          fileName: file.name,
          fileHash: file.hash,
          fileSize: file.size,
          ipfsHash: ipfsHash,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          walletAddress: account
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Metadata save response:', metadataResponse.data);

        updateFile(file.id, { 
          status: 'completed', 
          blockchainTx: result 
        });
        setUploadProgress(prev => ({ ...prev, [file.id]: 100 }));
        
        setUploadResults(prev => [...prev, {
          fileName: file.name,
          hash: file.hash,
          transactionHash: result.transactionHash,
          status: 'success'
        }]);

      } catch (error) {
        console.error('Upload error:', error);
        updateFile(file.id, { 
          status: 'error', 
          error: error.message || 'Upload failed' 
        });
        
        setUploadResults(prev => [...prev, {
          fileName: file.name,
          hash: file.hash,
          status: 'error',
          error: error.message
        }]);
      }
    }

    setActiveStep(3);
    setUploading(false);
  };

  const removeUploadFile = (fileId) => {
    removeFile(fileId);
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const FileItem = ({ file }) => (
    <Card sx={{ mb: 2 }} className="file-item">
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" flex={1}>
            <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="subtitle1" noWrap>
                {file.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {(file.size / 1024).toFixed(2)} KB • {file.type}
              </Typography>
              {file.hash && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    SHA-256:
                  </Typography>
                  <Box className="hash-display" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                    {file.hash}
                    <IconButton size="small" onClick={() => copyToClipboard(file.hash)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Chip 
              label={file.status}
              color={
                file.status === 'completed' ? 'success' :
                file.status === 'error' ? 'error' :
                file.status === 'hashed' ? 'info' : 'default'
              }
              size="small"
            />
            
            {file.status !== 'completed' && (
              <IconButton onClick={() => removeUploadFile(file.id)} color="error">
                <DeleteIcon />
              </IconButton>
            )}
            
            <IconButton 
              onClick={() => {
                setSelectedFile(file);
                setDetailsOpen(true);
              }}
            >
              <VisibilityIcon />
            </IconButton>
          </Box>
        </Box>

        {uploadProgress[file.id] > 0 && uploadProgress[file.id] < 100 && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress[file.id]} />
            <Typography variant="caption" color="textSecondary">
              {uploadProgress[file.id]}% complete
            </Typography>
          </Box>
        )}

        {file.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {file.error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Secure File Upload
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Upload files to the blockchain with cryptographic integrity verification
      </Typography>

      {/* Progress Stepper */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Connection Status */}
      {(!isConnected || !isAuthenticated) && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {!isConnected && !isAuthenticated 
            ? 'Please connect your wallet and login to upload files'
            : !isConnected 
            ? 'Please connect your wallet to upload files to the blockchain'
            : 'Please login to save upload metadata'
          }
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* File Drop Zone */}
          <Paper 
            {...getRootProps()} 
            className={`upload-zone ${isDragActive ? 'active' : ''}`}
            sx={{ mb: 3, cursor: 'pointer' }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              or click to browse files
            </Typography>
            <Button variant="outlined">
              Select Files
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 2 }}>
              Supported: PDF, Images, Documents, Text files (Max 100MB each)
            </Typography>
          </Paper>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Selected Files ({uploadedFiles.length})
              </Typography>
              {uploadedFiles.map((file) => (
                <FileItem key={file.id} file={file} />
              ))}
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Actions Panel */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={generateHashes}
                disabled={uploadedFiles.length === 0 || uploadedFiles.every(f => f.hash)}
                startIcon={<SecurityIcon />}
                fullWidth
              >
                Generate Hashes
              </Button>
              
              <Button
                variant="contained"
                onClick={handleUploadToBlockchain}
                disabled={
                  !isConnected || 
                  !isAuthenticated || 
                  uploadedFiles.length === 0 || 
                  !uploadedFiles.some(f => f.status === 'hashed') ||
                  uploading ||
                  blockchainLoading
                }
                startIcon={<CheckCircleIcon />}
                fullWidth
              >
                {uploading ? 'Uploading...' : 'Upload to Blockchain'}
              </Button>
              
              {uploadedFiles.length > 0 && (
                <Button
                  variant="text"
                  color="error"
                  onClick={() => {
                    clearFiles();
                    setUploadProgress({});
                    setUploadResults([]);
                    setActiveStep(0);
                  }}
                  fullWidth
                >
                  Clear All
                </Button>
              )}
            </Box>
          </Paper>

          {/* Upload Summary */}
          {uploadResults.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Upload Summary
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Total: {uploadResults.length} files
                </Typography>
                <Typography variant="body2" color="success.main">
                  Success: {uploadResults.filter(r => r.status === 'success').length}
                </Typography>
                <Typography variant="body2" color="error.main">
                  Failed: {uploadResults.filter(r => r.status === 'error').length}
                </Typography>
              </Box>

              {uploadResults.map((result, index) => (
                <Alert 
                  key={index}
                  severity={result.status === 'success' ? 'success' : 'error'}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2">
                    {result.fileName}
                  </Typography>
                  {result.status === 'success' && result.transactionHash && (
                    <Typography variant="caption">
                      TX: {result.transactionHash.slice(0, 10)}...
                    </Typography>
                  )}
                </Alert>
              ))}
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* File Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>File Details</DialogTitle>
        <DialogContent>
          {selectedFile && (
            <List>
              <ListItem>
                <ListItemIcon><DescriptionIcon /></ListItemIcon>
                <ListItemText primary="File Name" secondary={selectedFile.name} />
              </ListItem>
              <ListItem>
                <ListItemIcon><InfoIcon /></ListItemIcon>
                <ListItemText primary="Size" secondary={`${(selectedFile.size / 1024).toFixed(2)} KB`} />
              </ListItem>
              <ListItem>
                <ListItemIcon><InfoIcon /></ListItemIcon>
                <ListItemText primary="Type" secondary={selectedFile.type} />
              </ListItem>
              {selectedFile.hash && (
                <ListItem>
                  <ListItemIcon><SecurityIcon /></ListItemIcon>
                  <ListItemText 
                    primary="SHA-256 Hash" 
                    secondary={
                      <Box className="hash-display" sx={{ mt: 1 }}>
                        {selectedFile.hash}
                      </Box>
                    }
                  />
                </ListItem>
              )}
              {selectedFile.blockchainTx && (
                <>
                  <ListItem>
                    <ListItemIcon><CheckCircleIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Transaction Hash" 
                      secondary={selectedFile.blockchainTx.transactionHash}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircleIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Block Number" 
                      secondary={selectedFile.blockchainTx.blockNumber}
                    />
                  </ListItem>
                </>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Upload;
