const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FileRegistry", function () {
  let FileRegistry;
  let fileRegistry;
  let owner;
  let user1;
  let user2;

  const sampleFileHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const sampleFileName = "test-document.pdf";
  const sampleFileSize = 1024;
  const sampleIpfsHash = "QmTzQ1JRkWErjk39mryYw2WVrgBMq1X1LQxERhHMT8rvSr";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    FileRegistry = await ethers.getContractFactory("FileRegistry");
    fileRegistry = await FileRegistry.deploy();
    await fileRegistry.waitForDeployment();
    
    // Set owner
    await fileRegistry.setOwner();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await fileRegistry.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero total files", async function () {
      expect(await fileRegistry.getTotalFiles()).to.equal(0);
    });

    it("Should return correct version", async function () {
      expect(await fileRegistry.getVersion()).to.equal("1.0.0");
    });

    it("Should not be paused initially", async function () {
      expect(await fileRegistry.paused()).to.equal(false);
    });
  });

  describe("File Upload", function () {
    it("Should upload a file successfully", async function () {
      await expect(
        fileRegistry.connect(user1).uploadFile(
          sampleFileHash,
          sampleFileName,
          sampleFileSize,
          sampleIpfsHash
        )
      )
        .to.emit(fileRegistry, "FileUploaded")
        .withArgs(sampleFileHash, user1.address, sampleFileName, await time.latest());

      expect(await fileRegistry.getTotalFiles()).to.equal(1);
    });

    it("Should reject upload with empty file name", async function () {
      await expect(
        fileRegistry.connect(user1).uploadFile(
          sampleFileHash,
          "",
          sampleFileSize,
          sampleIpfsHash
        )
      ).to.be.revertedWith("File name cannot be empty");
    });

    it("Should reject upload with zero file size", async function () {
      await expect(
        fileRegistry.connect(user1).uploadFile(
          sampleFileHash,
          sampleFileName,
          0,
          sampleIpfsHash
        )
      ).to.be.revertedWith("File size must be greater than 0");
    });

    it("Should reject upload with invalid file hash", async function () {
      await expect(
        fileRegistry.connect(user1).uploadFile(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          sampleFileName,
          sampleFileSize,
          sampleIpfsHash
        )
      ).to.be.revertedWith("Invalid file hash");
    });

    it("Should reject duplicate file upload", async function () {
      // Upload file first time
      await fileRegistry.connect(user1).uploadFile(
        sampleFileHash,
        sampleFileName,
        sampleFileSize,
        sampleIpfsHash
      );

      // Try to upload same file again
      await expect(
        fileRegistry.connect(user1).uploadFile(
          sampleFileHash,
          sampleFileName,
          sampleFileSize,
          sampleIpfsHash
        )
      ).to.be.revertedWith("File already exists");
    });
  });

  describe("File Verification", function () {
    beforeEach(async function () {
      // Upload a test file
      await fileRegistry.connect(user1).uploadFile(
        sampleFileHash,
        sampleFileName,
        sampleFileSize,
        sampleIpfsHash
      );
    });

    it("Should verify existing file", async function () {
      const fileRecord = await fileRegistry.verifyFile(sampleFileHash);
      
      expect(fileRecord.exists).to.equal(true);
      expect(fileRecord.fileName).to.equal(sampleFileName);
      expect(fileRecord.fileSize).to.equal(sampleFileSize);
      expect(fileRecord.ipfsHash).to.equal(sampleIpfsHash);
      expect(fileRecord.uploader).to.equal(user1.address);
    });

    it("Should return false for non-existent file", async function () {
      const nonExistentHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const fileRecord = await fileRegistry.verifyFile(nonExistentHash);
      
      expect(fileRecord.exists).to.equal(false);
    });

    it("Should log verification event", async function () {
      await expect(
        fileRegistry.connect(user2).logVerification(sampleFileHash)
      )
        .to.emit(fileRegistry, "FileVerified")
        .withArgs(sampleFileHash, user2.address, true, await time.latest());
    });
  });

  describe("User Files", function () {
    it("Should track user files correctly", async function () {
      const hash1 = "0x1111111111111111111111111111111111111111111111111111111111111111";
      const hash2 = "0x2222222222222222222222222222222222222222222222222222222222222222";
      
      // Upload two files from user1
      await fileRegistry.connect(user1).uploadFile(hash1, "file1.pdf", 1024, "ipfs1");
      await fileRegistry.connect(user1).uploadFile(hash2, "file2.pdf", 2048, "ipfs2");

      const userFiles = await fileRegistry.getUserFiles(user1.address);
      expect(userFiles.length).to.equal(2);
      expect(userFiles[0]).to.equal(hash1);
      expect(userFiles[1]).to.equal(hash2);
    });

    it("Should return empty array for user with no files", async function () {
      const userFiles = await fileRegistry.getUserFiles(user2.address);
      expect(userFiles.length).to.equal(0);
    });
  });

  describe("File Existence Check", function () {
    beforeEach(async function () {
      await fileRegistry.connect(user1).uploadFile(
        sampleFileHash,
        sampleFileName,
        sampleFileSize,
        sampleIpfsHash
      );
    });

    it("Should return true for existing file", async function () {
      expect(await fileRegistry.fileExist(sampleFileHash)).to.equal(true);
    });

    it("Should return false for non-existing file", async function () {
      const nonExistentHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      expect(await fileRegistry.fileExist(nonExistentHash)).to.equal(false);
    });
  });

  describe("Time Range Queries", function () {
    it("Should return files within time range", async function () {
      const hash1 = "0x1111111111111111111111111111111111111111111111111111111111111111";
      
      await fileRegistry.connect(user1).uploadFile(hash1, "file1.pdf", 1024, "ipfs1");
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = now - 3600; // 1 hour ago
      const endTime = now + 3600;   // 1 hour from now
      
      const filesInRange = await fileRegistry.getFilesByTimeRange(
        startTime,
        endTime,
        user1.address
      );
      
      expect(filesInRange.length).to.equal(1);
      expect(filesInRange[0]).to.equal(hash1);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause contract", async function () {
      await fileRegistry.connect(owner).pause();
      expect(await fileRegistry.paused()).to.equal(true);
    });

    it("Should allow owner to unpause contract", async function () {
      await fileRegistry.connect(owner).pause();
      await fileRegistry.connect(owner).unpause();
      expect(await fileRegistry.paused()).to.equal(false);
    });

    it("Should reject non-owner pause attempt", async function () {
      await expect(
        fileRegistry.connect(user1).pause()
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should reject setting owner twice", async function () {
      await expect(
        fileRegistry.connect(user1).setOwner()
      ).to.be.revertedWith("Owner already set");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum file size", async function () {
      const maxSize = ethers.MaxUint256;
      
      await expect(
        fileRegistry.connect(user1).uploadFile(
          sampleFileHash,
          sampleFileName,
          maxSize,
          sampleIpfsHash
        )
      ).to.not.be.reverted;
    });

    it("Should handle long file names", async function () {
      const longFileName = "a".repeat(1000) + ".pdf";
      
      await expect(
        fileRegistry.connect(user1).uploadFile(
          sampleFileHash,
          longFileName,
          sampleFileSize,
          sampleIpfsHash
        )
      ).to.not.be.reverted;
    });

    it("Should handle long IPFS hashes", async function () {
      const longIpfsHash = "Qm" + "a".repeat(100);
      
      await expect(
        fileRegistry.connect(user1).uploadFile(
          sampleFileHash,
          sampleFileName,
          sampleFileSize,
          longIpfsHash
        )
      ).to.not.be.reverted;
    });
  });
});
