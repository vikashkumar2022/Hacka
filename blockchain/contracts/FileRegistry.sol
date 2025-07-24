// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FileRegistry
 * @dev Smart contract for registering and verifying file hashes on the blockchain
 * @author Blockchain File Security Team
 */
contract FileRegistry {
    struct FileRecord {
        bytes32 fileHash;
        string fileName;
        uint256 fileSize;
        string ipfsHash;
        address uploader;
        uint256 timestamp;
        bool exists;
    }
    
    // Mapping from file hash to file record
    mapping(bytes32 => FileRecord) private files;
    
    // Mapping from user address to their file hashes
    mapping(address => bytes32[]) private userFiles;
    
    // Total number of files registered
    uint256 public totalFiles;
    
    // Events
    event FileUploaded(
        bytes32 indexed fileHash,
        address indexed uploader,
        string fileName,
        uint256 timestamp
    );
    
    event FileVerified(
        bytes32 indexed fileHash,
        address indexed verifier,
        bool isValid,
        uint256 timestamp
    );
    
    // Modifiers
    modifier validFileHash(bytes32 _fileHash) {
        require(_fileHash != bytes32(0), "Invalid file hash");
        _;
    }
    
    modifier fileNotExists(bytes32 _fileHash) {
        require(!files[_fileHash].exists, "File already exists");
        _;
    }
    
    modifier fileExists(bytes32 _fileHash) {
        require(files[_fileHash].exists, "File does not exist");
        _;
    }
    
    /**
     * @dev Constructor
     */
    constructor() {
        totalFiles = 0;
    }
    
    /**
     * @dev Upload a file record to the blockchain
     * @param _fileHash SHA-256 hash of the file
     * @param _fileName Name of the file
     * @param _fileSize Size of the file in bytes
     * @param _ipfsHash IPFS hash where the file is stored
     */
    function uploadFile(
        bytes32 _fileHash,
        string memory _fileName,
        uint256 _fileSize,
        string memory _ipfsHash
    ) 
        external 
        validFileHash(_fileHash)
        fileNotExists(_fileHash)
    {
        require(bytes(_fileName).length > 0, "File name cannot be empty");
        require(_fileSize > 0, "File size must be greater than 0");
        
        // Create file record
        files[_fileHash] = FileRecord({
            fileHash: _fileHash,
            fileName: _fileName,
            fileSize: _fileSize,
            ipfsHash: _ipfsHash,
            uploader: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Add to user's file list
        userFiles[msg.sender].push(_fileHash);
        
        // Increment total files counter
        totalFiles++;
        
        // Emit event
        emit FileUploaded(_fileHash, msg.sender, _fileName, block.timestamp);
    }
    
    /**
     * @dev Verify a file by its hash
     * @param _fileHash SHA-256 hash of the file to verify
     * @return FileRecord containing file information
     */
    function verifyFile(bytes32 _fileHash) 
        external 
        view 
        validFileHash(_fileHash)
        returns (FileRecord memory) 
    {
        FileRecord memory fileRecord = files[_fileHash];
        
        // Emit verification event (note: this is a view function, so event won't be emitted)
        // The frontend should call a separate function to log verification
        
        return fileRecord;
    }
    
    /**
     * @dev Log file verification (separate function to emit event)
     * @param _fileHash SHA-256 hash of the file being verified
     */
    function logVerification(bytes32 _fileHash) 
        external 
        validFileHash(_fileHash)
    {
        bool isValid = files[_fileHash].exists;
        emit FileVerified(_fileHash, msg.sender, isValid, block.timestamp);
    }
    
    /**
     * @dev Get all file hashes uploaded by a specific user
     * @param _user Address of the user
     * @return Array of file hashes
     */
    function getUserFiles(address _user) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userFiles[_user];
    }
    
    /**
     * @dev Get total number of files registered
     * @return Total number of files
     */
    function getTotalFiles() external view returns (uint256) {
        return totalFiles;
    }
    
    /**
     * @dev Check if a file exists
     * @param _fileHash SHA-256 hash of the file
     * @return Boolean indicating if file exists
     */
    function fileExist(bytes32 _fileHash) 
        external 
        view 
        validFileHash(_fileHash)
        returns (bool) 
    {
        return files[_fileHash].exists;
    }
    
    /**
     * @dev Get file information without verification event
     * @param _fileHash SHA-256 hash of the file
     * @return FileRecord containing file information
     */
    function getFileInfo(bytes32 _fileHash) 
        external 
        view 
        validFileHash(_fileHash)
        returns (FileRecord memory) 
    {
        return files[_fileHash];
    }
    
    /**
     * @dev Get files uploaded in a specific time range
     * @param _startTime Start timestamp
     * @param _endTime End timestamp
     * @param _user User address (optional, use address(0) for all users)
     * @return Array of file hashes
     */
    function getFilesByTimeRange(
        uint256 _startTime,
        uint256 _endTime,
        address _user
    ) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        bytes32[] memory allUserFiles;
        
        if (_user == address(0)) {
            // This would require iterating through all users, which is expensive
            // For now, return empty array - implement off-chain indexing for this
            return new bytes32[](0);
        } else {
            allUserFiles = userFiles[_user];
        }
        
        // Count files in time range
        uint256 count = 0;
        for (uint256 i = 0; i < allUserFiles.length; i++) {
            FileRecord memory file = files[allUserFiles[i]];
            if (file.timestamp >= _startTime && file.timestamp <= _endTime) {
                count++;
            }
        }
        
        // Create result array
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allUserFiles.length; i++) {
            FileRecord memory file = files[allUserFiles[i]];
            if (file.timestamp >= _startTime && file.timestamp <= _endTime) {
                result[index] = allUserFiles[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Emergency function to pause contract (only owner)
     * Note: This is a simplified version. In production, you would implement
     * proper access control (OpenZeppelin's Ownable, for example)
     */
    address public owner;
    bool public paused = false;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    /**
     * @dev Set contract owner (called once during deployment)
     */
    function setOwner() external {
        require(owner == address(0), "Owner already set");
        owner = msg.sender;
    }
    
    /**
     * @dev Pause contract operations
     */
    function pause() external onlyOwner {
        paused = true;
    }
    
    /**
     * @dev Unpause contract operations
     */
    function unpause() external onlyOwner {
        paused = false;
    }
    
    /**
     * @dev Get contract version
     */
    function getVersion() external pure returns (string memory) {
        return "1.0.0";
    }
}
