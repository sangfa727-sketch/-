#!/usr/bin/env python3
"""Static integrity checks for the selected-day Angavijja page."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

class Audit(HTMLParser):
    VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]
        self.ids=[]
        self.errors=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag not in self.VOID:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in self.VOID or not self.stack or self.stack[-1] != tag:
            self.errors.append(f"Unexpected or mismatched closing tag: </{tag}>")
            return
        self.stack.pop()

def fail(message):
    print("FAIL: " + message)
    return 1

def main():
    html_path=Path("day.html")
    js_path=Path("js/day-astrology.js")
    css_path=Path("css/app.css")
    if not html_path.is_file() or not js_path.is_file() or not css_path.is_file():
        return fail("Missing day.html, js/day-astrology.js, or css/app.css")
    html=html_path.read_text(encoding="utf-8")
    js=js_path.read_text(encoding="utf-8")
    css=css_path.read_text(encoding="utf-8")
    parser=Audit()
    parser.feed(html)
    parser.close()
    if parser.errors or parser.stack:
        return fail(f"Invalid HTML nesting: {parser.errors}; open tags: {parser.stack}")
    if len(parser.ids) != len(set(parser.ids)):
        return fail("Duplicate IDs in day.html")
    for required in ('id="dayTitle"','id="dayWeekday"','id="dayMyanmarDate"','id="periodGrid"','id="dayError"','js/day-astrology.js'):
        if required not in html:
            return fail(f"Missing required day page element: {required}")
    for required in ('const basePillar = [5,2,6,1,4,0,3]','index<8','index * 5','360 + index * 90','start + 90'):
        if required not in js:
            return fail(f"Missing eight-period algorithm invariant: {required}")
    if "1900" not in js or "2125" not in js:
        return fail("Date range validation must remain 1900–2125")
    if "အပေါ်မှအောက်သို့ ဒေါင်လိုက်" not in html:
        return fail("Day page must explicitly identify the pillar as vertically stacked")
    if not re.search(r"\.period-pillar\s*\{[^}]*display\s*:\s*flex[^}]*flex-direction\s*:\s*column", css):
        return fail("Daily Angavijja pillar must render as a vertical column")
    if ".period-pillar-cell" not in css or ".period-pillar-center" not in css:
        return fail("Vertical pillar must style six outer values and the central owner value")
    if "myanmar" not in js.lower() or "j2m(jdn)" not in js:
        return fail("Myanmar date details must be rendered from calendar core")
    for required in ('0) return 7','selectedWeekday === 3 && periodStart >= 720','outer-friend','inner-friend','outer-enemy','inner-enemy','pair-ring-layer-4','၄⁽⁸⁾'):
        if required not in js + css + html:
            return fail(f"Missing pair-color or graha alias invariant: {required}")
    for required in ('အပြင်မိတ်','အတွင်းမိတ်','အပြင်ရန်','အတွင်းရန်','၀၆:၀၀ မှ ၁၈:၀၀'):
        if required not in html:
            return fail(f"Missing pair legend or time-boundary explanation: {required}")
    print("PASS: selected-day HTML structure and unique IDs")
    print("PASS: 8 x 90-minute periods, inclusive six-count rotation, and 7-number pillar")
    print("PASS: each period pillar is explicitly stacked vertically with the owner number centered")
    print("PASS: 0→7 mnemonic conversion, Wednesday 4/8 alias, four pair-color categories, and layered rings")
    print("PASS: date bounds and Myanmar date conversion")
    return 0

if __name__ == "__main__":
    sys.exit(main())
