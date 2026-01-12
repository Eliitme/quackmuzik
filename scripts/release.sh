#!/bin/bash

# Release script for QuackMuzik
# Usage: ./scripts/release.sh [patch|minor|major] [branch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check if version type is provided
VERSION_TYPE=${1:-patch}
BRANCH=${2:-production}

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  print_error "Invalid version type: $VERSION_TYPE"
  echo "Usage: $0 [patch|minor|major] [branch]"
  echo "  patch: 1.0.14 -> 1.0.15 (bug fixes)"
  echo "  minor: 1.0.14 -> 1.1.0 (new features)"
  echo "  major: 1.0.14 -> 2.0.0 (breaking changes)"
  exit 1
fi

print_info "Starting release process..."
print_info "Version type: $VERSION_TYPE"
print_info "Target branch: $BRANCH"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  print_error "Not in a git repository"
  exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
  print_warning "You have uncommitted changes"
  read -p "Do you want to continue? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Release cancelled"
    exit 0
  fi
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
print_info "Current branch: $CURRENT_BRANCH"

# Checkout target branch if different
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  print_info "Switching to branch: $BRANCH"
  git checkout "$BRANCH" || {
    print_error "Failed to checkout branch: $BRANCH"
    exit 1
  }
fi

# Pull latest changes
print_info "Pulling latest changes from $BRANCH..."
git pull origin "$BRANCH" || {
  print_error "Failed to pull from $BRANCH"
  exit 1
}

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Bump version using npm version
print_info "Bumping $VERSION_TYPE version..."
npm version "$VERSION_TYPE" --no-git-tag-version || {
  print_error "Failed to bump version"
  exit 1
}

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
print_success "Version bumped: $CURRENT_VERSION -> $NEW_VERSION"

# Build project to ensure it compiles
print_info "Building project..."
npm run build || {
  print_error "Build failed. Please fix errors before releasing."
  # Revert version change
  git checkout package.json package-lock.json
  exit 1
}
print_success "Build successful"

# Commit version change
print_info "Committing version change..."
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION" || {
  print_error "Failed to commit"
  exit 1
}
print_success "Version change committed"

# Create tag
TAG="v$NEW_VERSION"
print_info "Creating tag: $TAG"
git tag -a "$TAG" -m "Release $TAG" || {
  print_error "Failed to create tag"
  exit 1
}
print_success "Tag created: $TAG"

# Ask for confirmation before pushing
echo
print_warning "Ready to push to remote:"
echo "  Branch: $BRANCH"
echo "  Tag: $TAG"
read -p "Push to remote? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  print_warning "Release prepared but not pushed:"
  echo "  To push later:"
  echo "    git push origin $BRANCH"
  echo "    git push origin $TAG"
  exit 0
fi

# Push branch
print_info "Pushing branch $BRANCH..."
git push origin "$BRANCH" || {
  print_error "Failed to push branch"
  exit 1
}
print_success "Branch pushed"

# Push tag
print_info "Pushing tag $TAG..."
git push origin "$TAG" || {
  print_error "Failed to push tag"
  exit 1
}
print_success "Tag pushed"

# Summary
echo
print_success "Release completed successfully!"
echo
echo "Version: $CURRENT_VERSION -> $NEW_VERSION"
echo "Tag: $TAG"
echo "Branch: $BRANCH"
echo
print_info "GitHub Actions will automatically build and deploy when tag is pushed."
echo
print_info "To create a GitHub Release, visit:"
echo "  https://github.com/Eliitme/quackmuzik/releases/new?tag=$TAG"
