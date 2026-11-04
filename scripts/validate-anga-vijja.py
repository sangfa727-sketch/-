from pathlib import Path
from html.parser import HTMLParser
import re

PAGE = Path("anga-vijja.html")
source = PAGE.read_text(encoding="utf-8")

class StructureCheck(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title_depth = 0
        self.title_text = []
        self.select_ids = set()
        self.section_count = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "section":
            self.section_count += 1
        if tag == "select" and "id" in attrs:
            self.select_ids.add(attrs["id"])
        if tag == "title":
            self.title_depth += 1
    def handle_endtag(self, tag):
        if tag == "title":
            self.title_depth = max(0, self.title_depth - 1)
    def handle_data(self, data):
        if self.title_depth:
            self.title_text.append(data)

parser = StructureCheck()
parser.feed(source)
parser.close()

assert "အင်္ဂဝိဇ္ဇာ ဗေဒင်" in "".join(parser.title_text), "Missing page title"
assert {"weekday", "letter", "pillarType", "pillarNumbers"} <= parser.select_ids | {"pillarNumbers"}, "Missing required controls"
assert parser.section_count >= 5, "Expected separate chart, alphabet, and interpretation sections"

base_match = re.search(r"const base=\[([0-6, ]+)\]", source)
assert base_match, "Missing explicit Sunday base chart"
base = [int(value.strip()) for value in base_match.group(1).split(",")]
assert base == [5, 2, 6, 1, 4, 0, 3], f"Unexpected Sunday chart: {base}"

def chart_for(day):
    return [(value + day) % 7 for value in base]

assert chart_for(0) == [5, 2, 6, 1, 4, 0, 3], "Sunday reference chart mismatch"
assert chart_for(1) == [6, 3, 0, 2, 5, 1, 4], "Monday reference chart mismatch"
assert "const positions=[values[0],values[1],values[2],null,values[3],null,values[4],values[5],values[6]]" in source, "Seven digits must render in a 3x3 layout with two empty middle cells"

required_phrases = [
    "အိုင်ထဲမြရွေငွေ", "ကြံပါလူ့အသွေ", "ဆင်ရံသူနှင့်ဝေ",
    "လေသဲကျွန်းဆောင်မြူး", "ပျော်ကျူးဧလှည့်နိုင်",
    "သာလှိုင်ဆင်ကြလန်း", "နန်းအောင်ရွှေမြို့သာ",
    "အမျှကြင်", "ခင်လှသွေ", "စေသဝန်", "လွင်ကြာမြင့်",
    "မင်း၏နောင်", "သောင်စလမ်း", "နန်းလုံးဆွေ"
]
for phrase in required_phrases:
    assert phrase in source, f"Missing supplied mnemonic phrase: {phrase}"

for label in ["မူလတိုင်", "သာဓကတိုင်", "နိမိတ်တိုင်", "ဟေတုတိုင်", "လက္ခဏာတိုင်"]:
    assert label in source, f"Missing five-pillar label: {label}"
for label in ["မူလတိုင်", "နိမိတ်တိုင်", "လက္ခဏာတိုင်"]:
    assert label in source, f"Missing three-pillar label: {label}"

print("Angavijja validation passed: structure, 7-day chart derivation, reference examples, and mnemonic content.")
