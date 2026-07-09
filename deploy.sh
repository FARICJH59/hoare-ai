#!/usr/bin/env bash
# =============================================================================
# HOARE.ai — Production Deployment Script
#
# Performs:
#   1. Preflight checks (git, branch, vercel CLI, auth)
#   2. npm install → lint → test → build
#   3. git add / commit / push origin main
#   4. vercel --prod
#
# Stops immediately on any failure (-e).
# Never overwrites existing config without a backup.
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       HOARE.ai Production Deployment         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Preflight checks ───────────────────────────────────────────────────────

info "Running preflight checks..."

# 1a. Git is initialised
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  error "Not inside a Git repository. Please run: git init"
fi
success "Git repository detected"

# 1b. Current branch is main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  error "Current branch is '${BRANCH}'. Deployments must run from 'main'. Switch with: git checkout main"
fi
success "On branch: main"

# 1c. No uncommitted changes that would be missed (warn only)
if ! git diff --quiet || ! git diff --cached --quiet; then
  warn "Working tree has uncommitted changes — they will be committed by this script."
fi

# 1d. Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  error "Vercel CLI not found. Install with: npm install -g vercel"
fi
VERCEL_VERSION=$(vercel --version 2>/dev/null || echo "unknown")
success "Vercel CLI: ${VERCEL_VERSION}"

# 1e. User is authenticated with Vercel
if ! vercel whoami &> /dev/null; then
  error "Not authenticated with Vercel. Run: vercel login"
fi
VERCEL_USER=$(vercel whoami 2>/dev/null || echo "unknown")
success "Vercel user: ${VERCEL_USER}"

# 1f. Required environment variables
REQUIRED_VARS=(NEXTAUTH_SECRET OPENAI_API_KEY DATABASE_URL)
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR:-}" ]; then
    warn "Environment variable ${VAR} is not set. Build may fail."
  fi
done

# 1g. Backup existing vercel.json / .env.example if they exist
for FILE in vercel.json .env.example; do
  if [ -f "$FILE" ]; then
    BACKUP="${FILE}.bak.$(date +%Y%m%d%H%M%S)"
    cp "$FILE" "$BACKUP"
    info "Backed up ${FILE} → ${BACKUP}"
  fi
done

echo ""
info "All preflight checks passed."
echo ""

# ── 2. Install dependencies ───────────────────────────────────────────────────

info "Installing root dependencies..."
npm install
success "Root dependencies installed"

info "Installing hoare.ai runtime dependencies..."
(cd hoare.ai && npm install)
success "Runtime dependencies installed"

# ── 3. Lint ───────────────────────────────────────────────────────────────────

info "Running ESLint..."
npm run lint
success "Lint passed"

# ── 4. Tests ──────────────────────────────────────────────────────────────────

info "Running runtime tests..."
npm test
success "All tests passed"

# ── 5. Build ──────────────────────────────────────────────────────────────────

info "Building Next.js application..."
npm run build
success "Build succeeded"

# ── 6. Git commit & push ──────────────────────────────────────────────────────

info "Staging all changes..."
git add .

# Only commit if there is something to commit
if git diff --cached --quiet; then
  info "Nothing new to commit — working tree is clean."
else
  info "Committing..."
  git commit -m "HOARE.ai Production Build — $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  success "Committed"
fi

info "Pushing to origin/main..."
git push origin main
success "Pushed to origin/main"

# ── 7. Deploy to Vercel ───────────────────────────────────────────────────────

echo ""
info "Deploying to Vercel (production)..."
vercel --prod
SUCCESS=$?

echo ""
if [ $SUCCESS -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✅  HOARE.ai deployed to production!       ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
else
  error "Vercel deployment failed. Check logs above."
fi
