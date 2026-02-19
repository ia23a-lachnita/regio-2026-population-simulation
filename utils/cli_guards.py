import argparse
from pathlib import Path
from typing import List


def normalize_path_arg(value: str) -> Path:
    raw = value.strip().strip('"').strip("'")
    if not raw:
        raise ValueError("Path argument is empty")
    if raw in {"===", "...", ",", ";"}:
        raise ValueError(f"Malformed path token: {value}")
    if raw.startswith('/') and raw[1:].isalpha() and raw[1:].upper() == raw[1:] and len(raw) <= 8:
        raise ValueError(f"Looks like a command flag, not a path: {value}")
    if len(raw) == 2 and raw[1] == ':':
        raise ValueError(f"Incomplete drive path: {value}")
    return Path(raw)


def parse_prepare_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare competition input files (ZIP extraction + PDF conversion + JSON copy)."
    )
    parser.add_argument('input_dir_pos', nargs='?', help='Input directory (legacy positional)')
    parser.add_argument('output_dir_pos', nargs='?', help='Output directory (legacy positional)')
    parser.add_argument('--input-dir', help='Input directory containing ZIP/PDF/JSON files')
    parser.add_argument('--output-dir', help='Output directory for converted source docs')
    parser.add_argument(
        '--expect-visual-assets',
        choices=['auto', 'always', 'never'],
        default='auto',
        help='Whether image extraction is expected from the provided PDFs',
    )
    parser.add_argument(
        '--visual-gate',
        choices=['warn', 'fail', 'off'],
        default='fail',
        help='Behavior when expected visuals are not extracted',
    )

    args, unknown = parser.parse_known_args(argv)
    if unknown:
        parser.error(f"Unknown arguments: {' '.join(unknown)}")

    for candidate in [args.input_dir, args.output_dir, args.input_dir_pos, args.output_dir_pos]:
        if candidate:
            normalize_path_arg(candidate)

    return args


def parse_extract_args(argv: List[str]):
    parser = argparse.ArgumentParser(
        description="Extract meaningful visual content and text from a PDF into Markdown."
    )
    parser.add_argument('pdf_pos', nargs='?', help='PDF file path (legacy positional)')
    parser.add_argument('output_pos', nargs='?', help='Output directory (legacy positional)')
    parser.add_argument('--pdf', help='PDF file path')
    parser.add_argument('--output-dir', help='Output directory')

    args, unknown = parser.parse_known_args(argv)
    if unknown:
        parser.error(f"Unknown arguments: {' '.join(unknown)}")

    pdf_value = args.pdf or args.pdf_pos
    if not pdf_value:
        parser.error("Missing required PDF path. Provide --pdf or positional <pdf-file>.")

    output_value = args.output_dir or args.output_pos or "./output"

    return {
        'pdf_path': normalize_path_arg(pdf_value),
        'output_dir': normalize_path_arg(output_value),
    }
