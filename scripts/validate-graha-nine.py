#!/usr/bin/env python3
"""Regression checks for the static Myanmar astrology reference page."""

from html.parser import HTMLParser
from html import unescape
import re
from pathlib import Path
import sys

HTML_FILE = Path("graha-nine.html")
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}
EXPECTED_HEADINGS = [
    "၁။ ကျား / မ ဂြိုဟ် ခွဲခြားနည်း",
    "၂။ စကားအမှန် / အမှား ခွဲခြားနည်း",
    "၃။ ဝယ် / မဝယ် ခွဲခြားနည်း",
    "၄။ နဂိုရ်ဂြိုဟ် / ယာယီဂြိုဟ် (အတွင်းလူ / အပြင်လူ) ခွဲခြားနည်း",
    "၅။ မိတ် / ရန် ခွဲခြားနည်း",
    "၆။ အကြီး / အငယ် ခွဲခြားနည်း",
    "၇။ ဓာတ်မိတ် / ဓာတ်ရန် ခွဲခြားနည်း",
]
REQUIRED_TEXT = [
    "အောင်ပ ကုလား ဆွေသား နှောင်ရင်း",
    "အရှင်ဂြိုဟ်",
    "ကျွန်ဂြိုဟ်",
    "အပြင်မိတ်",
    "အတွင်းမိတ်",
    "အပြင်ရန်",
    "အတွင်းရန်",
    "မဖော်ပြထား",
    "ဂြိုဟ် ၉ ပါး ဇယား",
    "ဂြိုဟ်တို့၏ အက္ခရာများ",
    "မဟာဘုတ်ပညာ",
    "ဂြိုဟ် ၈ လုံး ပရိယာယ်",
]

class DocumentAudit(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []
        self.ids = []
        self.headings = []
        self.current_heading = None
        self.section_stack = []
        self.akchara_table_count = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        element_id = attrs.get("id")
        if element_id:
            self.ids.append(element_id)
        if tag == "section":
            self.section_stack.append(element_id or attrs.get("aria-labelledby"))
        if tag == "table" and "akchara-linga-heading" in self.section_stack:
            self.akchara_table_count += 1
        if tag == "h3":
            self.current_heading = []
        if tag not in VOID_TAGS:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS and self.stack and self.stack[-1] == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        if tag in VOID_TAGS:
            self.errors.append(f"Void element has closing tag: </{tag}>")
            return
        if not self.stack:
            self.errors.append(f"Unexpected closing tag: </{tag}>")
            return
        if self.stack[-1] != tag:
            self.errors.append(
                f"Mismatched closing tag: expected </{self.stack[-1]}>, got </{tag}>"
            )
            return
        self.stack.pop()
        if tag == "section" and self.section_stack:
            self.section_stack.pop()
        if tag == "h3" and self.current_heading is not None:
            self.headings.append("".join(self.current_heading).strip())
            self.current_heading = None

    def handle_data(self, data):
        if self.current_heading is not None:
            self.current_heading.append(data)

def fail(message):
    print(f"FAIL: {message}")
    return 1

def main():
    if not HTML_FILE.is_file():
        return fail(f"Missing {HTML_FILE}")
    source = HTML_FILE.read_text(encoding="utf-8")
    parser = DocumentAudit()
    try:
        parser.feed(source)
        parser.close()
    except Exception as exc:
        return fail(f"HTML parser error: {exc}")

    if parser.errors:
        return fail("; ".join(parser.errors))
    if parser.stack:
        return fail(f"Unclosed HTML elements: {parser.stack}")
    if len(parser.ids) != len(set(parser.ids)):
        return fail("Duplicate HTML id attributes")

    missing_headings = [item for item in EXPECTED_HEADINGS if item not in parser.headings]
    if missing_headings:
        return fail(f"Missing classification headings: {missing_headings}")
    if parser.akchara_table_count != 7:
        return fail(
            f"Expected 7 classification tables, found {parser.akchara_table_count}"
        )

    missing_text = [item for item in REQUIRED_TEXT if item not in source]
    if missing_text:
        return fail(f"Missing required source wording/content: {missing_text}")

    if source.count('id="akchara-linga-heading"') != 1:
        return fail("Expected exactly one dedicated akchara-linga section")
    if not source.rstrip().endswith("</html>"):
        return fail("Document must end with </html>")

    print("PASS: HTML nesting and closing tags")
    print("PASS: unique IDs")
    print("PASS: all 7 classification headings and tables")
    print("PASS: corrected mnemonic and key wording")
    pariyaya_file = Path("graha-pariyaya.html")
    if not pariyaya_file.is_file():
        return fail("Missing graha-pariyaya.html")
    pariyaya = pariyaya_file.read_text(encoding="utf-8")
    if pariyaya.count('<article class="planet-card') != 9:
        return fail("Expected 9 planet cards in graha-pariyaya.html")
    for ketu_fact in ("ဂြိုဟ်အမှတ်</dt><dd>၉", "တိရစ္ဆာန်သင်္ကေတ</dt><dd>ဆိတ်", "ဗုဒ္ဓဟူးနေ့", "နေ့လယ် ၁၂:၀၀ မှ သန်းခေါင် ၁၂:၀၀"):
        if ketu_fact not in pariyaya:
            return fail(f"Missing existing Ketu source fact: {ketu_fact}")
    if "ပရိယာယ်စာရင်း၊ အက္ခရာ၊ အဆင်းသဏ္ဌာန်နှင့် အစိုးရသောအရပ်ကို မူရင်း HTML တွင် မဖော်ပြထားသေးပါ။" not in pariyaya:
        return fail("Ketu unknown fields must remain explicit")
    if "အဖ၊ အဖေ" not in pariyaya or "ပညာ" not in pariyaya:
        return fail("Expected original pariyaya wording is missing")
    source_section = re.search(
        r'<section[^>]*aria-labelledby="graha-pariyaya-heading"[^>]*>(.*?)</section>',
        source,
        re.DOTALL,
    )
    if not source_section:
        return fail("Original graha pariyaya source section is missing")
    source_terms = re.findall(
        r'<tr><td class="num">.*?</td><td>.*?</td><td>.*?</td><td>(.*?)</td></tr>',
        source_section.group(1),
        re.DOTALL,
    )
    if len(source_terms) != 8:
        return fail(f"Expected 8 original pariyaya source rows, found {len(source_terms)}")
    for term in source_terms:
        original_text = unescape(re.sub(r"<[^>]+>", "", term)).strip()
        if original_text not in pariyaya:
            return fail("A source pariyaya entry was changed or omitted")

    print("PASS: original graha, letter, and Mahabote sections remain")
    print("PASS: nine pariyaya cards, original wording, and explicit Ketu gap")
    return 0

if __name__ == "__main__":
    sys.exit(main())
