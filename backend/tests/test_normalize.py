import csv
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from data_pipeline.normalize import normalize_standard_number

ROOT = os.path.join(os.path.dirname(__file__), "..")


class TestNormalizeStandardNumber(unittest.TestCase):
    def test_bare(self):
        r = normalize_standard_number("IS 456")
        self.assertEqual(r.standard_number, "IS 456")
        self.assertEqual(r.is_number, 456)
        self.assertIsNone(r.part)
        self.assertIsNone(r.year)

    def test_dash_year(self):
        r = normalize_standard_number("IS 12269-1987")
        self.assertEqual((r.is_number, r.part, r.year), (12269, None, 1987))

    def test_colon_prefix(self):
        r = normalize_standard_number("IS: 2386")
        self.assertEqual(r.is_number, 2386)

    def test_spaced_dash_year(self):
        r = normalize_standard_number("IS 269 - 2015")
        self.assertEqual((r.is_number, r.year), (269, 2015))

    def test_colon_part_dot(self):
        r = normalize_standard_number("IS:2720 (Part.4) 1985")
        self.assertEqual((r.is_number, r.part, r.year), (2720, "4", 1985))

    def test_multi_dash_no_year(self):
        r = normalize_standard_number("IS 12448-2-3")
        self.assertEqual((r.is_number, r.part, r.year), (12448, "2-3", None))

    def test_spaced_colon_year(self):
        r = normalize_standard_number("IS 3160 : 2022")
        self.assertEqual((r.is_number, r.year), (3160, 2022))

    def test_trailing_colon_no_year(self):
        r = normalize_standard_number("IS 26002 :")
        self.assertEqual((r.is_number, r.year), (26002, None))

    def test_combined_parts_ampersand(self):
        r = normalize_standard_number("IS 1489 (part 1&2) 1991")
        self.assertEqual((r.is_number, r.part, r.year), (1489, "1-2", 1991))

    def test_roman_part(self):
        r = normalize_standard_number("IS 2386 (Part I) 1963")
        self.assertEqual((r.is_number, r.part, r.year), (2386, "1", 1963))

    def test_roman_range(self):
        r = normalize_standard_number("IS 3495 (Parts I TO iv) 1976")
        self.assertEqual((r.is_number, r.part, r.year), (3495, "1-4", 1976))

    def test_p_abbreviation(self):
        r = normalize_standard_number("IS 432 (P II) 1966")
        self.assertEqual((r.is_number, r.part, r.year), (432, "2", 1966))

    def test_no_space_paren(self):
        r = normalize_standard_number("IS:2720(Part. XI) 1971")
        self.assertEqual((r.is_number, r.part, r.year), (2720, "11", 1971))

    def test_colon_no_space_num_space_year(self):
        r = normalize_standard_number("IS:1498 1970")
        self.assertEqual((r.is_number, r.year), (1498, 1970))

    def test_colon_no_space_year(self):
        r = normalize_standard_number("IS 13270:2013")
        self.assertEqual((r.is_number, r.year), (13270, 2013))

    def test_allied_part_colon_year(self):
        r = normalize_standard_number("IS 3156 (Part 1):1992")
        self.assertEqual((r.is_number, r.part, r.year), (3156, "1", 1992))

    def test_relevant_parts(self):
        r = normalize_standard_number("IS 4031 (Relevant Parts)")
        self.assertEqual((r.is_number, r.part, r.year), (4031, None, None))

    def test_dash_part_colon_year(self):
        r = normalize_standard_number("IS 302-1:2008")
        self.assertEqual((r.is_number, r.part, r.year), (302, "1", 2008))

    def test_dash_subpart_colon_year(self):
        r = normalize_standard_number("IS 302-2-14:2009")
        self.assertEqual((r.is_number, r.part, r.year), (302, "2-14", 2009))

    def test_iso_prefix(self):
        r = normalize_standard_number("IS/ISO 14971:2019")
        self.assertEqual((r.prefix, r.is_number, r.year), ("IS/ISO", 14971, 2019))

    def test_part_slash_sec(self):
        r = normalize_standard_number("IS 2303 (Part 1/Sec 1):1994")
        self.assertEqual((r.is_number, r.part, r.year), (2303, "1-1", 1994))

    def test_none_input(self):
        r = normalize_standard_number(None)
        self.assertIsNone(r.is_number)

    def test_idempotent_on_canonical_output(self):
        # Re-normalizing an already-canonical string must be a no-op.
        for raw in ["IS 456", "IS 2720-4:1985", "IS 12448-2-3", "IS/ISO 14971:2019"]:
            once = normalize_standard_number(raw)
            twice = normalize_standard_number(once.standard_number)
            self.assertEqual(once.standard_number, twice.standard_number)


class TestAgainstRealData(unittest.TestCase):
    """Every standard_number in the actual dataset/mapping must yield an is_number."""

    def test_main_dataset_all_parse(self):
        path = os.path.join(ROOT, "data", "raw", "bis_standards_dataset.csv")
        with open(path, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        failures = [
            row["standard_number"]
            for row in rows
            if normalize_standard_number(row["standard_number"]).is_number is None
        ]
        self.assertEqual(failures, [], f"unparsed standard_number values: {failures}")

    def test_allied_mapping_all_parse(self):
        path = os.path.join(ROOT, "data", "raw", "allied_standards_mapping.json")
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        failures = []
        for entry in data:
            if normalize_standard_number(entry["primary_standard"]).is_number is None:
                failures.append(entry["primary_standard"])
            for allied in entry["allied_standards"]:
                if normalize_standard_number(allied["standard"]).is_number is None:
                    failures.append(allied["standard"])
        self.assertEqual(failures, [], f"unparsed standard references: {failures}")


if __name__ == "__main__":
    unittest.main()
