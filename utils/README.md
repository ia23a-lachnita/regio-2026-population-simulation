# Competition Utilities - Intelligent PDF Visual Extraction

**Pure Python** utilities for processing competition input files with **advanced image filtering**.

## Overview

This system intelligently extracts **only meaningful visual content** from PDFs:
- ✅ Wireframes, diagrams, architecture graphs
- ❌ Logos, headers, footers, decorative elements
- ❌ Whole page renders

**Result:** high-signal visual extraction with machine-readable reliability evidence.

**Technology:** Pure Python (no Node.js dependencies)

## Installation

### Python Dependencies (Required)
```bash
pip install PyMuPDF Pillow
# or
cd utils
pip install -r requirements.txt
```

**Required packages:**
- `PyMuPDF` (fitz) - PDF processing and image extraction
- `Pillow` (PIL) - Image content analysis

## Main Scripts

### 1. prepare-input.py (Main Orchestrator)

**Purpose:** Main entry point for preparing all competition files

**Usage:**
```bash
cd utils
python prepare-input.py [input-dir] [output-dir]

# Defaults:
# input-dir: ../input
# output-dir: ../workspace/.context/source-docs
```

**What it does:**
1. Searches for ZIP files in input directory
2. Extracts all ZIP archives using Python's zipfile module
3. Finds all PDF files (including in extracted ZIPs)
4. Converts PDFs to Markdown + extracts meaningful images
5. Copies JSON data files
6. Creates INDEX.md overview
7. Writes `INPUT_PREP_SUMMARY.json` for workflow gates

**Example:**
```bash
cd utils
python prepare-input.py
# Processes ../input and outputs to ../workspace/.context/source-docs
```

**Output:**
```
workspace/.context/source-docs/
├── INDEX.md                          # Overview with image counts
├── competition_skill9_2025.md        # Main requirements (text-only)
├── application_structure.md          # Architecture (1 diagram)
├── application_structure_images/     # → image_1.png
├── wireframes.md                     # UI mockups (7 wireframes)
├── wireframes_images/                # → image_1.png ... image_7.png
├── Skill09_general-description.md    # General info (text-only)
└── exercises.json                    # Data to import

workspace/.context/
└── INPUT_PREP_SUMMARY.json           # Preparation gate evidence
```

---

### 2. extract-pdf-images.py (Advanced Visual Extractor)

**Purpose:** Intelligently extracts only meaningful visual content from PDFs

**Usage:**
```bash
python extract-pdf-images.py <pdf-file> <output-dir>
```

**Example:**
```bash
python extract-pdf-images.py ../input/requirements.pdf ../workspace/.context/source-docs
```

**How it works:**

**Pass 1: Scan and Map**
- Opens PDF and analyzes all pages
- Uses `get_image_info()` to get position and size
- Tracks which images appear on which pages
- Maps positions (header/footer detection)

**Pass 2: Multi-Stage Filtering**

1. **Repetition Filter**: Images on >3 pages → likely logo/header → filtered
2. **Position Filter**: Always in top/bottom 15% → header/footer → filtered
3. **Content Analysis**:
   - >95% white pixels → blank/margin → filtered
   - <50 unique colors → logo/icon → filtered
   - <150px size → decorative → filtered
   - <5KB file size → decorative → filtered
4. **Display Size**: Average display <100px → filtered

**Output:**
- `<filename>.md` - Markdown with text + image references
- `<filename>_images/` - Extracted images (numbered sequentially)
- Console: Detailed filtering report
- JSON: Structured results for scripting

**Example output:**
```
=== PDF Visual Content Extraction ===

  Analyzing: wireframes.pdf
  Pass 1: Scanning all images...
  Found 8 unique images in PDF
  Pass 2: Filtering meaningful content...
    Filtered: appears on 5 pages (likely logo/header)
    KEEP: Page 2, valid (2320x1320, 346 colors)
    KEEP: Page 2, valid (1471x837, 337 colors)
    [... 5 more ...]
  Result: 7 meaningful images (filtered 1)

=== Summary ===
  PDF: wireframes.pdf
  Pages: 5
  Meaningful images extracted: 7
```

---

## Configuration

### Adjusting Image Filters

Edit `extract-pdf-images.py` to adjust filtering thresholds:

**Repetition threshold** (line 175):
```python
if page_count > 3:  # Images on >3 pages = logo
```

**Position threshold** (line 180):
```python
if p['relative_y'] < 0.15 or p['relative_y'] > 0.85:  # Top/bottom 15%
```

**White space threshold** (line 72):
```python
if white_percentage > 95:  # 95% white = blank
```

**Color diversity threshold** (line 76):
```python
if unique_colors < 50:  # <50 colors = logo/icon
```

**Size threshold** (line 80):
```python
if width < 150 or height < 150:  # Minimum 150px
```

**File size threshold** (line 85):
```python
if file_size_kb < 5:  # Minimum 5KB
```

**Display size threshold** (line 195):
```python
if avg_display_width < 100 or avg_display_height < 100:  # Minimum 100px displayed
```

---

## Example Results

**Input:** `project_files_skill_9_2025.zip` (4 PDFs)

**Output:**

