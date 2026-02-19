#!/usr/bin/env python3
"""
Competition Input Preparation Script
Extracts ZIP files, converts PDFs to Markdown with intelligent image extraction.
Pure Python - no Node.js dependencies.
"""

import sys
import shutil
import zipfile
from pathlib import Path
from typing import List, Dict
from cli_guards import normalize_path_arg, parse_prepare_args

# Import our PDF extractor
# Note: Python converts hyphens to underscores in imports
import importlib.util

# Load extract-pdf-images.py dynamically
spec = importlib.util.spec_from_file_location("extract_pdf_images", Path(__file__).parent / "extract-pdf-images.py")
extract_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extract_module)

analyze_and_extract_pdf = extract_module.analyze_and_extract_pdf
create_markdown = extract_module.create_markdown

VISUAL_EXPECTATION_KEYWORDS = [
    "wireframe",
    "mockup",
    "diagram",
    "figure",
    "screen",
    "ui",
    "layout",
]

def parse_cli_args(argv: List[str]):
    return parse_prepare_args(argv)

def find_files(directory: Path, extensions: List[str]) -> List[Path]:
    """
    Recursively find all files with specific extensions.
    """
    files = []
    for ext in extensions:
        files.extend(directory.rglob(f"*{ext}"))
    return sorted(files)

def extract_zip(zip_path: Path, target_dir: Path) -> bool:
    """
    Extract a ZIP file to target directory using Python's zipfile module.
    """
    try:
        target_dir.mkdir(parents=True, exist_ok=True)

        print(f"Extracting {zip_path.name} to {target_dir}...")

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(target_dir)

        print("OK Extraction complete")
        return True
    except Exception as e:
        print(f"ERROR Error extracting ZIP: {e}")
        return False

def check_python_packages():
    """
    Check if required Python packages are installed.
    """
    try:
        import fitz  # PyMuPDF
        import PIL  # Pillow
        return True
    except ImportError as e:
        print(f"\n⚠ Missing Python package: {e}")
        print("\nInstall required packages:")
        print("  pip install PyMuPDF Pillow")
        print("  or")
        print("  cd utils && pip install -r requirements.txt")
        return False

