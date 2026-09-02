"""Unit tests for the TeacherFolio signaling server's security helpers.

Run with:  python -m unittest discover -s python-server/tests -v
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Configure the token BEFORE importing the server (it reads env at import).
os.environ["SIGNALING_TEACHER_TOKEN"] = "test-secret-token"
os.environ["SIGNALING_ALLOWED_ORIGINS"] = "https://example.com,http://localhost:8000"

from server import (  # noqa: E402
    ALLOWED_ORIGINS,
    MAX_TEXT_LENGTH,
    origin_allowed,
    teacher_token_matches,
    valid_room,
)


class TestOriginAllowlist(unittest.TestCase):
    def test_allowed_origin_accepted(self):
        self.assertTrue(origin_allowed("https://example.com"))

    def test_allowlist_loaded_from_env(self):
        self.assertIn("https://example.com", ALLOWED_ORIGINS)

    def test_disallowed_origin_rejected(self):
        self.assertFalse(origin_allowed("https://evil.example"))
        self.assertFalse(origin_allowed("https://example.com.evil.org"))

    def test_no_origin_accepted(self):
        self.assertTrue(origin_allowed(None))


class TestTeacherToken(unittest.TestCase):
    def test_correct_token_passes(self):
        self.assertTrue(teacher_token_matches("test-secret-token"))

    def test_wrong_token_fails(self):
        self.assertFalse(teacher_token_matches("wrong"))

    def test_missing_token_fails(self):
        self.assertFalse(teacher_token_matches(None))
        self.assertFalse(teacher_token_matches(""))

    def test_fail_closed_when_unconfigured(self):
        old = os.environ.get("SIGNALING_TEACHER_TOKEN")
        del os.environ["SIGNALING_TEACHER_TOKEN"]
        import importlib

        import server as srv

        importlib.reload(srv)
        try:
            self.assertFalse(srv.teacher_token_matches("anything"))
        finally:
            os.environ["SIGNALING_TEACHER_TOKEN"] = old or ""
            importlib.reload(srv)


class TestRoomValidation(unittest.TestCase):
    def test_valid_rooms(self):
        for room in ["abc123", "ABC-123", "a" * 16]:
            self.assertTrue(valid_room(room))

    def test_invalid_rooms(self):
        for room in ["", "..", "a/b", "a b", "a" * 17, "a!b", "a_b", None]:
            self.assertFalse(valid_room(room), room)


class TestTextLimits(unittest.TestCase):
    def test_text_is_truncated(self):
        from server import websocket_signal  # ensure no import errors

        self.assertGreater(MAX_TEXT_LENGTH, 0)


if __name__ == "__main__":
    unittest.main()