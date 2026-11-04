"use strict";
(() => {
  const START_YEAR = 1900;
  const END_YEAR = 2125;
  const weekdays = ["တနင်္ဂနွေ","တနင်္လာ","အင်္ဂါ","ဗုဒ္ဓဟူး","ကြာသပတေး","သောကြာ","စနေ"];
  const weekdayNumbers = [1,2,3,4,5,6,7];
  const basePillar = [5,2,6,1,4,0,3];
  const monthNames = {0:"ပထမဝါဆို",1:"တန်ခူး",2:"ကဆုန်",3:"နယုန်",4:"ဒုတိယဝါဆို",5:"ဝါခေါင်",6:"တော်သလင်း",7:"သီတင်းကျွတ်",8:"တန်ဆောင်မုန်း",9:"နတ်တော်",10:"ပြာသို",11:"တပို့တွဲ",12:"တပေါင်း",13:"နှောင်းတန်ခူး",14:"နှောင်းကဆုန်"};
  const phases = ["လဆန်း","လပြည့်","လဆုတ်","လကွယ်"];
  const digitMap = "၀၁၂၃၄၅၆၇၈၉";
  const toMyanmarDigits = value => String(value).replace(/[0-9]/g, d => digitMap[Number(d)]);
  const params = new URLSearchParams(window.location.search);
  const rawDate = params.get("date") || "";
  const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dateParts = match && match.slice(1).map(Number);
  const date = dateParts ? new Date(dateParts[0], dateParts[1]-1, dateParts[2]) : null;
  const valid = !!date && dateParts[0] >= START_YEAR && dateParts[0] <= END_YEAR &&
    date.getFullYear() === dateParts[0] && date.getMonth() === dateParts[1]-1 && date.getDate() === dateParts[2];
  const error = document.getElementById("dayError");
  const grid = document.getElementById("periodGrid");
  const formatDate = d => toMyanmarDigits(d.getDate()) + " " + ["ဇန်နဝါရီ","ဖေဖော်ဝါရီ","မတ်","ဧပြီ","မေ","ဇွန်","ဇူလိုင်","ဩဂုတ်","စက်တင်ဘာ","အောက်တိုဘာ","နိုဝင်ဘာ","ဒီဇင်ဘာ"][d.getMonth()] + " " + toMyanmarDigits(d.getFullYear());
  function formatTime(totalMinutes) {
    const hour24 = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const period = hour24 < 12 ? "နံနက်" : hour24 < 16 ? "နေ့" : "ညနေ";
    const hour12 = hour24 % 12 || 12;
    return period + " " + toMyanmarDigits(hour12) + ":" + toMyanmarDigits(String(minute).padStart(2,"0"));
  }
  function makePillar(ownerIndex) {
    return basePillar.map(value => (value + ownerIndex) % 7);
  }
  function renderPillar(values, ownerIndex) {
    const chart = document.createElement("div");
    chart.className = "period-pillar";
    chart.setAttribute("aria-label", weekdays[ownerIndex] + " အင်္ဂဝိဇ္ဇာတိုင်");
    values.forEach((value, index) => {
      if (index === 3) {
        const ruleTop = document.createElement("div");
        ruleTop.className = "period-pillar-rule";
        chart.append(ruleTop);
        const center = document.createElement("div");
        center.className = "period-pillar-center";
        const number = document.createElement("strong");
        number.textContent = toMyanmarDigits(value);
        const label = document.createElement("span");
        label.textContent = weekdays[ownerIndex] + " နံ";
        center.append(number,label);
        chart.append(center);
        const ruleBottom = document.createElement("div");
        ruleBottom.className = "period-pillar-rule";
        chart.append(ruleBottom);
      } else {
        const cell = document.createElement("div");
        cell.className = "period-pillar-cell";
        cell.textContent = toMyanmarDigits(value);
        chart.append(cell);
      }
    });
    return chart;
  }
  if (!valid) {
    error.hidden = false;
    document.getElementById("dayTitle").textContent = "ရက်စွဲမရရှိပါ";
    document.getElementById("periodTitle").textContent = "အင်္ဂဝိဇ္ဇာ အခါ ၈ ပါး";
    grid.hidden = true;
    return;
  }
  const startIndex = date.getDay();
  const jdn = w2j(date.getFullYear(), date.getMonth()+1, date.getDate(), 1);
  const myanmar = j2m(jdn);
  document.getElementById("dayTitle").textContent = formatDate(date);
  document.getElementById("dayWeekday").textContent = weekdays[startIndex] + " နေ့";
  document.getElementById("dayMyanmarDate").textContent =
    toMyanmarDigits(myanmar.my) + " ခု · " + (monthNames[myanmar.mm] || "မြန်မာလ") +
    " · " + phases[myanmar.mp] + " " + toMyanmarDigits(myanmar.fd) + " ရက်";
  document.getElementById("calendarBack").href = "calendar.html?date=" + rawDate;
  for (let index=0; index<8; index++) {
    // Inclusive six-count: the current owner is count 1, so the next owner is +5 modulo 7.
    // This guarantees period 8 returns to the selected weekday.
    const ownerIndex = (startIndex + index * 5) % 7;
    const start = 360 + index * 90;
    const end = start + 90;
    const card = document.createElement("article");
    card.className = "period-card";
    card.dataset.period = String(index+1);
    card.dataset.ownerIndex = String(ownerIndex);
    const heading = document.createElement("div");
    heading.className = "period-card-heading";
    const periodName = document.createElement("span");
    periodName.className = "period-number";
    periodName.textContent = "အခါ " + toMyanmarDigits(index+1);
    const time = document.createElement("strong");
    time.className = "period-time";
    time.textContent = formatTime(start) + " မှ " + formatTime(end);
    heading.append(periodName,time);
    const owner = document.createElement("p");
    owner.className = "period-owner";
    owner.textContent = weekdays[ownerIndex] + " နံ · ကိန်း " + toMyanmarDigits(weekdayNumbers[ownerIndex]);
    card.append(heading,owner,renderPillar(makePillar(ownerIndex),ownerIndex));
    grid.append(card);
  }
})();