| PDF | Pages | Images Found | Filtered | Extracted | Reason |
|-----|-------|-------------|----------|-----------|---------|
| wireframes.pdf | 5 | 8 | 1 | **7** | 1 logo on 5 pages filtered |
| application_structure.pdf | 2 | - | - | **1** | Architecture diagram kept |
| competition_skill9_2025.pdf | 8 | 1 | 1 | **0** | Logo on 8 pages filtered |
| Skill09_general-description.pdf | 3 | - | - | **0** | Text-only |
| **TOTAL** | **18** | - | - | **8** | **100% relevant content** |

---

## Workflow Integration

### For AI Agents (Phase 0)

The AI agent runs `prepare-input.py` as **Phase 0**:

```markdown
## Phase 0: Prepare Input Files

1. Run preparation script:
   cd utils && python prepare-input.py

2. Verify output:
   ls workspace/.context/source-docs/
   cat workspace/.context/source-docs/INDEX.md
   cat workspace/.context/INPUT_PREP_SUMMARY.json

3. Check extracted images:
   find workspace/.context/source-docs -name "*.png"

Expected: 8 meaningful images (wireframes + diagrams)
```

For workflow maintenance, lifecycle-level benchmark tooling lives outside this workflow repository copy.

### For Manual Use

```bash
# Full automatic preparation
cd utils
python prepare-input.py

# Or individual PDF conversion:
python extract-pdf-images.py ../input/requirements.pdf ../workspace/.context/source-docs
```

---

## Troubleshooting

### Problem: Python packages not found

**Solution:**
```bash
pip install PyMuPDF Pillow
# or
cd utils && pip install -r requirements.txt
```

**Verify installation:**
```bash
python -c "import fitz; import PIL; print('✓ Ready')"
```

### Problem: Too many images extracted

**Cause:** Thresholds too permissive

**Solution:** Edit `extract-pdf-images.py`:
- Increase color threshold (line 76): `if unique_colors < 100:`
- Increase size threshold (line 80): `if width < 200 or height < 200:`
- Decrease repetition threshold (line 175): `if page_count > 2:`

### Problem: Missing important images

**Cause:** Thresholds too strict

**Solution:** Edit `extract-pdf-images.py`:
- Decrease color threshold: `if unique_colors < 30:`
- Decrease size threshold: `if width < 100 or height < 100:`
- Check console output to see why image was filtered

### Problem: "unzip: command not found"

**Solution:**
- Windows: Use Git Bash (comes with unzip)
- Mac: `brew install unzip` (usually pre-installed)
- Linux: `sudo apt-get install unzip`

### Problem: Unicode errors on Windows

**Cause:** Python console encoding issues

**Effect:** Should not happen - script uses ASCII-safe output

**Workaround:** If you still see errors, run in Git Bash instead of CMD

---

## Performance

**Typical processing time:**
- Small PDF (5 pages): ~2-3 seconds
- Medium PDF (20 pages): ~5-8 seconds
- Large PDF (100 pages): ~20-30 seconds

**Optimizations:**
- Images resized to max 400px for analysis
- Color counting limited to 10,000 colors
- Multi-pass approach prevents redundant extraction

---

## Technical Details

### Image Analysis Pipeline

1. **Position Analysis**: Uses PyMuPDF's `get_image_info(xrefs=True)` to get bounding boxes
2. **Repetition Detection**: MD5 hash tracking across all pages
3. **Content Analysis**: Pillow (PIL) for color diversity and white space detection
4. **Size Analysis**: Both raw image size and display size on page
5. **Sequential Naming**: Meaningful images numbered sequentially (image_1.png, image_2.png, ...)

### Why Multi-Pass?

**Single-pass problems:**
- Can't detect logos (need to see all pages first)
- Can't compare relative sizes
- Can't identify patterns

**Multi-pass benefits:**
- First pass builds complete image map
- Second pass applies filters with full context
- More accurate filtering

### Pure Python Approach

**Benefits:**
- ✅ No Node.js dependencies (simpler setup)
- ✅ Built-in ZIP extraction (Python zipfile module)
- ✅ PyMuPDF for PDF processing
- ✅ Pillow for image analysis
- ✅ Single language (Python only)
- ✅ Easier to maintain and debug

---

## File Structure

```
utils/
├── README.md                  # This file
├── requirements.txt           # Python dependencies
├── prepare-input.py           # Main orchestrator (pure Python)
└── extract-pdf-images.py      # Advanced visual extractor
```

---

## References

Based on best practices from:
- [PyMuPDF Documentation - Images](https://pymupdf.readthedocs.io/en/latest/recipes-images.html)
- [pymupdf4llm - Image Processing](https://deepwiki.com/pymupdf/pymupdf4llm/4.4-image-and-graphics-processing)
- [PDF Image Extraction with Python](https://serjhenrique.com/how-to-extract-images-and-drawings-from-pdf-with-python/)
- [Extract Images from PDF Guide](https://sandeep031.medium.com/extract-images-from-pdf-using-python-step-by-step-guide-with-code-77b72931b2f0)

---

## Credits

Built for AI-driven programming competitions. Enables autonomous extraction of **only meaningful visual content** from competition materials.

**Innovation:** Multi-pass intelligent filtering eliminates logos, headers, footers, and decorative elements automatically.
