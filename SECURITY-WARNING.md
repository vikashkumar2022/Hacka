# 🚨 SECURITY WARNING

## IMPORTANT: Before Pushing to GitHub

This repository contains sensitive files that should NOT be committed to a public repository. Please ensure the following files are in your `.gitignore`:

### ❌ NEVER COMMIT THESE FILES:

1. **Environment Variables**
   - `.env`
   - `.env.development`
   - `.env.production`
   - `*.env`

2. **Database Files**
   - `development.db`
   - `*.sqlite`
   - `instance/`

3. **Private Keys & Certificates**
   - `blockchain/.env`
   - `ssl/`
   - `*.pem`
   - `*.key`

4. **Sensitive Configuration**
   - Contract addresses (if on mainnet)
   - API keys
   - Private keys
   - Database credentials

### ✅ Safe to Commit:

- Source code files (`.js`, `.py`, `.sol`)
- Configuration templates (`.env.example`)
- Documentation (`.md`, `.tex`)
- Docker configuration
- Package files (`package.json`, `requirements.txt`)

### 🔧 What to Do:

1. Review `.gitignore` file
2. Remove any sensitive files from staging: `git reset HEAD <file>`
3. Use `.env.example` files for templates
4. Document configuration in README without actual values

### 📋 Quick Check Before Push:

```bash
# Check what files will be committed
git status

# Review staged files
git diff --cached

# Make sure no .env files are staged
git ls-files | grep -E '\.(env|key|pem)$'
```

If you see any sensitive files, run:
```bash
git reset HEAD <sensitive-file>
```

**Remember: Once committed to GitHub, files are permanently in history even if later removed!**
