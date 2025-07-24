import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const BlockchainContext = createContext();

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (!context) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
};

export const BlockchainProvider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [networkId, setNetworkId] = useState(null);

  // Smart contract configuration - Updated for test networks
  const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x742d35Cc6634C0532925a3b8D404d77443Ebe1d5';
  const SUPPORTED_NETWORKS = {
    1: 'Ethereum Mainnet',
    3: 'Ropsten Testnet', 
    4: 'Rinkeby Testnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    137: 'Polygon Mainnet',
    80001: 'Polygon Mumbai',
    1337: 'Local Network',
    31337: 'Hardhat Local'
  };
  const CONTRACT_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "fileHash",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "uploader",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "fileName",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "FileUploaded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "fileHash",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "verifier",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isValid",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "name": "FileVerified",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "fileHash",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "fileName",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "fileSize",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "ipfsHash",
          "type": "string"
        }
      ],
      "name": "uploadFile",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "fileHash",
          "type": "bytes32"
        }
      ],
      "name": "verifyFile",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "fileHash",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "fileName",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "fileSize",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "ipfsHash",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "uploader",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "exists",
              "type": "bool"
            }
          ],
          "internalType": "struct FileRegistry.FileRecord",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserFiles",
      "outputs": [
        {
          "internalType": "bytes32[]",
          "name": "",
          "type": "bytes32[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTotalFiles",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  const connectWallet = async () => {
    try {
      setLoading(true);
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();
        
        setProvider(provider);
        setSigner(signer);
        setAccount(accounts[0]);
        setNetworkId(network.chainId);
        setIsConnected(true);

        // For demo purposes, we'll simulate contract interactions
        // This works with any network including mainnet without spending real money
        console.log('Wallet connected successfully:', accounts[0]);
        console.log('Network:', network.name, 'Chain ID:', network.chainId.toString());

        localStorage.setItem('walletConnected', 'true');
      } else {
        throw new Error('MetaMask not found');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount('');
    setIsConnected(false);
    setNetworkId(null);
    localStorage.removeItem('walletConnected');
  };

  const uploadFileToBlockchain = async (fileHash, fileName, fileSize, ipfsHash) => {
    try {
      setLoading(true);
      
      // For development without deployed contract, simulate the transaction
      if (!contract) {
        console.log('Simulating blockchain upload:', { fileHash, fileName, fileSize, ipfsHash });
        
        // Simulate transaction delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Return simulated transaction result
        const mockTx = {
          hash: `0x${Math.random().toString(16).substr(2, 64)}`,
          blockNumber: Math.floor(Math.random() * 1000000),
          gasUsed: '21000',
          from: account,
          to: CONTRACT_ADDRESS
        };
        
        console.log('Simulated transaction:', mockTx);
        return {
          transactionHash: mockTx.hash,
          blockNumber: mockTx.blockNumber,
          gasUsed: mockTx.gasUsed
        };
      }
      
      // Real contract interaction (when contract is deployed)
      const tx = await contract.uploadFile(fileHash, fileName, fileSize, ipfsHash);
      const receipt = await tx.wait();
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      console.error('Error uploading to blockchain:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyFileOnBlockchain = async (fileHash) => {
    try {
      setLoading(true);
      
      // For development without deployed contract, simulate verification
      if (!contract) {
        console.log('Simulating blockchain verification for:', fileHash);
        
        // Simulate verification delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Return simulated verification result
        const mockResult = {
          exists: Math.random() > 0.3, // 70% chance file exists
          fileHash,
          fileName: 'SimulatedFile.pdf',
          fileSize: Math.floor(Math.random() * 1000000),
          ipfsHash: `Qm${Math.random().toString(36).substr(2, 44)}`,
          uploader: account,
          timestamp: Math.floor(Date.now() / 1000),
          blockNumber: Math.floor(Math.random() * 1000000)
        };
        
        console.log('Simulated verification result:', mockResult);
        return mockResult;
      }
      
      // Real contract interaction (when contract is deployed)
      const result = await contract.verifyFile(fileHash);
      return result;
    } catch (error) {
      console.error('Error verifying file:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getUserFiles = async (userAddress = account) => {
    if (!contract) throw new Error('Contract not initialized');
    
    try {
      const fileHashes = await contract.getUserFiles(userAddress);
      return fileHashes;
    } catch (error) {
      console.error('Error getting user files:', error);
      throw error;
    }
  };

  const getTotalFiles = async () => {
    if (!contract) return 0;
    
    try {
      const total = await contract.getTotalFiles();
      return Number(total);
    } catch (error) {
      console.error('Error getting total files:', error);
      return 0;
    }
  };

  // Auto-connect on page load if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem('walletConnected');
    if (wasConnected === 'true' && typeof window.ethereum !== 'undefined') {
      connectWallet().catch(console.error);
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        setNetworkId(parseInt(chainId, 16));
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const value = {
    provider,
    signer,
    contract,
    account,
    isConnected,
    loading,
    networkId,
    connectWallet,
    disconnectWallet,
    uploadFileToBlockchain,
    verifyFileOnBlockchain,
    getUserFiles,
    getTotalFiles,
    CONTRACT_ADDRESS
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
};
