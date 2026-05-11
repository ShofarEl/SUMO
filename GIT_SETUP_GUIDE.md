# Git Setup Guide for Georgetown Traffic AI

This guide will help you set up Git and push your project to a remote repository (GitHub, GitLab, etc.).

## Prerequisites

- Git installed on your system
- A GitHub/GitLab/Bitbucket account
- SSH keys configured (recommended) or HTTPS credentials

## Step 1: Initialize Git Repository

```bash
# Navigate to your project root
cd georgetown-traffic-ai

# Initialize git repository
git init

# Check git status
git status
```

## Step 2: Configure Git (First Time Only)

```bash
# Set your name and email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

## Step 3: Review .gitignore

The `.gitignore` file has been created to exclude:
- Environment files (`.env`)
- Dependencies (`node_modules/`, `__pycache__/`)
- Build outputs (`dist/`, `build/`)
- Logs and temporary files
- ML models and large data files
- IDE-specific files

**Important**: Make sure your `.env` files are NOT committed!

## Step 4: Stage and Commit Files

```bash
# Add all files to staging
git add .

# Check what will be committed
git status

# Create your first commit
git commit -m "Initial commit: Georgetown Traffic AI Management System"
```

## Step 5: Create Remote Repository

### Option A: GitHub

1. Go to https://github.com/new
2. Create a new repository named `georgetown-traffic-ai`
3. **Do NOT** initialize with README, .gitignore, or license (we already have these)
4. Copy the repository URL

### Option B: GitLab

1. Go to https://gitlab.com/projects/new
2. Create a new project named `georgetown-traffic-ai`
3. Choose "Create blank project"
4. Copy the repository URL

### Option C: Bitbucket

1. Go to https://bitbucket.org/repo/create
2. Create a new repository named `georgetown-traffic-ai`
3. Copy the repository URL

## Step 6: Connect to Remote Repository

### Using HTTPS (Easier, requires password)

```bash
# Add remote repository
git remote add origin https://github.com/yourusername/georgetown-traffic-ai.git

# Verify remote
git remote -v
```

### Using SSH (Recommended, no password needed)

```bash
# Add remote repository
git remote add origin git@github.com:yourusername/georgetown-traffic-ai.git

# Verify remote
git remote -v
```

## Step 7: Push to Remote Repository

```bash
# Push to main branch
git push -u origin main

# If your default branch is 'master', use:
# git push -u origin master
```

If you get an error about branch names, rename your branch:

```bash
# Rename branch to main
git branch -M main

# Push again
git push -u origin main
```

## Step 8: Verify Upload

1. Go to your repository URL in a browser
2. Verify all files are uploaded
3. Check that `.env` files are NOT visible (they should be ignored)

## Common Git Commands

### Daily Workflow

```bash
# Check status
git status

# Add specific files
git add filename.js

# Add all changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to remote
git push

# Pull latest changes
git pull
```

### Branching

```bash
# Create new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main

# List branches
git branch

# Delete branch
git branch -d feature/old-feature

# Push branch to remote
git push -u origin feature/new-feature
```

### Viewing History

```bash
# View commit history
git log

# View compact history
git log --oneline

# View changes
git diff
```

## Best Practices

### 1. Commit Messages

Use clear, descriptive commit messages:

```bash
# Good
git commit -m "Add LSTM traffic prediction model"
git commit -m "Fix: Resolve authentication bug in login page"
git commit -m "Update: Improve simulation performance by 30%"

# Bad
git commit -m "fix"
git commit -m "updates"
git commit -m "asdf"
```

### 2. Commit Frequency

- Commit often with logical changes
- Don't commit broken code to main branch
- Use feature branches for new features

### 3. Branch Strategy

```
main (or master)     - Production-ready code
├── develop          - Integration branch
├── feature/login    - New features
├── bugfix/auth      - Bug fixes
└── hotfix/security  - Urgent fixes
```

### 4. Before Committing

```bash
# Always check what you're committing
git status
git diff

# Make sure tests pass
npm test  # or pytest

# Verify .env files are not staged
git status | grep .env
```

## Protecting Sensitive Data

### If you accidentally committed .env files:

```bash
# Remove from git but keep locally
git rm --cached backend/.env
git rm --cached frontend/.env
git rm --cached python-ai/.env

# Commit the removal
git commit -m "Remove .env files from git"

# Push changes
git push
```

### If .env files are already pushed to remote:

1. **Change all secrets immediately** (API keys, passwords, JWT secrets)
2. Remove from git history (advanced):

```bash
# Use git filter-branch or BFG Repo-Cleaner
# This rewrites history - use with caution!
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: This rewrites history)
git push origin --force --all
```

## Collaborating with Others

### Cloning the Repository

```bash
# Clone repository
git clone https://github.com/yourusername/georgetown-traffic-ai.git
cd georgetown-traffic-ai

# Install dependencies
npm install  # in frontend and backend
pip install -r requirements.txt  # in python-ai

# Copy environment files
cp .env.example .env
# ... repeat for all services
```

### Pull Requests

1. Create a feature branch
2. Make your changes
3. Push branch to remote
4. Create Pull Request on GitHub/GitLab
5. Request review
6. Merge after approval

## Troubleshooting

### Problem: "Permission denied (publickey)"

**Solution**: Set up SSH keys

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key and add to GitHub/GitLab
cat ~/.ssh/id_ed25519.pub
```

### Problem: "Repository not found"

**Solution**: Check remote URL

```bash
# View current remote
git remote -v

# Update remote URL
git remote set-url origin https://github.com/yourusername/georgetown-traffic-ai.git
```

### Problem: "Merge conflicts"

**Solution**: Resolve conflicts manually

```bash
# Pull latest changes
git pull

# Open conflicted files and resolve
# Look for <<<<<<< HEAD markers

# After resolving
git add .
git commit -m "Resolve merge conflicts"
git push
```

### Problem: Large files rejected

**Solution**: Use Git LFS for large files

```bash
# Install Git LFS
git lfs install

# Track large files
git lfs track "*.h5"
git lfs track "*.pkl"

# Add .gitattributes
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

## GitHub-Specific Features

### Enable GitHub Actions (CI/CD)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          cd backend && npm test
          cd ../python-ai && pytest
```

### Add Repository Badges

Add to README.md:

```markdown
[![Build Status](https://github.com/yourusername/georgetown-traffic-ai/workflows/CI/badge.svg)](https://github.com/yourusername/georgetown-traffic-ai/actions)
```

### Enable GitHub Pages (for documentation)

1. Go to Settings → Pages
2. Select source branch (usually `main` or `gh-pages`)
3. Choose folder (`/docs` or `/root`)

## Next Steps

1. ✅ Initialize Git repository
2. ✅ Create `.gitignore`
3. ✅ Make initial commit
4. ✅ Create remote repository
5. ✅ Push to remote
6. 📝 Add collaborators (if team project)
7. 📝 Set up branch protection rules
8. 📝 Configure CI/CD (optional)
9. 📝 Add project documentation
10. 📝 Create releases/tags for versions

## Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [GitLab Documentation](https://docs.gitlab.com/)
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials)

---

**Need Help?** Open an issue or contact the project maintainer.
