"use strict";
(() => {
  const START_YEAR = 1900;
  const END_YEAR = 2125;
  const months = {0:"ပထမဝါဆို",1:"တန်ခူး",2:"ကဆုန်",3:"နယုန်",4:"ဒုတိယဝါဆို",5:"ဝါခေါင်",6:"တော်သလင်း",7:"သီတင်းကျွတ်",8:"တန်ဆောင်မုန်း",9:"နတ်တော်",10:"ပြာသို",11:"တပို့တွဲ",12:"တပေါင်း",13:"နှောင်းတန်ခူး",14:"နှောင်းကဆုန်"};
  const phases = ["လဆန်း","လပြည့်","လဆုတ်","လကွယ်"];
  const weekdays = ["တနင်္ဂနွေ","တနင်္လာ","အင်္ဂါ","ဗုဒ္ဓဟူး","ကြာသပတေး","သောကြာ","စနေ"];
  const weekdayShort = ["နွေ","လာ","အင်္","ဗုဒ္ဓ","ကြာ","သော","စနေ"];
  const $ = id => document.getElementById(id);
  const digits = value => String(value).replace(/[0-9]/g, d => "၀၁၂၃၄၅၆၇၈၉"[Number(d)]);
  const today = new Date();
  let selected = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let viewYear = selected.getFullYear();
  let viewMonth = selected.getMonth();

  function isoDate(date) {
    return [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
  }
  function formatDate(date) {
    return digits(date.getFullYear()) + "-" + digits(String(date.getMonth()+1).padStart(2,"0")) + "-" + digits(String(date.getDate()).padStart(2,"0"));
  }
  function parseDate(value) {
    const v = value.trim().replace(/[၀-၉]/g, d => String("၀၁၂၃၄၅၆၇၈၉".indexOf(d)));
    let match;
    let parts = null;
    if ((match = v.match(/^(\d{1,2})\s*[,/.-]\s*(\d{1,2})\s*[,/.-]\s*(\d{4})$/))) {
      parts = {year:Number(match[3]), month:Number(match[2]), day:Number(match[1])};
    } else if ((match = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
      parts = {year:Number(match[1]), month:Number(match[2]), day:Number(match[3])};
    }
    if (!parts || parts.year < START_YEAR || parts.year > END_YEAR || parts.month < 1 || parts.month > 12 || parts.day < 1) return null;
    const date = new Date(parts.year, parts.month-1, parts.day);
    if (date.getFullYear() !== parts.year || date.getMonth() !== parts.month-1 || date.getDate() !== parts.day) return null;
    return date;
  }
  function monthShift(date, count) {
    const index = date.getUTCFullYear()*12 + date.getUTCMonth() + count;
    const year = Math.floor(index/12), month = ((index%12)+12)%12;
    const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year,month+1,0)).getUTCDate());
    return new Date(Date.UTC(year,month,day));
  }
  function difference(a,b) {
    const from = new Date(Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()));
    const to = new Date(Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()));
    const earlier = from <= to ? from : to, later = from <= to ? to : from;
    let years = later.getUTCFullYear()-earlier.getUTCFullYear();
    let cursor = monthShift(earlier, years*12);
    if (cursor > later) { years--; cursor = monthShift(earlier,years*12); }
    let months = (later.getUTCFullYear()-cursor.getUTCFullYear())*12 + later.getUTCMonth()-cursor.getUTCMonth();
    if (monthShift(cursor,months) > later) months--;
    const anchor = monthShift(cursor,months);
    return {years,months,days:Math.round((later-anchor)/86400000),total:Math.round((to-from)/86400000),direction:from.getTime()===to.getTime()?"တူညီသောနေ့":from<to?"ရှာဖွေသည့်နေ့သည် အနာဂတ်":"ရှာဖွေသည့်နေ့သည် အတိတ်"};
  }
  function toMyanmar(date) {
    const jdn = w2j(date.getFullYear(),date.getMonth()+1,date.getDate(),1);
    return {...j2m(jdn),jdn};
  }
  function updateDifference(date) {
    const current = new Date(); current.setHours(0,0,0,0);
    const gap = difference(current,date);
    $("dateDifference").textContent = digits(gap.years)+" နှစ် "+digits(gap.months)+" လ "+digits(gap.days)+" ရက်";
    $("totalDays").textContent = digits(Math.abs(gap.total))+" ရက်";
    $("direction").textContent = gap.direction;
  }
  function updateResult(date) {
    const result = toMyanmar(date);
    const month = months[result.mm] || "မြန်မာလ "+digits(result.mm);
    $("myanmarFullDate").textContent = digits(result.my)+" ခု · "+month+" · "+phases[result.mp]+" "+digits(result.fd)+" ရက်";
    $("myanmarYear").textContent = digits(result.my)+" ခု";
    $("myanmarMonth").textContent = month;
    $("moonPhase").textContent = phases[result.mp]+" "+digits(result.fd)+" ရက်";
    $("myanmarWeekday").textContent = weekdays[result.wd===0?6:result.wd-1] || "—";
    $("yearType").textContent = ["ရိုးရိုးနှစ်","ဝါငယ်ထပ်နှစ်","ဝါကြီးထပ်နှစ်"][result.myt] || "—";
    $("gregorianDate").textContent = formatDate(date);
    updateDifference(date);
  }
  function renderCalendar() {
    const gregorianMonths = ["ဇန်နဝါရီ","ဖေဖော်ဝါရီ","မတ်","ဧပြီ","မေ","ဇွန်","ဇူလိုင်","ဩဂုတ်","စက်တင်ဘာ","အောက်တိုဘာ","နိုဝင်ဘာ","ဒီဇင်ဘာ"];
    $("calendarTitle").textContent = gregorianMonths[viewMonth]+" "+digits(viewYear);
    const grid = $("calendarGrid");
    grid.replaceChildren();
    weekdayShort.forEach(day => {
      const cell = document.createElement("div");
      cell.className = "weekday"; cell.textContent = day; cell.setAttribute("role","columnheader"); grid.append(cell);
    });
    const first = new Date(viewYear,viewMonth,1).getDay();
    const count = new Date(viewYear,viewMonth+1,0).getDate();
    for (let i=0;i<first;i++) {
      const blank = document.createElement("div"); blank.className = "calendar-empty"; blank.setAttribute("role","presentation"); grid.append(blank);
    }
    for (let day=1;day<=count;day++) {
      const date = new Date(viewYear,viewMonth,day);
      const mm = toMyanmar(date);
      const button = document.createElement("button");
      button.type = "button"; button.className = "calendar-day"; button.setAttribute("role","gridcell"); button.dataset.date = isoDate(date);
      button.setAttribute("aria-label",formatDate(date)+" ၊ "+(months[mm.mm]||"မြန်မာလ")+" "+phases[mm.mp]+" "+mm.fd+" ရက်");
      if (date.toDateString() === selected.toDateString()) button.classList.add("selected");
      if (date.toDateString() === new Date().toDateString()) { button.classList.add("today"); button.setAttribute("aria-current","date"); }
      const gregorian = document.createElement("span"); gregorian.className = "gregorian"; gregorian.textContent = digits(day);
      const myanmar = document.createElement("span"); myanmar.className = "myanmar";
      myanmar.textContent = (months[mm.mm]||"")+" "+phases[mm.mp]+" "+digits(mm.fd);
      button.append(gregorian,myanmar);
      button.addEventListener("click",() => { window.location.href = "day.html?date=" + isoDate(date); });
      grid.append(button);
    }
    $("previousMonth").disabled = viewYear===START_YEAR && viewMonth===0;
    $("nextMonth").disabled = viewYear===END_YEAR && viewMonth===11;
  }
  function chooseDate(date) {
    selected = new Date(date.getFullYear(),date.getMonth(),date.getDate());
    viewYear = selected.getFullYear(); viewMonth = selected.getMonth();
    $("datePicker").value = isoDate(selected);
    $("dateText").value = [selected.getDate(),selected.getMonth()+1,selected.getFullYear()].join(",");
    $("errorMessage").textContent = "";
    updateResult(selected); renderCalendar();
  }
  function rejectDate(message) {
    $("errorMessage").textContent = message;
    $("datePicker").value = "";
    $("myanmarFullDate").textContent = "—";
    ["myanmarYear","myanmarMonth","moonPhase","myanmarWeekday","yearType","gregorianDate","dateDifference","totalDays","direction"].forEach(id => $(id).textContent="—");
  }
  $("todayLabel").textContent = formatDate(today);
  $("dateText").addEventListener("input",() => {
    if (!$("dateText").value.trim()) { rejectDate("ရက်၊ လ၊ နှစ်ကို 28,8,1986 ပုံစံဖြင့် ထည့်ပါ။"); return; }
    const date = parseDate($("dateText").value);
    if (!date) { rejectDate("ရက်စွဲမမှန်ကန်ပါ။ ၁၉၀၀ မှ ၂၁၂၅ အတွင်း ရက်စွဲကို ထည့်ပါ။"); return; }
    chooseDate(date);
  });
  $("datePicker").addEventListener("change",() => {
    if (!$("datePicker").value) return;
    const date = parseDate($("datePicker").value);
    if (!date) { rejectDate("ရက်စွဲမမှန်ကန်ပါ။ ၁၉၀၀ မှ ၂၁၂၅ အတွင်း ရက်စွဲကို ရွေးပါ။"); return; }
    chooseDate(date);
  });
  $("todayButton").addEventListener("click",() => {
    const now = new Date();
    if (now.getFullYear()<START_YEAR || now.getFullYear()>END_YEAR) { rejectDate("ယနေ့ရက်စွဲသည် ရှာဖွေနိုင်သောကာလအတွင်း မပါဝင်ပါ။"); return; }
    chooseDate(now);
  });
  $("previousMonth").addEventListener("click",() => {
    if (viewMonth===0) { viewYear--; viewMonth=11; } else viewMonth--;
    renderCalendar();
  });
  $("nextMonth").addEventListener("click",() => {
    if (viewMonth===11) { viewYear++; viewMonth=0; } else viewMonth++;
    renderCalendar();
  });
  const requestedDate = new URLSearchParams(window.location.search).get("date");
  chooseDate(requestedDate ? (parseDate(requestedDate) || selected) : selected);
})();