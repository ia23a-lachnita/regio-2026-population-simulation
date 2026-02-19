import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from cli_guards import normalize_path_arg, parse_prepare_args, parse_extract_args


class CliGuardsTests(unittest.TestCase):
    def test_normalize_rejects_incomplete_drive(self):
        with self.assertRaises(ValueError):
            normalize_path_arg('C:')

    def test_prepare_parser_accepts_windows_positional_paths(self):
        args = parse_prepare_args([
            r'C:\Users\xursc\projects\competition\input',
            r'C:\Users\xursc\projects\competition\workspace\.context\source-docs',
        ])
        self.assertEqual(args.input_dir_pos, r'C:\Users\xursc\projects\competition\input')
        self.assertEqual(args.output_dir_pos, r'C:\Users\xursc\projects\competition\workspace\.context\source-docs')

    def test_prepare_parser_rejects_unknown_tokens(self):
        with self.assertRaises(ValueError):
            parse_prepare_args(['--input-dir', 'input', '/NFL'])

    def test_extract_parser_accepts_flag_paths(self):
        args = parse_extract_args([
            '--pdf', r'C:\Users\xursc\docs\wireframe.pdf',
            '--output-dir', r'C:\Users\xursc\out',
        ])
        self.assertTrue(str(args['pdf_path']).lower().endswith('wireframe.pdf'))
        self.assertTrue(str(args['output_dir']).lower().endswith('out'))

    def test_extract_parser_requires_pdf(self):
        with self.assertRaises(SystemExit):
            parse_extract_args(['--output-dir', 'out'])


if __name__ == '__main__':
    unittest.main()