def convert_pdf_with_python(pdf_path: Path, output_dir: Path) -> Dict:
    """
    Convert PDF to Markdown using Python script.
    """
    try:
        # Extract images and text
        results = analyze_and_extract_pdf(pdf_path, output_dir)

        # Create markdown
        md_filename = pdf_path.stem + ".md"
        md_path = output_dir / md_filename
        create_markdown(results, md_path)

        return {
            'success': True,
            'markdown': str(md_path),
            'images': len(results['images']),
            'pages': results['pages']
        }
    except Exception as e:
        print(f"  ERROR Error converting {pdf_path.name}: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def create_index_md(output_dir: Path, pdf_results: List[Dict], json_files: List[Path], gate_result: Dict):
    """
    Create INDEX.md with overview of all documents.
    """
    index_path = output_dir / "INDEX.md"

    md = "# Competition Requirements - Index\n\n"
    md += "This folder contains all extracted and converted competition documents.\n\n"

    # PDF documents
    if pdf_results:
        md += "## Converted Documents (with Intelligent Image Extraction)\n\n"

        for result in pdf_results:
            if result['success']:
                pdf_name = Path(result['pdf']).stem
                images = result['images']
                pages = result['pages']

                md += f"- **{pdf_name}** ({pages} pages)\n"

                if images > 0:
                    md += f"  - **{images} image(s)** extracted (diagrams, wireframes, graphs)\n"
                    md += f"  - Markdown: `{pdf_name}.md`\n"
                    md += f"  - Images: `{pdf_name}_images/`\n"
                else:
                    md += f"  - Text-only document\n"
                    md += f"  - Markdown: `{pdf_name}.md`\n"

                md += "\n"

    # JSON files
    if json_files:
        md += "## JSON Data Files\n\n"
        for json_file in json_files:
            md += f"- `{json_file.name}` - Data to import into database\n"
        md += "\n"

    # Extraction info
    md += "## Extraction Method\n\n"
    md += "**Intelligent Image Detection:**\n"
    md += "- Only extracts **actual images** embedded in PDFs (not every page)\n"
    md += "- Filters logos, headers, footers automatically\n"
    md += "- Removes repetitive text patterns\n"
    md += "- Wireframes, graphs, and diagrams preserved\n\n"

    total_images = sum(r['images'] for r in pdf_results if r['success'])
    md += f"**Total images across all documents: {total_images}**\n\n"

    md += "## Quality Gates\n\n"
    md += f"- Visual expectation mode: `{gate_result['expect_mode']}`\n"
    md += f"- Visual gate mode: `{gate_result['gate_mode']}`\n"
    md += f"- Visual assets expected: `{gate_result['expected_visuals']}`\n"
    md += f"- Visual extraction status: **{gate_result['status']}**\n"
    if gate_result.get('message'):
        md += f"- Notes: {gate_result['message']}\n"
    md += "\n"

    # Next steps
    md += "## Next Steps for AI Agent\n\n"
    md += "1. **Read converted documents:**\n"
    md += "   - Each markdown file contains both text and embedded images\n\n"
    md += "2. **View wireframes and diagrams:**\n"
    md += "   - Images are embedded directly in markdown files\n\n"
    md += "3. **Extract requirements:**\n"
    md += "   - Analyze both text content and visual diagrams\n\n"
    md += "4. **Load data:**\n"
    md += "   - Import JSON files into database schema\n\n"
    md += "5. **Start implementation:**\n"
    md += "   - Use wireframes as UI reference\n\n"
    md += "---\n\n"
    md += "*Generated by prepare-input.py - Pure Python extraction*\n"

    index_path.write_text(md, encoding='utf-8')
    print(f"\nOK Created INDEX.md with document overview")

def infer_visual_expectation(expect_mode: str, pdf_files: List[Path], output_dir: Path) -> bool:
    """
    Determine if visual assets are expected for current inputs.
    """
    if expect_mode == 'always':
        return True
    if expect_mode == 'never':
        return False

    for pdf in pdf_files:
        name_lower = pdf.stem.lower()
        if any(keyword in name_lower for keyword in VISUAL_EXPECTATION_KEYWORDS):
            return True

    for md_file in output_dir.glob('*.md'):
        content = md_file.read_text(encoding='utf-8', errors='ignore').lower()
        if any(keyword in content for keyword in VISUAL_EXPECTATION_KEYWORDS):
            return True

    return False

def evaluate_visual_gate(
    expected_visuals: bool,
    total_images: int,
    gate_mode: str,
    expect_mode: str,
) -> Dict:
    """
    Evaluate image extraction quality gate outcome.
    """
    result = {
        'expect_mode': expect_mode,
        'gate_mode': gate_mode,
        'expected_visuals': expected_visuals,
        'status': 'PASS',
        'message': '',
    }

    if not expected_visuals or gate_mode == 'off':
        return result

    if total_images > 0:
        return result

    result['message'] = 'Expected visual assets were not extracted (0 images found).'
    if gate_mode == 'warn':
        result['status'] = 'WARN'
    elif gate_mode == 'fail':
        result['status'] = 'FAIL'
    return result

def main():
    """
    Main entry point for input preparation.
    """
    args = parse_cli_args(sys.argv[1:])

    # Configuration
    script_dir = Path(__file__).parent
    input_dir = script_dir.parent / "input"
    output_dir = script_dir.parent / "workspace" / ".context" / "source-docs"

    # Allow command-line overrides
    input_override = args.input_dir or args.input_dir_pos
    output_override = args.output_dir or args.output_dir_pos
    if input_override:
        input_dir = normalize_path_arg(input_override)
    if output_override:
        output_dir = normalize_path_arg(output_override)

    print("=== Competition Input Preparation (Pure Python) ===\n")

    # Check Python packages
    print("[Setup] Checking Python environment...")
    if not check_python_packages():
        sys.exit(1)
    print("  OK Python environment ready\n")

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Extract ZIP files
    print("[Step 1/4] Searching for ZIP files...")
    zip_files = find_files(input_dir, ['.zip'])

    if zip_files:
        print(f"  Found {len(zip_files)} ZIP file(s)\n")

        for zip_file in zip_files:
            # Extract to input/extracted/
            extract_dir = input_dir / "extracted"
            if extract_zip(zip_file, extract_dir):
                print()
    else:
        print("  No ZIP files found\n")

    # Step 2: Find all PDFs (including in extracted ZIPs)
    print("[Step 2/4] Searching for PDF files...")

    # Search both input and extracted directories
    search_dirs = [input_dir]
    if (input_dir / "extracted").exists():
        search_dirs.append(input_dir / "extracted")

    all_pdfs = []
    for search_dir in search_dirs:
        all_pdfs.extend(find_files(search_dir, ['.pdf']))

    # Remove duplicates (keep unique paths)
    pdf_files = list(dict.fromkeys(all_pdfs))

    print(f"  Found {len(pdf_files)} unique PDF file(s)\n")

    # Step 3: Convert PDFs to Markdown with image extraction
    pdf_results = []

    if pdf_files:
        print("[Step 3/4] Analyzing PDFs and extracting images...\n")

        for pdf_file in pdf_files:
            print(f"  Processing: {pdf_file.name}")
            result = convert_pdf_with_python(pdf_file, output_dir)

            if result['success']:
                pdf_results.append({
                    'success': True,
                    'pdf': str(pdf_file),
                    'markdown': result['markdown'],
                    'images': result['images'],
                    'pages': result['pages']
                })
                print(f"    OK Extracted {result['images']} image(s) from {result['pages']} pages\n")
            else:
                pdf_results.append({
                    'success': False,
                    'pdf': str(pdf_file),
                    'error': result.get('error', 'Unknown error')
                })

    # Step 4: Copy JSON data files
    print("[Step 4/4] Copying JSON data files...\n")

    json_files = find_files(input_dir, ['.json'])
    copied_json = []

    for json_file in json_files:
        try:
            target = output_dir / json_file.name
            shutil.copy2(json_file, target)
            print(f"  Copying: {json_file.name}")
            copied_json.append(json_file)
        except Exception as e:
            print(f"  ERROR Error copying {json_file.name}: {e}")

    # Evaluate visual extraction quality gate
    total_images = sum(r['images'] for r in pdf_results if r['success'])
    expected_visuals = infer_visual_expectation(args.expect_visual_assets, pdf_files, output_dir)
    gate_result = evaluate_visual_gate(
        expected_visuals=expected_visuals,
        total_images=total_images,
        gate_mode=args.visual_gate,
        expect_mode=args.expect_visual_assets,
    )

    # Create INDEX.md
    create_index_md(output_dir, pdf_results, copied_json, gate_result)

    # Summary
    print("\n=== Summary ===")
    print(f"  ZIP files extracted: {len(zip_files)}")
    print(f"  PDFs analyzed: {len(pdf_files)}")

    print(f"  Images extracted: {total_images} (only actual diagrams/wireframes)")

    print(f"  JSON files copied: {len(copied_json)}")
    print(f"  Output directory: {output_dir}")

    print("\n=== Preparation Complete! ===\n")
    print("Intelligent extraction results:")
    print(f"  - {len(pdf_files)} PDF documents analyzed")
    print(f"  - {total_images} images extracted (diagrams/wireframes only)")
    print(f"  - {len(copied_json)} JSON data files copied")
    print("\nNo wasted space - only actual visual content extracted!")

    if gate_result['status'] == 'WARN':
        print(f"\nWARNING Quality gate warning: {gate_result['message']}")
    if gate_result['status'] == 'FAIL':
        print(f"\nERROR Quality gate failed: {gate_result['message']}")
        sys.exit(2)

if __name__ == "__main__":
    main()
