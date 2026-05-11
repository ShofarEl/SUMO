# Git Troubleshooting Guide

## Issue: "error: nul: failed to insert into database"

### Problem
Windows has reserved filenames that cannot be used in Git, including `nul`, `con`, `prn`, `aux`, etc.

### Solution

#### Option 1: Use the Safe Init Script (Recommended)
```bash
git-init-safe.bat
```

This script:
- Configures Git for Windows line endings
- Adds files in stages to avoid problematic files
- Excludes Windows reserved names

#### Option 2: Manual Fix

1. **Configure Git for Windows**
```bash
git config core.autocrlf true
git config core.safecrlf false
```

2. **Add .gitattributes file** (already created)
This file tells Git how to handle line endings for different file types.

3. **Update .gitignore** (already updated)
Added Windows reserved names to .gitignore.

4. **Add files selectively**
```bash
# Add configuration files first
git add .gitattributes .gitignore

# Add files by directory
git add frontend/src/
git add backend/src/
git add python-ai/app/

# Commit
git commit -m "Initial commit"
```

## Issue: "LF will be replaced by CRLF"

### Problem
Git is warning about line ending conversions between Unix (LF) and Windows (CRLF).

### Solution
This is just a warning and is expected on Windows. The `.gitattributes` file handles this automatically.

To suppress warnings:
```bash
git config core.autocrlf true
git config core.safecrlf false
```

## Issue: "fatal: adding files failed"

### Possible Causes
1. File with reserved Windows name (nul, con, prn, etc.)
2. File path too long (>260 characters on Windows)
3. Permission issues
4. Corrupted Git index

### Solutions

#### 1. Find and exclude problematic files
```bash
# Check git status
git status

# Add files one directory at a time
git add frontend/
git add backend/
git add python-ai/
```

#### 2. Enable long paths (Windows)
```bash
git config --system core.longpaths true
```

#### 3. Reset Git index
```bash
# Remove all from staging
git reset

# Clean Git cache
git rm -r --cached .

# Re-add files
git add .
```

## Issue: "Permission denied"

### Solution
Run Command Prompt or PowerShell as Administrator:
1. Right-click on Command Prompt
2. Select "Run as administrator"
3. Navigate to your project
4. Run git commands

## Issue: Files not being ignored

### Problem
Files listed in .gitignore are still being tracked.

### Solution
```bash
# Remove from Git but keep locally
git rm -r --cached .

# Re-add files (will now respect .gitignore)
git add .

# Commit
git commit -m "Apply .gitignore rules"
```

## Issue: "Repository not found" when pushing

### Solution
1. **Check remote URL**
```bash
git remote -v
```

2. **Update remote URL**
```bash
git remote set-url origin https://github.com/yourusername/georgetown-traffic-ai.git
```

3. **Verify repository exists**
- Go to GitHub/GitLab
- Make sure repository is created
- Check repository name matches

## Issue: "Failed to push some refs"

### Solution
```bash
# Pull latest changes first
git pull origin main --rebase

# Or if that fails, force pull
git pull origin main --allow-unrelated-histories

# Then push
git push origin main
```

## Issue: Accidentally committed .env files

### Immediate Action
1. **Remove from Git**
```bash
git rm --cached backend/.env
git rm --cached frontend/.env
git rm --cached python-ai/.env
git commit -m "Remove .env files"
git push
```

2. **Change ALL secrets immediately**
- JWT_SECRET
- Database passwords
- API keys
- Any other credentials

3. **Verify .gitignore**
```bash
# Check if .env is in .gitignore
type .gitignore | findstr .env
```

## Issue: Large files causing push to fail

### Solution

#### Option 1: Remove large files
```bash
# Find large files
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | findstr blob | sort /R

# Remove from history
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch path/to/large/file" --prune-empty --tag-name-filter cat -- --all
```

#### Option 2: Use Git LFS
```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.h5"
git lfs track "*.pkl"
git lfs track "*.pth"

# Add .gitattributes
git add .gitattributes

# Commit and push
git commit -m "Add Git LFS"
git push
```

## Issue: Merge conflicts

### Solution
```bash
# 1. Pull latest changes
git pull origin main

# 2. Open conflicted files
# Look for markers:
# <<<<<<< HEAD
# Your changes
# =======
# Their changes
# >>>>>>> branch-name

# 3. Resolve conflicts manually

# 4. Mark as resolved
git add .

# 5. Complete merge
git commit -m "Resolve merge conflicts"

# 6. Push
git push
```

## Issue: Want to undo last commit

### Solution

#### Keep changes (undo commit only)
```bash
git reset --soft HEAD~1
```

#### Discard changes (undo commit and changes)
```bash
git reset --hard HEAD~1
```

#### Undo push (dangerous!)
```bash
# Only if you haven't shared the commit
git push --force origin main
```

## Issue: Git is slow on Windows

### Solutions

1. **Disable Windows Defender scanning**
Add Git directory to exclusions

2. **Enable Git file system cache**
```bash
git config core.fscache true
git config core.preloadindex true
```

3. **Use sparse checkout for large repos**
```bash
git config core.sparseCheckout true
```

## Recommended Git Configuration for Windows

```bash
# Line endings
git config --global core.autocrlf true
git config --global core.safecrlf false

# Performance
git config --global core.fscache true
git config --global core.preloadindex true

# Long paths
git config --global core.longpaths true

# Default branch name
git config --global init.defaultBranch main

# User info
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Editor (optional)
git config --global core.editor "code --wait"  # VS Code
```

## Quick Fixes Checklist

When Git commands fail, try these in order:

1. ✅ Check git status: `git status`
2. ✅ Configure line endings: `git config core.autocrlf true`
3. ✅ Check .gitignore: `type .gitignore`
4. ✅ Reset staging: `git reset`
5. ✅ Clean cache: `git rm -r --cached .`
6. ✅ Add files selectively: `git add frontend/ backend/ python-ai/`
7. ✅ Check for reserved names: Look for files named nul, con, prn, etc.
8. ✅ Run as administrator
9. ✅ Use safe init script: `git-init-safe.bat`

## Getting Help

1. **Check Git status**
```bash
git status
```

2. **View Git log**
```bash
git log --oneline
```

3. **Check Git configuration**
```bash
git config --list
```

4. **Get help for a command**
```bash
git help <command>
# Example: git help commit
```

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Help](https://help.github.com/)
- [Stack Overflow - Git](https://stackoverflow.com/questions/tagged/git)
- [Git for Windows](https://gitforwindows.org/)

---

**Still having issues?** 
1. Check the error message carefully
2. Search for the error on Stack Overflow
3. Try the safe init script: `git-init-safe.bat`
