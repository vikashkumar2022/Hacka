import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  VerifiedUser,
  Error,
  CheckCircle,
  Warning,
  Security,
  ContentCopy,
  CloudUpload,
  Description,
  Visibility,
  Timeline
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useBlockchain } from '../context/BlockchainContext';
import CryptoJS from 'crypto-js';

const Verify = () => {
  const { verifyFileOnBlockchain, loading } = useBlockchain();
  
  const [hashInput, setHashInput] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationMethod, setVerificationMethod] = useState('hash'); // 'hash' or 'file'
  const [fileHash, setFileHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFileInput(file);
      setVerificationMethod('file');
      
      // Generate hash for the file
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
        const hash = CryptoJS.SHA256(wordArray).toString();
        setFileHash(hash);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  const verifyFile = async () => {
    try {
      setIsVerifying(true);
      setVerificationResult(null);
      
      const hashToVerify = verificationMethod === 'hash' ? hashInput : fileHash;
      
      if (!hashToVerify) {
        throw new Error('Please provide a file hash or upload a file');
      }

      // Remove '0x' prefix if present
      const cleanHash = hashToVerify.startsWith('0x') ? hashToVerify.slice(2) : hashToVerify;
      const hashWithPrefix = '0x' + cleanHash;

      const result = await verifyFileOnBlockchain(hashWithPrefix);
      
      const verificationData = {
        fileHash: result.fileHash,
        fileName: result.fileName,
        fileSize: Number(result.fileSize),
        ipfsHash: result.ipfsHash,
        uploader: result.uploader,
        timestamp: Number(result.timestamp),
        exists: result.exists,
        inputHash: hashToVerify,
        isValid: result.exists && result.fileHash.toLowerCase() === hashWithPrefix.toLowerCase()
      };

      setVerificationResult(verificationData);
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        isValid: false,
        error: error.message || 'Verification failed',
        inputHash: verificationMethod === 'hash' ? hashInput : fileHash
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const VerificationStatus = ({ result }) => {
    if (!result) return null;

    if (result.error) {
      return (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Verification Failed
          </Typography>
          <Typography>{result.error}</Typography>
        </Alert>
      );
    }

    if (!result.exists) {
      return (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            File Not Found
          </Typography>
          <Typography>
            No file with this hash was found on the blockchain. This could mean:
          </Typography>
          <ul>
            <li>The file was never uploaded to this system</li>
            <li>The hash is incorrect</li>
            <li>The file has been tampered with</li>
          </ul>
        </Alert>
      );
    }

    return (
      <Alert 
        severity={result.isValid ? "success" : "error"} 
        sx={{ mb: 3 }}
        icon={result.isValid ? <CheckCircle /> : <Error />}
      >
        <Typography variant="h6" gutterBottom>
          {result.isValid ? 'File Verified Successfully' : 'Verification Failed'}
        </Typography>
        <Typography>
          {result.isValid 
            ? 'The file hash matches the blockchain record. File integrity confirmed.'
            : 'The file hash does not match the blockchain record. File may have been tampered with.'
          }
        </Typography>
      </Alert>
    );
  };

  const FileDetails = ({ result }) => {
    if (!result || !result.exists) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
            File Information
          </Typography>
          
          <List dense>
            <ListItem>
              <ListItemIcon><Description /></ListItemIcon>
              <ListItemText 
                primary="File Name" 
                secondary={result.fileName || 'Unknown'}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon><Security /></ListItemIcon>
              <ListItemText 
                primary="File Size" 
                secondary={formatFileSize(result.fileSize)}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon><CloudUpload /></ListItemIcon>
              <ListItemText 
                primary="Uploader Address" 
                secondary={
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {result.uploader}
                    </Typography>
                    <IconButton size="small" onClick={() => copyToClipboard(result.uploader)}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Box>
                }
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon><Timeline /></ListItemIcon>
              <ListItemText 
                primary="Upload Time" 
                secondary={formatTimestamp(result.timestamp)}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon><Security /></ListItemIcon>
              <ListItemText 
                primary="Blockchain Hash" 
                secondary={
                  <Box className="hash-display" sx={{ mt: 1 }}>
                    {result.fileHash}
                    <IconButton size="small" onClick={() => copyToClipboard(result.fileHash)}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Box>
                }
              />
            </ListItem>
            
            {result.ipfsHash && (
              <ListItem>
                <ListItemIcon><CloudUpload /></ListItemIcon>
                <ListItemText 
                  primary="IPFS Hash" 
                  secondary={
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {result.ipfsHash}
                      </Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(result.ipfsHash)}>
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                />
              </ListItem>
            )}
          </List>

          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Chip 
              label={result.isValid ? "Verified" : "Invalid"}
              color={result.isValid ? "success" : "error"}
              icon={result.isValid ? <CheckCircle /> : <Error />}
            />
            <Chip 
              label="On Blockchain"
              color="primary"
              icon={<Security />}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        File Verification
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Verify file integrity using blockchain records
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* Verification Methods */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Choose Verification Method
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Button
                variant={verificationMethod === 'hash' ? 'contained' : 'outlined'}
                onClick={() => setVerificationMethod('hash')}
                sx={{ mr: 2 }}
              >
                Verify by Hash
              </Button>
              <Button
                variant={verificationMethod === 'file' ? 'contained' : 'outlined'}
                onClick={() => setVerificationMethod('file')}
              >
                Verify by File
              </Button>
            </Box>

            {verificationMethod === 'hash' ? (
              <Box>
                <TextField
                  fullWidth
                  label="Enter SHA-256 Hash"
                  placeholder="e.g., a1b2c3d4e5f6..."
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                  helperText="Enter the SHA-256 hash of the file you want to verify"
                />
              </Box>
            ) : (
              <Box>
                <Paper 
                  {...getRootProps()} 
                  className={`upload-zone ${isDragActive ? 'active' : ''}`}
                  sx={{ mb: 2, cursor: 'pointer' }}
                >
                  <input {...getInputProps()} />
                  <VerifiedUser sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {isDragActive ? 'Drop file here' : 'Upload file to verify'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    We'll generate the hash and verify against blockchain
                  </Typography>
                  <Button variant="outlined">
                    Select File
                  </Button>
                </Paper>

                {fileInput && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1">
                        Selected File: {fileInput.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Size: {formatFileSize(fileInput.size)}
                      </Typography>
                      {fileHash && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="textSecondary">
                            Generated Hash:
                          </Typography>
                          <Box className="hash-display" sx={{ mt: 0.5 }}>
                            {fileHash}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}

            <Button
              variant="contained"
              onClick={verifyFile}
              disabled={
                isVerifying || 
                loading ||
                (verificationMethod === 'hash' && !hashInput) ||
                (verificationMethod === 'file' && !fileHash)
              }
              startIcon={<VerifiedUser />}
              size="large"
            >
              {isVerifying ? 'Verifying...' : 'Verify File'}
            </Button>
          </Paper>

          {/* Verification Results */}
          {verificationResult && (
            <Box>
              <VerificationStatus result={verificationResult} />
              <FileDetails result={verificationResult} />
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {/* Information Panel */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              How Verification Works
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon><Security /></ListItemIcon>
                <ListItemText 
                  primary="Hash Generation"
                  secondary="Files are hashed using SHA-256 algorithm"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><CheckCircle /></ListItemIcon>
                <ListItemText 
                  primary="Blockchain Lookup"
                  secondary="Hash is searched in our smart contract"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon><VerifiedUser /></ListItemIcon>
                <ListItemText 
                  primary="Integrity Check"
                  secondary="Original file data is compared with blockchain record"
                />
              </ListItem>
            </List>
          </Paper>

          {/* Security Information */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              Security Features
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Tamper Detection"
                  secondary="Any change to the file will result in a different hash"
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Immutable Records"
                  secondary="Blockchain ensures upload records cannot be altered"
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Cryptographic Proof"
                  secondary="SHA-256 provides cryptographic integrity guarantee"
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Decentralized"
                  secondary="No single point of failure or control"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Verification Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detailed Verification Report</DialogTitle>
        <DialogContent>
          {verificationResult && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Verification Summary
              </Typography>
              {/* Add detailed verification report content here */}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Verify;
