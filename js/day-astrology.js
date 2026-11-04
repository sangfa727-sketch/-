"use strict";
(() => {
  const START_YEAR = 1900;
  const END_YEAR = 2125;
  const weekdays = ["တနင်္ဂနွေ","တနင်္လာ","အင်္ဂါ","ဗုဒ္ဓဟူး","ကြာသပတေး","သောကြာ","စနေ"];
  const weekdayNumbers = [1,2,3,4,5,6,7];
  const basePillar = [5,2,6,1,4,0,3];
  const pairCategories = [
    { id:"outer-friend", label:"အပြင်မိတ်", pairs:["15","24","36","78"] },
    { id:"inner-friend", label:"အတွင်းမိတ်", pairs:["16","35","74","23"] },
    { id:"outer-enemy", label:"အပြင်ရန်", pairs:["13","25","67","48"] },
    { id:"inner-enemy", label:"အတွင်းရန်", pairs:["75","62","14","83"] }
  ];
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
  function getEffectiveNumber(value, selectedWeekday, periodStart) {
    if (value === 0) return 7;
    if (value === 4 && selectedWeekday === 3 && periodStart >= 720) return 8;
    return value;
  }
  function getPairMarks(values, selectedWeekday, periodStart) {
    const effective = values.map(value => getEffectiveNumber(value, selectedWeekday, periodStart));
    const marks = values.map(() => new Set());
    const activeCategories = [];
    pairCategories.forEach(category => {
      let categoryActive = false;
      category.pairs.forEach(pair => {
        const first = Number(pair[0]);
        const second = Number(pair[1]);
        const firstIndex = effective.findIndex(value => value === first);
        const secondIndex = effective.findIndex((value, index) => value === second && index !== firstIndex);
        if (firstIndex !== -1 && secondIndex !== -1) {
          marks[firstIndex].add(category.id);
          marks[secondIndex].add(category.id);
          categoryActive = true;
        }
      });
      if (categoryActive) activeCategories.push(category);
    });
    return { marks, activeCategories, effective };
  }
  function renderNumber(value, index, markIds, effectiveValue) {
    const cell = document.createElement("div");
    cell.className = index === 3 ? "period-pillar-center" : "period-pillar-cell";
    const badge = document.createElement("span");
    badge.className = "pillar-number";
    const number = document.createElement("strong");
    number.className = "pillar-number-value";
    number.textContent = toMyanmarDigits(value);
    badge.append(number);
    if (effectiveValue === 8 && value === 4) {
      const alias = document.createElement("sup");
      alias.className = "pillar-number-alias";
      alias.textContent = "၈";
      alias.setAttribute("aria-label", "ရာဟု ၈");
      badge.append(alias);
      badge.dataset.effectiveNumber = "8";
    } else {
      badge.dataset.effectiveNumber = String(effectiveValue);
    }
    markIds.forEach((id, layer) => {
      const ring = document.createElement("span");
      ring.className = "pair-ring pair-ring--" + id + " pair-ring-layer-" + (layer + 1);
      ring.setAttribute("aria-hidden", "true");
      badge.append(ring);
    });
    cell.append(badge);
    return cell;
  }
  function renderPillar(values, ownerIndex, selectedWeekday, periodStart) {
    const chart = document.createElement("div");
    chart.className = "period-pillar";
    chart.setAttribute("aria-label", weekdays[ownerIndex] + " အင်္ဂဝိဇ္ဇာတိုင်");
    const { marks, activeCategories, effective } = getPairMarks(values, selectedWeekday, periodStart);
    values.forEach((value, index) => {
      if (index === 3) {
        const ruleTop = document.createElement("div");
        ruleTop.className = "period-pillar-rule";
        chart.append(ruleTop);
      }
      const cell = renderNumber(value, index, [...marks[index]], effective[index]);
      if (index === 3) {
        const label = document.createElement("span");
        label.className = "period-pillar-owner-label";
        label.textContent = weekdays[ownerIndex] + " နံ";
        cell.append(label);
      }
      chart.append(cell);
      if (index === 3) {
        const ruleBottom = document.createElement("div");
        ruleBottom.className = "period-pillar-rule";
        chart.append(ruleBottom);
      }
    });
    const legend = document.createElement("div");
    legend.className = "period-pillar-legend";
    legend.setAttribute("aria-label", "စက်ဝိုင်းအရောင် အဓိပ္ပာယ်");
    if (activeCategories.length) {
      activeCategories.forEach(category => {
        const item = document.createElement("span");
        item.className = "pair-legend-item";
        item.dataset.category = category.id;
        const swatch = document.createElement("span");
        swatch.className = "pair-legend-swatch pair-legend-swatch--" + category.id;
        swatch.setAttribute("aria-hidden", "true");
        const text = document.createElement("span");
        text.textContent = category.label;
        item.append(swatch,text);
        legend.append(item);
      });
    } else {
      legend.textContent = "သက်ဆိုင်သော မိတ်/ရန်အတွဲ မတွေ့ပါ";
    }
    const wrapper = document.createElement("div");
    wrapper.className = "period-pillar-wrap";
    wrapper.append(chart,legend);
    return wrapper;
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
    card.append(heading,owner,renderPillar(makePillar(ownerIndex),ownerIndex,startIndex,start));
    grid.append(card);
  }
})();