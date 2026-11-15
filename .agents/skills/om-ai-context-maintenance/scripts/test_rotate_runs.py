import datetime as dt
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('rotate-runs.py')
SPEC = importlib.util.spec_from_file_location('rotate_runs', SCRIPT)
rotate_runs = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rotate_runs)


class RotateRunsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.repo = Path(self.temporary.name)
        self.runs = self.repo / '.ai' / 'runs'
        self.runs.mkdir(parents=True)

    def tearDown(self):
        self.temporary.cleanup()

    def run_folder(self, name, content='done'):
        folder = self.runs / name
        folder.mkdir()
        (folder / 'result.txt').write_text(content, encoding='utf-8')
        return folder

    def test_archive_verification_failure_retains_every_source(self):
        folder = self.run_folder('2020-01-01-old-run')
        with patch.object(rotate_runs, 'verify', side_effect=ValueError('verification failed')):
            report = rotate_runs.rotate(self.repo, apply=True, today=dt.date(2026, 11, 15))

        self.assertEqual(report['items'][0]['action'], 'error')
        self.assertEqual(report['items'][0]['reason'], 'verification failed')
        self.assertTrue(folder.is_dir())
        self.assertEqual((folder / 'result.txt').read_text(encoding='utf-8'), 'done')
        self.assertFalse(any(self.runs.glob('rotated-before-*.tgz')))
        self.assertFalse((self.runs / '.context-maintenance.lock').exists())

    def test_symlinked_runs_root_and_nested_links_are_rejected(self):
        outside = self.repo / 'outside'
        outside.mkdir()
        linked_root = self.repo / 'linked-runs'
        try:
            linked_root.symlink_to(outside, target_is_directory=True)
        except OSError as error:
            self.skipTest(f'symlinks are unavailable: {error}')
        with self.assertRaisesRegex(ValueError, 'symlinked runs path'):
            rotate_runs.resolve_root(self.repo, 'linked-runs')

        folder = self.run_folder('2020-01-01-linked-run')
        (folder / 'outside-link').symlink_to(outside, target_is_directory=True)
        report = rotate_runs.rotate(self.repo, apply=True, today=dt.date(2026, 11, 15))
        self.assertEqual(report['items'][0]['action'], 'error')
        self.assertIn('symlink or special file', report['items'][0]['reason'])
        self.assertTrue(folder.is_dir())

    def test_retention_boundary_and_apply_deletion(self):
        recent = self.run_folder('2026-11-02-recent')
        old = self.run_folder('2020-01-01-old')
        captured = rotate_runs.snapshot(old)
        today = dt.date(2026, 11, 15)

        preview = rotate_runs.rotate(self.repo, keep_days=14, today=today)
        self.assertEqual({item['name']: item['action'] for item in preview['items']}, {
            '2020-01-01-old': 'eligible',
            '2026-11-02-recent': 'retained',
        })
        self.assertTrue(old.exists())

        applied = rotate_runs.rotate(self.repo, keep_days=14, apply=True, today=today)
        self.assertEqual({item['name']: item['action'] for item in applied['items']}, {
            '2020-01-01-old': 'archived',
            '2026-11-02-recent': 'retained',
        })
        self.assertFalse(old.exists())
        self.assertTrue(recent.exists())
        archive = Path(applied['archive'])
        self.assertTrue(archive.is_file())
        rotate_runs.verify(archive, captured)


if __name__ == '__main__':
    unittest.main()
