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

  const classificationSets = {
    native: { label:"နဂိုရ်ဂြိုဟ်", verse:"အင်တူလက်မျှ နဂိုရ်ပ", values:[1,0,4,5] },
    temporary: { label:"ယာယီဂြိုဟ်", verse:"ခြေစွပ်သိမ်းယူ ယာယီယူ", values:[2,3,6,8] },
    master: { label:"အရှင်ဂြိုဟ် (အကြီး)", verse:"ကြိုင်း လောင်း မြဲ သို", values:[2,4,5,6] },
    servant: { label:"ကျွန်ဂြိုဟ် (အငယ်)", verse:"အ စ နံ ရောင်း", values:[1,3,0,8] }
  };
  const genderVerses = {
    male:"အောင်၊ ဆု၊ လည်း၊ ပွား — ဂြိုဟ် ယောက်ျား",
    female:"ခြေ၊ သွား၊ ထိန်း၊ ရ — ဂြိုဟ် မိန်းမ"
  };
  const truthVerses = [
    { label:"မှန်စကား", verse:"အုတ် ခြစ် စံ ထား မှန်စကား" },
    { label:"စကားမမှန်ရာ", verse:"ကျွန် မ သား စကားမမှန်ရာ" }
  ];
  const purchaseVerses = [
    { label:"မဝယ်ကောင်း", verse:"အောင် ကျော် ဇံ လောင်း မဝယ်ကောင်း" },
    { label:"ဝယ်ရန်", verse:"လွမ်း ပု သာ ဝယ်ပါလေ" }
  ];
  const elementCategories = [
    { label:"ဓာတ်မိတ်", verse:"အန္တော ဂဗ္ဘေ စရေ ဝံသေ", pairs:["17","25","38","46"] },
    { label:"ဓာတ်ရန်", verse:"ဦးဝေ စံကူး ရေးဗူး တောသူ", pairs:["14","32","85","76"] }
  ];
  const planetNames = ["တနင်္ဂနွေ","တနင်္လာ","အင်္ဂါ","ဗုဒ္ဓဟူး","ကြာသပတေး","သောကြာ","စနေ","ရာဟု"];
  const malePlanetNumbers = new Set([1,3,4,5]);
  const femalePlanetNumbers = new Set([2,6,7,8]);
  function getClassificationNumber(value, selectedWeekday, periodStart) {
    if (value === 4 && selectedWeekday === 3 && periodStart >= 720) return 8;
    return value;
  }
  function matchingPairs(values, pairs, selectedWeekday, periodStart, useMnemonicAlias) {
    const numbers = values.map(value => useMnemonicAlias
      ? getEffectiveNumber(value, selectedWeekday, periodStart)
      : getClassificationNumber(value, selectedWeekday, periodStart));
    return pairs.filter(pair => {
      const first = Number(pair[0]), second = Number(pair[1]);
      const firstIndex = numbers.indexOf(first);
      return firstIndex !== -1 && numbers.findIndex((n,index) => n === second && index !== firstIndex) !== -1;
    });
  }
  function addLankaRow(container, label, verse, result) {
    const row = document.createElement("div");
    row.className = "period-lanka-row";
    const heading = document.createElement("strong");
    heading.textContent = label;
    const verseText = document.createElement("span");
    verseText.className = "period-lanka-verse";
    verseText.textContent = verse;
    const outcome = document.createElement("span");
    outcome.className = "period-lanka-result";
    outcome.textContent = result;
    row.append(heading,verseText,outcome);
    container.append(row);
  }
  function formatValues(values) {
    return values.length ? values.map(toMyanmarDigits).join("၊ ") : "မတွေ့ပါ";
  }
  function renderLankaDetails(values, ownerIndex, selectedWeekday, periodStart) {
    const details = document.createElement("section");
    details.className = "period-lanka-details";
    const heading = document.createElement("h3");
    heading.className = "period-lanka-title";
    heading.textContent = "မူရင်းလင်္ကာနှင့် ဂြိုဟ်ခွဲခြားချက်များ";
    details.append(heading);

    const ownerNumber = getClassificationNumber(ownerIndex + 1, selectedWeekday, periodStart);
    const gender = malePlanetNumbers.has(ownerNumber) ? "ယောက်ျားဂြိုဟ်"
      : femalePlanetNumbers.has(ownerNumber) ? "မိန်းမဂြိုဟ်" : "မူရင်းတွင် မသတ်မှတ်ထား";
    const genderResult = planetNames[ownerNumber - 1]
      ? planetNames[ownerNumber - 1] + "ဂြိုဟ် — " + gender
      : gender;
    addLankaRow(details,"ကျား / မ ဂြိုဟ်",genderVerses.male + " · " + genderVerses.female,genderResult);

    const classNumbers = values.map(value => getClassificationNumber(value,selectedWeekday,periodStart));
    addLankaRow(details,"နဂိုရ် / ယာယီ ဂြိုဟ်",classificationSets.native.verse + " · " + classificationSets.temporary.verse,
      "နဂိုရ် " + formatValues(values.filter((v,i) => classificationSets.native.values.includes(classNumbers[i]))) +
      "  |  ယာယီ " + formatValues(values.filter((v,i) => classificationSets.temporary.values.includes(classNumbers[i]))));
    addLankaRow(details,"အရှင် / ကျွန် ဂြိုဟ်",classificationSets.master.verse + " · " + classificationSets.servant.verse,
      "အရှင် " + formatValues(values.filter((v,i) => classificationSets.master.values.includes(classNumbers[i]))) +
      "  |  ကျွန် " + formatValues(values.filter((v,i) => classificationSets.servant.values.includes(classNumbers[i]))));

    const friendEnemy = [
      {id:"outer-friend",label:"အပြင်မိတ်",verse:"အောင်ပ ကုလား ဆွေသား နှောင်ရင်း",pairs:["15","24","36","78"]},
      {id:"inner-friend",label:"အတွင်းမိတ်",verse:"ဦးသာ စိန်ပန်း ဒန်းလှ ကိုရှာ",pairs:["16","35","74","23"]},
      {id:"outer-enemy",label:"အပြင်ရန်",verse:"ဦးညို ခေမာ သုတ ဝေရီ",pairs:["13","25","67","48"]},
      {id:"inner-enemy",label:"အတွင်းရန်",verse:"ဓမ္မာ သောက အင်းဝ ရာဇာ",pairs:["75","62","14","83"]}
    ];
    friendEnemy.forEach(category => {
      const found = matchingPairs(values,category.pairs,selectedWeekday,periodStart,true);
      addLankaRow(details,category.label,category.verse,
        found.length ? "ကိုက်ညီသော ကိန်းတွဲ " + found.join("၊ ") : "ဤတိုင်တွင် ကိုက်ညီသော ကိန်းတွဲ မတွေ့ပါ");
    });
    elementCategories.forEach(category => {
      const found = matchingPairs(values,category.pairs,selectedWeekday,periodStart,true);
      addLankaRow(details,category.label,category.verse,
        found.length ? "ကိုက်ညီသော ကိန်းတွဲ " + found.join("၊ ") : "ဤတိုင်တွင် ကိုက်ညီသော ကိန်းတွဲ မတွေ့ပါ");
    });
    truthVerses.forEach(item => addLankaRow(details,item.label,item.verse,"မူရင်း HTML တွင် ကိန်းဂဏန်းသတ်မှတ်ချက် မဖော်ပြထားပါ"));
    purchaseVerses.forEach(item => addLankaRow(details,item.label,item.verse,"မူရင်း HTML တွင် ကိန်းဂဏန်းသတ်မှတ်ချက် မဖော်ပြထားပါ"));
    const note = document.createElement("p");
    note.className = "period-lanka-note";
    note.textContent = "မှတ်ချက် — လင်္ကာကိန်းတွဲများကို မူရင်းကိန်းနှင့် ၀→၇ မိတ်/ရန်ပြောင်းလဲမှုကို သီးခြားလိုက်နာ၍ စစ်ဆေးထားသည်။ ဗုဒ္ဓဟူးနေ့ နေ့လယ် ၁၂ နာရီနောက်ပိုင်း ၄⁽၈⁾ ကို ၈ အဖြစ် သတ်မှတ်ထားသည်။ ကိန်းမဖော်ပြထားသော လင်္ကာများကို အဖြေမခန့်မှန်းဘဲ မူရင်းအတိုင်းသာ ပြထားသည်။";
    details.append(note);
    return details;
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
    const pillarValues = makePillar(ownerIndex);
    card.append(heading,owner,renderPillar(pillarValues,ownerIndex,startIndex,start));
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "period-lanka-toggle";
    toggle.textContent = "လင်္ကာနှင့် ခွဲခြားချက်များ ကြည့်ရန်";
    toggle.setAttribute("aria-expanded","false");
    const detailId = "period-lanka-" + (index + 1);
    toggle.setAttribute("aria-controls",detailId);
    const detailPanel = renderLankaDetails(pillarValues,ownerIndex,startIndex,start);
    detailPanel.id = detailId;
    detailPanel.hidden = true;
    toggle.addEventListener("click",() => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded",String(!isOpen));
      detailPanel.hidden = isOpen;
      toggle.textContent = isOpen ? "လင်္ကာနှင့် ခွဲခြားချက်များ ကြည့်ရန်" : "လင်္ကာနှင့် ခွဲခြားချက်များ ဖျောက်ရန်";
    });
    card.append(toggle,detailPanel);
    grid.append(card);
  }
})();