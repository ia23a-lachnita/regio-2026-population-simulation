# AI-Driven Competition Workflow

Autonomous workflow scaffold for programming competitions with evidence-based completion gates.

## Quick Start

1. **Drop competition files** in `/input` folder (ZIP/PDF/TXT)
2. **Run reset:** `./reset-workspace.sh` (or `.bat` on Windows)
3. **Start AI agent** (Claude Code, Gemini, etc.)
4. **Type:** `START` or `S`
5. **Wait:** AI completes all phases (~60-120 min)
6. **Submit:** Upload `/delivery` folder

---

## For AI Agents

**Claude Code users:** Read `CLAUDE.md` or just type `START`
**Gemini CLI users:** Read `GEMINI.md` or just type `START`

Both files contain identical instructions for autonomous competition completion.

---

## How It Works

### Phase 0: Prepare Input (Automatic)
- Extracts ZIP files
- Converts PDFs to Markdown + images
- Filters duplicate images (logos)
- Creates organized workspace

### Phase 1-2: Requirements & Domain Analysis
- Extracts requirements from documents
- Creates domain model (entities, relationships)

### Phase 3: Implementation Planning
- Generates step-by-step implementation plan
- Identifies all files to create/modify

### Phase 4: Implementation
- Updates database schema
- Creates TypeScript interfaces
- Builds all pages and components
- Implements routing and features

### Phase 5: Validation
- Validates input preparation evidence
- Runs build/package checks
- Runs smoke checks and acceptance checks

### Phase 6: Packaging
- Builds executable
- Creates deliverables folder
- Generates documentation

**Typical AI time:** 60-120 minutes

---

## Technology Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Electron (desktop app)
- **Database:** SQLite (auto-created)
- **Build:** Vite + electron-builder
- **Package Manager:** pnpm

---

## File Structure

```
competition/
├── input/                    # Drop ZIP/PDF here
├── workspace/                # AI works here (auto-generated)
│   ├── .context/             # AI context files
│   │   ├── PROGRESS.md       # Phase tracking
│   │   ├── REQUIREMENTS.md   # Extracted requirements
│   │   ├── DOMAIN_MODEL.md   # Data model
│   │   ├── IMPLEMENTATION_PLAN.md
│   │   └── source-docs/      # Converted PDFs + images
│   └── [app code]            # src/, electron/, etc.
├── delivery/                 # Ready to submit (auto-generated)
│   ├── source/
│   ├── executable/
│   ├── schema.sql
│   └── README.md
├── boilerplate/              # Clean template (don't modify)
├── utils/                    # Python/Node.js tools
├── CLAUDE.md                 # AI instructions (Claude Code)
├── GEMINI.md                 # Same as CLAUDE.md
└── reset-workspace.sh/bat    # Reset script
```

---

## Requirements

- **Python 3.8+** (for PDF extraction and input preparation)
- **Python packages:** `pip install PyMuPDF Pillow`
- **pnpm** (for building Electron app): `npm install -g pnpm`
- **AI agent:** Claude Code, Gemini CLI, Cline, Aider, or similar

---

## Features

✅ **Fully autonomous** - AI completes all phases automatically
✅ **Resume capability** - Can continue if interrupted
✅ **Intelligent image extraction** - Only actual diagrams, filters logos
✅ **Domain-agnostic** - Works for any competition theme
✅ **Progress tracking** - PROGRESS.md shows current phase
✅ **Simple start** - Just type "START"
✅ **Input reliability benchmark** - Run corpus checks across historical ZIPs

---

## Example Usage

```bash
# Competition day workflow:

# 1. Drop requirements
cp ~/Downloads/competition_2025.zip input/

# 2. Reset workspace
./reset-workspace.sh

# 3. Start AI (Claude Code example)
# Type in terminal or IDE:
START

# AI automatically:
# ✓ Extracts ZIP and converts PDFs (Phase 0)
# ✓ Analyzes requirements (Phase 1)
# ✓ Creates domain model (Phase 2)
# ✓ Generates implementation plan (Phase 3)
# ✓ Builds complete application (Phase 4)
# ✓ Validates implementation (Phase 5)
# ✓ Runs verify gate + packages deliverables (Phase 6)

# 4. Submit
# Upload delivery/ folder

# Done! 🎉
```

---

## Troubleshooting

**AI can't extract PDF:**
```bash
# Install Python dependencies:
pip install PyMuPDF Pillow

# Or convert PDF manually:
python utils/extract-pdf-images.py input/requirements.pdf workspace/.context/source-docs
```

**Build fails:**
```bash
cd workspace
pnpm install
pnpm run db:clean
pnpm run db:reset
pnpm run verify:win
```

**verify:win fails:**
```bash
# Inspect preparation + smoke evidence
cat workspace/.context/INPUT_PREP_SUMMARY.json
cat workspace/.context/VERIFY_WIN.md
cat workspace/.context/FUNCTIONAL_ACCEPTANCE.md
cat workspace/.context/FUNCTIONAL_ACCEPTANCE_GATE.md
cat workspace/.context/COMPLETION_CONTRACT.md
```

**AI gets interrupted:**
```
# Just restart and type:
START

# AI reads PROGRESS.md and continues from last completed phase
```

**Want to start fresh:**
```bash
./reset-workspace.sh
# Then type START again
```

---

## Technical Details

See `CLAUDE.md` or `GEMINI.md` for complete AI workflow.

---

## Notes

- Completion quality is determined by gate evidence, not by summary language.
- `verify:win` includes data hygiene (`db:clean`, `db:reset`) and functional acceptance evidence gate checks.

---

## License

Open source - use for any competition or project.
