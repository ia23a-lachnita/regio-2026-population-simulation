#!/bin/bash

echo "=== Workspace Reset Script ==="
echo ""
echo "This will COMPLETELY RESET the workspace to initial state."
echo "All work in workspace/ and delivery/ will be DELETED!"
echo ""
confirm=""
if [[ "${1:-}" == "--yes" || "${1:-}" == "-y" ]]; then
  confirm="y"
else
  read -p "Continue? (y/N): " -n 1 -r
  echo
  confirm="$REPLY"
fi
if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "Reset cancelled."
  exit 1
fi

echo ""
echo "[1/4] Cleaning workspace..."

# Remove workspace completely
if [ -d "workspace" ]; then
  echo "  Removing workspace directory..."
  rm -rf workspace
  echo "  ✓ Workspace removed"
else
  echo "  Workspace doesn't exist (nothing to remove)"
fi

# Remove delivery folder
if [ -d "delivery" ]; then
  echo "  Removing delivery directory..."
  rm -rf delivery
  echo "  ✓ Delivery removed"
fi

# Clean extracted input files (keep original ZIPs/PDFs)
if [ -d "input/extracted" ]; then
  echo "  Removing extracted input files..."
  rm -rf input/extracted
  echo "  ✓ Extracted files removed"
fi

echo ""
echo "[2/4] Creating fresh workspace from boilerplate..."

if [ ! -d "boilerplate" ]; then
  echo "  ⚠ ERROR: boilerplate directory not found!"
  echo "  Cannot create workspace without boilerplate"
  exit 1
fi

# Create workspace with boilerplate
echo "  Copying boilerplate to workspace..."
rsync -a \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='out' \
  --exclude='release' \
  --exclude='build' \
  --exclude='coverage' \
  --exclude='.turbo' \
  --exclude='.cache' \
  --exclude='.parcel-cache' \
  --exclude='.next' \
  --exclude='.nuxt' \
  --exclude='.svelte-kit' \
  --exclude='.vite' \
  --exclude='.vscode' \
  --exclude='*.tsbuildinfo' \
  boilerplate/ workspace/
echo "  ✓ Boilerplate copied"

# Create context directory structure
echo "  Creating .context directory..."
mkdir -p workspace/.context/source-docs
echo "  ✓ Context directory created"

echo ""
echo "[3/4] Creating PROGRESS.md..."

cat > workspace/.context/PROGRESS.md << 'EOF'
# Implementation Progress

Update this file after completing each phase!

## Phase 0: Prepare Input Files
- [ ] Run: cd utils && python prepare-input.py
- [ ] Verify: workspace/.context/source-docs/ created
- [ ] Check: Images extracted (wireframes, diagrams)
- Status: NOT STARTED

## Phase 1: Extract Requirements
- [ ] Read all converted markdown files
- [ ] Review wireframe images
- [ ] Create REQUIREMENTS.md
- Status: NOT STARTED

## Phase 2: Analyze Domain
- [ ] Read REQUIREMENTS.md
- [ ] Create DOMAIN_MODEL.md (entities, relationships)
- Status: NOT STARTED

## Phase 3: Generate Plan
- [ ] Create IMPLEMENTATION_PLAN.md (step-by-step tasks)
- Status: NOT STARTED

## Phase 4: Implement
- [ ] Update database schema
- [ ] Create TypeScript interfaces
- [ ] Build all pages and components
- [ ] Implement routing and features
- Status: NOT STARTED

## Phase 5: Validate
- [ ] Validate schema and routes
- [ ] Verify routes/pages/components exist
- [ ] Confirm core functionality implemented
- Status: NOT STARTED

## Phase 6: Package
- [ ] Run verification (pnpm run verify:win)
- [ ] Test packaged executable launch (workspace/release/win-unpacked/*.exe)
- [ ] Verify executable/installer names use real app name (no boilerplate/template placeholders)
- [ ] Run automated UI acceptance tests for analysis + criterion lifecycle
- [ ] Confirm DB file exists after launch
- [ ] Create delivery/ structure
- [ ] Generate documentation
- Evidence:
  - verify_command: 
  - verify_exit_code: 
  - exe_tested: 
  - artifact_naming_check: 
  - launch_timestamp: 
  - db_path: 
  - db_exists: 
  - ui_acceptance_command: 
  - ui_acceptance_exit_code: 
  - ui_acceptance_report: 
  - ui_acceptance_scenarios: 
  - error_summary: 
- Status: NOT STARTED
EOF

echo "  ✓ PROGRESS.md created"

echo ""
echo "[4/4] Checking input folder..."

if [ ! "$(ls -A input 2>/dev/null | grep -v extracted)" ]; then
  echo "  ⚠ WARNING: Input folder is empty!"
  echo "  Please add competition ZIP/PDF to input/ before starting"
else
  echo "  ✓ Input files found:"
  ls -1 input/*.{zip,pdf,txt,md,json} 2>/dev/null | while read file; do
    size=$(du -h "$file" 2>/dev/null | cut -f1)
    echo "    - $(basename "$file") ($size)"
  done
fi

echo ""
echo "========================================="
echo "WORKSPACE RESET COMPLETE"
echo "========================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Start your AI agent (Claude Code, Gemini CLI, etc.)"
echo ""
echo "2. Type: START"
echo ""
echo "The AI will read CLAUDE.md (or GEMINI.md) and autonomously"
echo "complete all 7 phases (Phase 0-6)."
echo ""
echo "Working directory: $(pwd)"
echo ""
