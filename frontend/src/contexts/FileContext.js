import React, { createContext, useContext, useState, useEffect } from 'react';

const FileContext = createContext();

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
};

export const FileProvider = ({ children }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load files from localStorage on mount
  useEffect(() => {
    const savedFiles = localStorage.getItem('uploadedFiles');
    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles);
        setUploadedFiles(parsedFiles);
      } catch (error) {
        console.error('Error parsing saved files:', error);
        localStorage.removeItem('uploadedFiles');
      }
    }
  }, []);

  // Save files to localStorage whenever uploadedFiles changes
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    }
  }, [uploadedFiles]);

  const addFile = (file) => {
    setUploadedFiles(prev => [...prev, file]);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const updateFile = (fileId, updates) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, ...updates } : file
      )
    );
  };

  const clearFiles = () => {
    setUploadedFiles([]);
    localStorage.removeItem('uploadedFiles');
  };

  const getFileById = (fileId) => {
    return uploadedFiles.find(file => file.id === fileId);
  };

  const value = {
    uploadedFiles,
    loading,
    setLoading,
    addFile,
    removeFile,
    updateFile,
    clearFiles,
    getFileById
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
};

export default FileContext;
