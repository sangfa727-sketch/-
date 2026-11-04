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
EXPECTED_VERSES = [
    "အောင်၊ ဆု၊ လည်း၊ ပွား — ဂြိုလ် ယောင်္ကျား",
    "ခြေ၊ သွား၊ ထိန်း၊ ရ — ဂြိုလ်မိန်းမ",
    "အုတ် ခြစ် စံ ထား မှန်စကား",
    "ကျွန် မ သား စကားမမှန်ရာ",
    "အောင် ကျော် ဇံ လောင်း မဝယ်ကောင်း",
    "လွမ်း ပု သာ ဝယ်ပါလေ",
    "အင်တူလက်မျှ နဂိုရ်ပ",
    "ခြေစွပ်သိမ်းယူ ယာယီယူ",
    "အောင်ပ ကုလား ဆွေသား နှောင်ရင်း",
    "ဦးသာ စိန်ပန်း ဒန်းလှ ကိုရှာ",
    "ဦးညို ခေမာ သုတ ဝေရီ",
    "ဓမ္မာ သောက အင်းဝ ရာဇာ",
    "ကြိုင်း လောင်း မြဲ သို",
    "အ စ နံ ရောင်း",
    "အန္တော ဂဗ္ဘေ စရေ ဝံသေ",
    "ဦးဝေ စံကူး ရေးဗူး တောသူ"
]
REQUIRED_TEXT = [
    "အောင်ပ ကုလား ဆွေသား နှောင်ရင်း",
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

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        element_id = attrs.get("id")
        if element_id:
            self.ids.append(element_id)
        if tag == "section":
            self.section_stack.append(element_id or attrs.get("aria-labelledby"))
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

    verse_section = re.search(
        r'<section[^>]*id="lanka-verses"[^>]*>(.*?)</section>',
        source,
        re.DOTALL,
    )
    if not verse_section:
        return fail("Missing verse-only lanka archive")
    source_verses = [
        unescape(re.sub(r"<[^>]+>", "", item)).strip()
        for item in re.findall(r'<p class="lanka-verse">(.*?)</p>', verse_section.group(1), re.DOTALL)
    ]
    if source_verses != EXPECTED_VERSES:
        return fail("The original lanka verses were changed, reordered, or omitted")
    if re.search(r"<h[1-6]\b|<table\b|[၀-၉0-9]", verse_section.group(1)):
        return fail("Verse-only archive must not contain headings, tables, or numeric classifications")

    missing_text = [item for item in REQUIRED_TEXT if item not in source]
    if missing_text:
        return fail(f"Missing required source wording/content: {missing_text}")

    if source.count('id="lanka-verses"') != 1:
        return fail("Expected exactly one dedicated verse-only archive")
    if not source.rstrip().endswith("</html>"):
        return fail("Document must end with </html>")

    print("PASS: HTML nesting and closing tags")
    print("PASS: unique IDs")
    print("PASS: all 16 original lanka verses are preserved without headings or numbers")
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
    source_planets = re.findall(
        r'<tr><td class="num">.*?</td><td>(.*?)</td><td>.*?</td><td>.*?</td></tr>',
        source_section.group(1),
        re.DOTALL,
    )
    expected_planets = ["တနင်္ဂနွေ","တနင်္လာ","အင်္ဂါ","ဗုဒ္ဓဟူး","ကြာသာပတေး","သောကြာ","စနေ","ရာဟု"]
    if source_planets != expected_planets:
        return fail(f"Pariyaya rows must follow canonical planet numbering 1–8: {source_planets}")
    pariyaya_verse_section = re.search(
        r'<section[^>]*id="lanka-verses"[^>]*>(.*?)</section>',
        pariyaya,
        re.DOTALL,
    )
    if not pariyaya_verse_section:
        return fail("Dedicated pariyaya page is missing the verse-only archive")
    pariyaya_verses = []
    pariyaya_classifications = []
    for item in re.findall(r'<p class="lanka-verse">(.*?)</p>', pariyaya_verse_section.group(1), re.DOTALL):
        classification = re.search(r'<span class="lanka-classification">(.*?)</span>', item)
        clean_item = re.sub(r'<span class="lanka-classification">.*?</span>', '', item)
        pariyaya_verses.append(unescape(re.sub(r"<[^>]+>", "", clean_item)).strip())
        if classification:
            pariyaya_classifications.append(unescape(classification.group(1)).strip())
    if pariyaya_verses != EXPECTED_VERSES:
        return fail("Dedicated pariyaya page must preserve original lanka wording and order")
    expected_classifications = ["အပြင်မိတ်","အတွင်းမိတ်","အပြင်ရန်","အတွင်းရန်","အရှင်ဂြိုလ်","ကျွန်ဂြိုလ်ပေါင်း","ဓာတ်မိတ်","ဓာတ်ရန်"]
    if pariyaya_classifications != expected_classifications:
        return fail("Dedicated pariyaya page is missing or reorders the eight inline classifications")
    if re.search(r"<h[1-6]\b|<table\b|[၀-၉0-9]", pariyaya_verse_section.group(1)):
        return fail("Dedicated pariyaya verse archive must not contain headings, tables, or numbers")
    for term in source_terms:
        original_text = unescape(re.sub(r"<[^>]+>", "", term)).strip()
        if original_text not in pariyaya:
            return fail("A source pariyaya entry was changed or omitted")

    print("PASS: verse-only archive is identical on both graha pages")
    # The pariyaya profiles now keep color associations only in the dedicated comparison table.
    profile_color_terms = ("အရောင်", "ရောင်စုံ", "အနီရောင်", "အစိမ်းရောင်", "အဝါရောင်", "အပြာရောင်", "အနက်ရောင်", "ညစ်ပုပ်")
    planet_cards = re.findall(r'<article class="planet-card".*?</article>', pariyaya, re.DOTALL)
    if any(any(term in card for term in profile_color_terms) for card in planet_cards):
        return fail("Color associations must be removed from graha-pariyaya planet profiles")
    appearance = re.search(r'<section aria-labelledby="appearance-heading">(.*?)</section>', source, re.DOTALL)
    if not appearance or "U AYE MINN (2021)" not in appearance.group(1):
        return fail("Side-by-side current and U AYE MINN (2021) color comparison is missing")
    if appearance.group(1).count("<tr>") != 10:
        return fail("Expected nine graha color comparison rows")
    print("PASS: nine pariyaya cards, original wording, and explicit Ketu gap")
    return 0

if __name__ == "__main__":
    sys.exit(main())
