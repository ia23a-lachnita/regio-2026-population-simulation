#!/usr/bin/env python3
"""
Advanced PDF Visual Content Extractor
Extracts ONLY meaningful diagrams, wireframes, and illustrations from PDFs.
Filters out logos, headers, footers, decorative elements, and page renders.

Strategy:
1. Analyze all images across entire PDF first (multi-pass)
2. Identify logos/repeated elements (appear on many pages)
3. Filter by position (skip header/footer regions)
4. Filter by size relative to page (too small = logo, too large = page render)
5. Filter by content (white space, color diversity)
6. Extract only unique, meaningful visual content
"""

import sys
import os
import hashlib
import shutil
from pathlib import Path
from collections import defaultdict
import fitz  # PyMuPDF
from PIL import Image
import io
from cli_guards import parse_extract_args

def parse_cli_args(argv):
    return parse_extract_args(argv)

VECTOR_VISUAL_KEYWORDS = [
    'mockup',
    'wireframe',
    'criterion',
    'criteria',
    'variant',
    'screen',
    'layout',
    'ui',
]

def get_image_hash(image_bytes):
    """Generate MD5 hash for duplicate detection."""
    return hashlib.md5(image_bytes).hexdigest()

def analyze_image_content(image_bytes):
    """
    Analyze image content to determine if it's meaningful.
    Returns: (is_meaningful, reason, metrics)
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size

        # Convert to RGB for analysis
        if img.mode not in ['RGB', 'RGBA']:
            img = img.convert('RGB')

        # Resize for faster analysis (max 400px)
        if max(width, height) > 400:
            ratio = 400 / max(width, height)
            img = img.resize((int(width * ratio), int(height * ratio)), Image.Resampling.LANCZOS)

        # Count unique colors (more colors = more complex image)
        colors = img.getcolors(maxcolors=10000)
        unique_colors = len(colors) if colors else 10000

        # Calculate white pixel percentage
        pixels = list(img.getdata())
        total_pixels = len(pixels)
        white_threshold = 240

        if img.mode == 'RGBA':
            white_pixels = sum(1 for r, g, b, *_ in pixels if r > white_threshold and g > white_threshold and b > white_threshold)
        else:
            white_pixels = sum(1 for r, g, b in pixels if r > white_threshold and g > white_threshold and b > white_threshold)

        white_percentage = (white_pixels / total_pixels) * 100 if total_pixels > 0 else 0

        metrics = {
            'width': width,
            'height': height,
            'unique_colors': unique_colors,
            'white_percentage': white_percentage
        }

        # Filter: mostly white (likely blank/margin)
        if white_percentage > 95:
            return False, f"mostly white ({white_percentage:.1f}%)", metrics

        # Filter: too few colors (likely logo/icon)
        if unique_colors < 50:
            return False, f"too simple ({unique_colors} colors)", metrics

        # Filter: too small (likely logo/icon)
        if width < 150 or height < 150:
            return False, f"too small ({width}x{height})", metrics

        # Filter: file size too small
        file_size_kb = len(image_bytes) / 1024
        if file_size_kb < 5:
            return False, f"file too small ({file_size_kb:.1f}KB)", metrics

        return True, f"valid ({width}x{height}, {unique_colors} colors)", metrics

    except Exception as e:
        # If we can't analyze, assume it's not meaningful
        return False, f"analysis error: {e}", {}

def analyze_pdf_images(pdf_path):
    """
    First pass: Analyze all images in PDF to identify patterns.
    Returns dict of image hashes with metadata about where they appear.
    """
    doc = fitz.open(pdf_path)
    image_map = defaultdict(lambda: {
        'pages': [],
        'positions': [],
        'sizes': [],
        'bytes': None,
        'ext': None
    })

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_number = page_num + 1
        page_rect = page.rect
        page_height = page_rect.height

        # Get detailed image information including position
        image_info_list = page.get_image_info(xrefs=True)

        for img_info in image_info_list:
            xref = img_info.get('xref', 0)
            if xref == 0:
                continue

            try:
                # Extract image
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                img_hash = get_image_hash(image_bytes)

                # Get position on page
                bbox = img_info.get('bbox', (0, 0, 0, 0))  # (x0, y0, x1, y1)
                img_width = bbox[2] - bbox[0]
                img_height = bbox[3] - bbox[1]
                y_position = bbox[1]  # Top of image

                # Calculate position relative to page
                relative_y = y_position / page_height if page_height > 0 else 0

                # Store info
                entry = image_map[img_hash]
                if entry['bytes'] is None:
                    entry['bytes'] = image_bytes
                    entry['ext'] = image_ext

                entry['pages'].append(page_number)
                entry['positions'].append({
                    'page': page_number,
                    'bbox': bbox,
                    'relative_y': relative_y,
                    'display_width': img_width,
                    'display_height': img_height
                })

            except Exception:
                continue

    doc.close()
    return image_map

def filter_meaningful_images(image_map, pdf_path):
    """
    Second pass: Filter images to keep only meaningful visual content.
    Returns list of images to extract.
    """
    meaningful_images = []

    for img_hash, data in image_map.items():
        image_bytes = data['bytes']
        pages = data['pages']
        positions = data['positions']

        if image_bytes is None:
            continue

        # Filter 1: Repeated on many pages (likely logo/header)
        page_count = len(set(pages))
        if page_count > 3:
            print(f"    Filtered: appears on {page_count} pages (likely logo/header)")
            continue

        # Filter 2: Always in header/footer position
        in_header_footer = sum(1 for p in positions if p['relative_y'] < 0.15 or p['relative_y'] > 0.85)
        if in_header_footer > 0 and in_header_footer == len(positions):
            print(f"    Filtered: always in header/footer region")
            continue

        # Filter 3: Analyze content
        is_meaningful, reason, metrics = analyze_image_content(image_bytes)
        if not is_meaningful:
            print(f"    Filtered: {reason}")
            continue

        # Filter 4: Check display size (might be too small even if image is large)
        avg_display_width = sum(p['display_width'] for p in positions) / len(positions)
        avg_display_height = sum(p['display_height'] for p in positions) / len(positions)

        if avg_display_width < 100 or avg_display_height < 100:
            print(f"    Filtered: displayed too small ({avg_display_width:.0f}x{avg_display_height:.0f}px)")
            continue

        # This image passed all filters!
        meaningful_images.append({
            'hash': img_hash,
            'bytes': image_bytes,
            'ext': data['ext'],
            'pages': pages,
            'first_page': min(pages),
            'metrics': metrics,
            'reason': reason
        })

        print(f"    KEEP: Page {min(pages)}, {reason}")

    return meaningful_images

def find_repetitive_text_patterns(pages_text):
    """
    Analyze pages to find repetitive header/footer text.
    Returns list of text patterns that appear on many pages.
    """
    if len(pages_text) < 2:
        return []

    # Split each page into lines
    all_lines_by_page = []
    for page_data in pages_text:
        lines = [line.strip() for line in page_data['text'].split('\n') if line.strip()]
        all_lines_by_page.append(lines)

    # Count how many pages each line appears on
    line_counts = {}
    for lines in all_lines_by_page:
        unique_lines = set(lines)
        for line in unique_lines:
            line_counts[line] = line_counts.get(line, 0) + 1

    total_pages = len(pages_text)

    # Find lines that appear on >50% of pages (likely headers/footers)
    repetitive_patterns = []
    for line, count in line_counts.items():
        if count > total_pages * 0.5:
            repetitive_patterns.append(line)

    # Also detect isolated page numbers (single digit or small number alone)
    page_number_patterns = []
    for page_data in pages_text:
        lines = [line.strip() for line in page_data['text'].split('\n') if line.strip()]
        for line in lines:
            # Check if line is just a number (page number)
            if line.isdigit() and len(line) <= 3:
                page_number_patterns.append(line)

    return repetitive_patterns

def clean_repetitive_text(text, repetitive_patterns):
    """
    Remove repetitive header/footer patterns from text.
    Also removes isolated page numbers and excessive whitespace.
    """
    if not repetitive_patterns:
        return text

    lines = text.split('\n')
    cleaned_lines = []

    for line in lines:
        line_stripped = line.strip()

        # Skip empty lines
        if not line_stripped:
            continue

        # Skip repetitive patterns (headers/footers)
        if line_stripped in repetitive_patterns:
            continue

        # Skip isolated page numbers (single digit or 2-3 digits alone)
        if line_stripped.isdigit() and len(line_stripped) <= 3:
            continue

        cleaned_lines.append(line_stripped)

    # Join and clean up excessive whitespace
    cleaned = '\n'.join(cleaned_lines)

    # Remove multiple consecutive blank lines
    while '\n\n\n' in cleaned:
        cleaned = cleaned.replace('\n\n\n', '\n\n')

    return cleaned.strip()

def extract_text_from_pdf(pdf_path):
    """Extract text content from PDF and remove repetitive headers/footers."""
    doc = fitz.open(pdf_path)
    pages_text = []

    # First pass: Extract all text
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text().strip()
        pages_text.append({
            'page': page_num,
            'text': text
        })

    doc.close()

    # Second pass: Detect repetitive patterns
    repetitive_patterns = find_repetitive_text_patterns(pages_text)

    if repetitive_patterns:
        print(f"  Detected {len(repetitive_patterns)} repetitive text patterns (headers/footers)")

    # Third pass: Clean up text on each page
    for page_data in pages_text:
        page_data['text'] = clean_repetitive_text(page_data['text'], repetitive_patterns)

    return pages_text

def detect_vector_visual_pages(pdf_path):
    """
    Detect pages likely containing vector-based visuals (mockups/diagrams)
    that are not represented as embedded images.
    """
    doc = fitz.open(pdf_path)
    selected_pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        drawings_count = len(page.get_drawings())
        text = (page.get_text('text') or '').lower()

        has_visual_keyword = any(keyword in text for keyword in VECTOR_VISUAL_KEYWORDS)
        is_vector_heavy = drawings_count >= 40
        is_keyword_vector_page = has_visual_keyword and drawings_count >= 12

        if is_vector_heavy or is_keyword_vector_page:
            selected_pages.append(page_num + 1)

    doc.close()
    return selected_pages

def render_vector_visual_pages(pdf_path, pdf_images_dir, existing_pages):
    """
    Render selected vector-heavy pages as PNG images.
    """
    selected_pages = detect_vector_visual_pages(pdf_path)
    pages_to_render = [page for page in selected_pages if page not in existing_pages]

    if not pages_to_render:
        return []

    doc = fitz.open(pdf_path)
    rendered_images = []
    pdf_images_dir.mkdir(parents=True, exist_ok=True)

    for page_num in pages_to_render:
        page = doc[page_num - 1]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        image_filename = f"vector_page_{page_num}.png"
        image_path = pdf_images_dir / image_filename
        pix.save(image_path)

        rendered_images.append({
            'path': str(image_path),
            'filename': image_filename,
            'page': page_num,
            'appears_on_pages': [page_num],
            'size': f"{pix.width}x{pix.height}",
            'colors': 0,
        })

    doc.close()
    return rendered_images

def analyze_and_extract_pdf(pdf_path, output_dir):
    """
    Analyzes PDF and extracts only meaningful visual content.
    Uses multi-pass approach to identify and filter images.
    """
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir)

    # Image output directory (created lazily only when an image is written)
    pdf_images_dir = output_dir / f"{pdf_path.stem}_images"

    print(f"\n  Analyzing: {pdf_path.name}")
    print(f"  Pass 1: Scanning all images...")

    # First pass: Analyze all images
    image_map = analyze_pdf_images(pdf_path)
    total_images = len(image_map)
    print(f"  Found {total_images} unique images in PDF")

    # Second pass: Filter meaningful images
    print(f"  Pass 2: Filtering meaningful content...")
    meaningful_images = filter_meaningful_images(image_map, pdf_path)

    print(f"  Result: {len(meaningful_images)} meaningful images (filtered {total_images - len(meaningful_images)})")

    # Save meaningful images
    results = {
        'pdf': str(pdf_path),
        'title': pdf_path.stem,
        'pages': 0,
        'images': [],
        'text_pages': []
    }

    for idx, img_data in enumerate(meaningful_images, start=1):
        pdf_images_dir.mkdir(parents=True, exist_ok=True)
        image_filename = f"image_{idx}.{img_data['ext']}"
        image_path = pdf_images_dir / image_filename

        # Save image
        with open(image_path, "wb") as f:
            f.write(img_data['bytes'])

        # Convert to PNG if needed
        if img_data['ext'] not in ['png', 'jpg', 'jpeg']:
            try:
                img = Image.open(image_path)
                png_path = image_path.with_suffix('.png')
                img.save(png_path, 'PNG')
                os.remove(image_path)
                image_path = png_path
                image_filename = png_path.name
            except:
                pass

        results['images'].append({
            'path': str(image_path),
            'filename': image_filename,
            'page': img_data['first_page'],
            'appears_on_pages': img_data['pages'],
            'size': f"{img_data['metrics'].get('width', 0)}x{img_data['metrics'].get('height', 0)}",
            'colors': img_data['metrics'].get('unique_colors', 0)
        })

    # Fallback: render vector-based visual pages (mockups/diagrams drawn, not embedded as images)
    existing_pages = set()
    for image_info in results['images']:
        for page_number in image_info.get('appears_on_pages', []):
            existing_pages.add(page_number)

    vector_images = render_vector_visual_pages(pdf_path, pdf_images_dir, existing_pages)
    if vector_images:
        print(f"  Fallback: rendered {len(vector_images)} vector visual page(s)")
        results['images'].extend(vector_images)

    if not results['images'] and pdf_images_dir.exists():
        shutil.rmtree(pdf_images_dir, ignore_errors=True)

    # Extract text
    results['text_pages'] = extract_text_from_pdf(pdf_path)
    results['pages'] = len(results['text_pages'])

    return results

def create_markdown(results, output_path):
    """Create Markdown file with embedded images."""
    md = f"# {results['title']}\n\n"
    md += f"> **Source:** {Path(results['pdf']).name}  \n"
    md += f"> **Pages:** {results['pages']}  \n"

    if results['images']:
        md += f"> **Visual Content:** {len(results['images'])} image(s) extracted  \n"

    md += f"\n---\n\n"

    # Group images by page
    images_by_page = defaultdict(list)
    for img in results['images']:
        for page in img['appears_on_pages']:
            images_by_page[page].append(img)

    # Add each page
    for page_data in results['text_pages']:
        page_num = page_data['page']
        text = page_data['text']

        md += f"## Page {page_num}\n\n"

        # Add images for this page
        if page_num in images_by_page:
            md += f"### Visual Content\n\n"
            for img in images_by_page[page_num]:
                images_dir = Path(results['pdf']).stem + "_images"
                rel_path = f"{images_dir}/{img['filename']}"

                md += f"**Diagram/Wireframe** ({img['size']}, {img['colors']} colors):\n\n"
                md += f"![Page {page_num} Visual Content]({rel_path})\n\n"

            md += "\n"

        # Add text content
        if text:
            md += f"### Text Content\n\n{text}\n\n"
        elif page_num not in images_by_page:
            md += "*No content extracted from this page*\n\n"

        md += "---\n\n"

    # Write markdown
    output_path = Path(output_path)
    output_path.write_text(md, encoding='utf-8')

    return str(output_path)

def main():
    args = parse_cli_args(sys.argv[1:])
    pdf_path = args['pdf_path']
    output_dir = args['output_dir']

    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found: {pdf_path}")
        sys.exit(1)

    # Create output directory
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Extract images and text
    print("\n=== PDF Visual Content Extraction ===")
    results = analyze_and_extract_pdf(pdf_path, output_dir)

    # Create markdown
    md_filename = Path(pdf_path).stem + ".md"
    md_path = output_dir / md_filename
    create_markdown(results, md_path)

    # Summary
    print(f"\n=== Summary ===")
    print(f"  PDF: {Path(pdf_path).name}")
    print(f"  Pages: {results['pages']}")
    print(f"  Meaningful images extracted: {len(results['images'])}")
    print(f"  Markdown: {md_path}")
    print(f"  Images directory: {Path(pdf_path).stem}_images/")
    print()

    # Output JSON for scripting
    results_json = {
        'markdown': str(md_path),
        'images': results['images'],
        'image_count': len(results['images']),
        'pages': results['pages']
    }

    print(json.dumps(results_json))

if __name__ == "__main__":
    main()
