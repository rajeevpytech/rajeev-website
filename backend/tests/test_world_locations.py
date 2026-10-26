"""Catalog preservation and source-integrity checks, independent of MongoDB."""
import importlib.util
import json
from pathlib import Path
import re
import unittest
from zoneinfo import ZoneInfo

BACKEND = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("world_catalog_data", BACKEND / "data.py")
data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(data)


class WorldwideCatalogTests(unittest.TestCase):
    def test_existing_published_urls_survive_unchanged(self):
        original = json.loads((BACKEND / "original_location_slugs.json").read_text())
        self.assertEqual(len(original), 248)
        self.assertTrue(set(original).issubset(data.CITY_MAP))
        self.assertTrue(all(not data.CITY_MAP[path].get("is_new_location") for path in original))

    def test_newer_live_catalog_preserved_with_exact_public_slugs(self):
        live = json.loads((BACKEND / "live_location_catalog.json").read_text())
        original_upload = json.loads((BACKEND / "uploaded_location_slugs.json").read_text())
        self.assertEqual(len(original_upload), 225)
        self.assertTrue(set(original_upload).issubset(data.CITY_MAP))
        self.assertEqual(live["total_cities"], 248)
        for country in live["countries"]:
            for city in country["cities"]:
                record = data.CITY_MAP[city["loc_slug"]]
                self.assertEqual(record["city"], city["city"])
                self.assertEqual(record["country_slug"], country["slug"])
                self.assertEqual(record["country"], country["name"])
                self.assertEqual(record["region"], country["region"])
                self.assertFalse(record.get("is_new_location"))
        self.assertIn("düsseldorf-germany", data.CITY_MAP)

    def test_new_locations_are_distinguishable_and_have_safe_unique_slugs(self):
        new = {key: value for key, value in data.CITY_MAP.items() if value.get("is_new_location")}
        self.assertEqual(len(new), 223)
        self.assertEqual(len(data.CITY_MAP), 471)
        for key, value in new.items():
            self.assertRegex(key, r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
            self.assertIn(value["country_slug"], data.COUNTRIES)
            if value.get("timezone"):
                ZoneInfo(value["timezone"])
            if value.get("geoname_id"):
                self.assertGreater(value["geoname_id"], 0)

    def test_current_populated_country_territory_inventory(self):
        catalog = data._WORLD_CATALOG
        codes = [country["code"] for country in catalog["countries"]]
        self.assertEqual(len(codes), 246)
        self.assertEqual(len(codes), len(set(codes)))
        self.assertFalse({"CS", "AN", "AQ", "BV", "HM", "UM"}.intersection(codes))
        self.assertEqual(len(data.COUNTRIES), 246)

    def test_ten_new_delhi_localities_are_not_business_offices(self):
        names = data._WORLD_CATALOG["metadata"]["delhi_localities_added"]
        self.assertEqual(len(names), 10)
        for name in names:
            value = data.CITY_MAP[f"{data._slug(name)}-india"]
            self.assertTrue(value["is_new_location"])
            self.assertEqual(value["kind"], "neighbourhood")
            self.assertEqual(value["parent_city"], "Delhi")
            self.assertNotIn("office", value)


if __name__ == "__main__":
    unittest.main()
