"""Compare existing static page content with the pre-expansion release snapshot.

Assets can change when the application gains new routes. Existing visible main
content, titles, descriptions, canonicals, robots and navigation must not change
as a side effect of adding the new location catalog.
"""
from html.parser import HTMLParser
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.main = self.ignore = 0
        self.in_title = False
        self.text, self.title, self.meta, self.links, self.anchors = [], [], [], [], []
        self.lang = ""

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "html":
            self.lang = values.get("lang", "")
        if tag == "main":
            self.main += 1
        if tag in {"script", "style"}:
            self.ignore += 1
        if tag == "title":
            self.in_title = True
        if tag == "meta" and values.get("name") in {"description", "robots"}:
            self.meta.append([values.get("name"), values.get("content")])
        if tag == "link" and values.get("rel") in {"canonical", "alternate"}:
            self.links.append({key: value for key, value in values.items() if key in {"rel", "href", "hreflang"}})
        if self.main and tag == "a":
            self.anchors.append(values.get("href", ""))

    def handle_endtag(self, tag):
        if tag == "main":
            self.main = max(0, self.main - 1)
        if tag in {"script", "style"}:
            self.ignore = max(0, self.ignore - 1)
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.main and not self.ignore and data.strip():
            self.text.append(" ".join(data.split()))


def record(path):
    page = Page()
    page.feed(path.read_text(encoding="utf-8"))
    return {"mainText": page.text, "title": page.title, "meta": page.meta,
            "links": page.links, "lang": page.lang, "anchors": page.anchors}


def main():
    baseline = json.loads((ROOT / "docs/expansion-baseline-pages.json").read_text())
    # Keep the original snapshot immutable. Later explicit user edits have an
    # exact, inspectable text exception; metadata and every other field remain
    # subject to the original comparison.
    approvals = json.loads((ROOT / "docs/approved-content-changes.json").read_text()).get("changes", {})
    errors = []
    approved_changes = []
    actual_changed_pages = 0
    for relative, expected in baseline["pages"].items():
        path = ROOT / "frontend/build" / relative
        if not path.is_file():
            errors.append({"path": relative, "error": "Existing page is missing"})
            continue
        actual = record(path)
        if actual != expected:
            actual_changed_pages += 1
        approval = approvals.get(relative)
        if approval:
            expected = json.loads(json.dumps(expected))
            # The owner explicitly authorized a complete homepage redesign
            # after the expansion release. Only its visible text and contact/
            # portfolio links may differ; URL and search metadata stay fixed.
            if approval.get("allowed_fields"):
                allowed = approval["allowed_fields"]
                if relative != "index.html" or set(allowed) - {"mainText", "anchors"}:
                    raise ValueError("Only homepage text/links may use a redesign exception")
                changed = [key for key in expected if key not in allowed and expected[key] != actual[key]]
                if changed:
                    errors.append({"path": relative, "changed": changed})
                else:
                    approved_changes.append({"path": relative, "fields": allowed, **approval})
                continue
            before, after = approval["before"], approval["after"]
            positions = [i for i in range(len(expected["mainText"]) - len(before) + 1)
                         if expected["mainText"][i:i + len(before)] == before]
            if len(positions) != 1:
                errors.append({"path": relative, "error": "Approved old text must match exactly once in the immutable baseline"})
                continue
            start = positions[0]
            expected["mainText"][start:start + len(before)] = after
        changed = [key for key in expected if expected[key] != actual[key]]
        if changed:
            errors.append({"path": relative, "changed": changed})
        elif approval:
            approved_changes.append({"path": relative, "field": "mainText", **approval})
    result = {"result": "pass" if not errors else "fail",
              "existingStaticPagesChecked": len(baseline["pages"]),
              "changedExistingPages": actual_changed_pages,
              "approvedChangedExistingPages": len(approved_changes),
              "unexpectedChangedExistingPages": len(errors),
              "approvedChanges": approved_changes, "errors": errors,
              "scope": "Immutable pre-expansion snapshot; explicit owner-approved homepage redesign allows visible text and links only. Homepage search metadata and every other existing page remain protected; live database preservation is checked separately."}
    (ROOT / "docs/expansion-preservation-checks.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key != "errors"}))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
