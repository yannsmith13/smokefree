document.addEventListener("DOMContentLoaded", () => {
  /* ============================================================
     Utils
  ============================================================ */
  const pad2 = (n) => String(n).padStart(2, "0");
  const euro = (n) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function diffDays(a, b) {
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
  }
  function addDays(d, days) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }
  function addMonths(d, months) {
    const x = new Date(d);
    const day = x.getDate();
    x.setMonth(x.getMonth() + months);
    while (x.getDate() !== day) x.setDate(x.getDate() - 1);
    return x;
  }
  function addYears(d, years) {
    const x = new Date(d);
    const m = x.getMonth();
    x.setFullYear(x.getFullYear() + years);
    // 29 février etc.
    if (x.getMonth() !== m) x.setDate(0);
    return x;
  }
  function fmtDateFR(d) {
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  function fmtMonthFR(d) {
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  // ✅ include quit day as day 1 saved
  function savedDaysOnDate(quit, date) {
    const d = startOfDay(date);
    if (d < quit) return 0;
    return diffDays(quit, d) + 1;
  }

  /* ============================================================
     Storage
  ============================================================ */
  const KEY = "smokefree_v1";

  function loadState() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    // default = today
    const t = new Date();
    return {
      quitDate: `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`,
      dailyRate: 13,
    };
  }

  function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  /* ============================================================
     Milestones (list + calendar chips)
  ============================================================ */
  function buildMilestones(quit) {
    const m = [];
    const push = (name, date) => m.push({ name, date: startOfDay(date) });

    push("1 semaine", addDays(quit, 7));
    push("2 semaines", addDays(quit, 14));
    push("3 semaines", addDays(quit, 21));
    push("1 mois", addMonths(quit, 1));
    push("2 mois", addMonths(quit, 2));
    push("3 mois", addMonths(quit, 3));
    push("6 mois", addMonths(quit, 6));
    push("1 an", addYears(quit, 1));
    for (let y = 2; y <= 10; y++) push(`${y} ans`, addYears(quit, y));

    m.sort((a, b) => a.date - b.date);
    return m;
  }

  function nextMilestone(milestones, today) {
    return milestones.find((x) => x.date >= today) || null;
  }

  /* ============================================================
     Badges fun (fixed list)
  ============================================================ */
  function getBadges(totalToday, savedDaysToday) {
    const defs = [
      { type: "days", value: 7, name: "Premiers Pas", emoji: "🌱" },
      { type: "money", value: 50, name: "Économe", emoji: "💰" },
      { type: "days", value: 21, name: "Cap des 21", emoji: "🔥" },
      { type: "money", value: 100, name: "Maîtrise", emoji: "🧠" },
      { type: "money", value: 250, name: "Résistant", emoji: "💪" },
      { type: "money", value: 500, name: "Déterminé", emoji: "🥇" },
      { type: "money", value: 1000, name: "Boss", emoji: "🏆" },
      { type: "money", value: 2000, name: "Légende", emoji: "👑" },
      { type: "money", value: 5000, name: "Titan", emoji: "🚀" },
      { type: "money", value: 10000, name: "Immortel", emoji: "🌌" },
    ];

    return defs.map((b) => {
      const on = b.type === "days" ? savedDaysToday >= b.value : totalToday >= b.value;
      const label = b.type === "days" ? `${b.value} jours` : euro(b.value);
      return { t: b.name, e: b.emoji, type: b.type, at: b.value, label, on };
    });
  }

  /* ============================================================
     Toast
  ============================================================ */
  const toast = document.getElementById("toast");
  let toastTimer = null;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  /* ============================================================
     Calendar
  ============================================================ */
  const calendarEl = document.getElementById("calendar");
  const monthTitleEl = document.getElementById("monthTitle");

  const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  function buildCalendar(viewDate, quit, today, milestones, dailyRate) {
    if (!calendarEl || !monthTitleEl) return;

    calendarEl.innerHTML = "";

    // header dow
    for (const w of DOW) {
      const d = document.createElement("div");
      d.className = "dow";
      d.textContent = w;
      calendarEl.appendChild(d);
    }

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    monthTitleEl.textContent = fmtMonthFR(new Date(year, month, 1));

    const first = new Date(year, month, 1);
    const firstDow = (first.getDay() + 6) % 7; // monday-based
    const start = addDays(first, -firstDow);

    // map milestones by date key
    const milestoneMap = new Map();
    for (const ms of milestones) {
      const k = `${ms.date.getFullYear()}-${ms.date.getMonth()}-${ms.date.getDate()}`;
      if (!milestoneMap.has(k)) milestoneMap.set(k, []);
      milestoneMap.get(k).push(ms);
    }

    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const sd = startOfDay(d);

      const cell = document.createElement("div");
      cell.className = "day";

      if (d.getMonth() !== month) cell.classList.add("off");

      const isToday = sd.getTime() === today.getTime();
      const isOnOrAfterQuit = sd >= quit;
      const isOnOrBeforeToday = sd <= today;
      const isClean = isOnOrAfterQuit && isOnOrBeforeToday;

      // number
      const num = document.createElement("div");
      num.className = "num";
      num.textContent = d.getDate();
      cell.appendChild(num);

      // money (projection included)
      const saved = savedDaysOnDate(quit, sd);
      const moneyEl = document.createElement("div");
      moneyEl.className = "money";

      if (saved > 0) {
        moneyEl.textContent = euro(saved * Number(dailyRate || 0));
        if (sd < today) moneyEl.classList.add("past");
        else if (isToday) moneyEl.classList.add("today");
        else moneyEl.classList.add("future");
      }
      cell.appendChild(moneyEl);

      const chips = document.createElement("div");
      chips.className = "chips";

      if (isToday) {
        const chip = document.createElement("div");
        chip.className = "chip warn";
        chip.textContent = "⭐ Aujourd’hui";
        chips.appendChild(chip);
      }

      if (isClean) {
        const chip = document.createElement("div");
        chip.className = "chip good";
        chip.textContent = "✅ Jour clean";
        chips.appendChild(chip);
      }

      const key = `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}`;
      const msHere = milestoneMap.get(key);
      if (msHere?.length) {
        for (const ms of msHere) {
          const chip = document.createElement("div");
          chip.className = "chip accent";
          chip.textContent = `🏁 ${ms.name}`;
          chips.appendChild(chip);
        }
      }

      cell.appendChild(chips);
      calendarEl.appendChild(cell);
    }
  }

  /* ============================================================
     Elements
  ============================================================ */
  const els = {
    streakDays: document.getElementById("streakDays"),
    totalEuros: document.getElementById("totalEuros"),

    sinceText: document.getElementById("sinceText"),
    sinceDetail: document.getElementById("sinceDetail"),

    kpiDays: document.getElementById("kpiDays"),
    kpiDaysSub: document.getElementById("kpiDaysSub"),
    kpiRate: document.getElementById("kpiRate"),
    kpiTotal: document.getElementById("kpiTotal"),
    kpiTotalSub: document.getElementById("kpiTotalSub"),

    nextMilestoneName: document.getElementById("nextMilestoneName"),
    nextMilestoneWhen: document.getElementById("nextMilestoneWhen"),
    progressBar: document.getElementById("progressBar"),
    progressText: document.getElementById("progressText"),
    nextMilestoneGain: document.getElementById("nextMilestoneGain"),

    quitDate: document.getElementById("quitDate"),
    dailyRate: document.getElementById("dailyRate"),

    milestoneList: document.getElementById("milestoneList"),

    badgeRow: document.getElementById("badgeRow"),
  };

  let state = loadState();
  let viewDate = new Date(); // month navigation

  /* ============================================================
     Render
  ============================================================ */
  function render() {
    const quit = startOfDay(new Date(state.quitDate + "T00:00:00"));
    const today = startOfDay(new Date());
    const rate = Number(state.dailyRate || 0);

    const days = savedDaysOnDate(quit, today);
    const total = days * rate;

    if (els.streakDays) els.streakDays.textContent = days;
    if (els.totalEuros) els.totalEuros.textContent = euro(total);

    if (els.sinceText) els.sinceText.textContent = `${days} jour${days > 1 ? "s" : ""} sans fumer`;
    if (els.sinceDetail) els.sinceDetail.textContent = `Arrêt le ${fmtDateFR(quit)} • Aujourd’hui le ${fmtDateFR(today)}`;

    if (els.kpiDays) els.kpiDays.textContent = days;
    if (els.kpiDaysSub) els.kpiDaysSub.textContent = "Continue comme ça 👊";
    if (els.kpiRate) els.kpiRate.textContent = euro(rate).replace(",00", "");
    if (els.kpiTotal) els.kpiTotal.textContent = euro(total);
    if (els.kpiTotalSub) els.kpiTotalSub.textContent = `≈ ${euro(rate * 7)} / semaine`;

    const milestones = buildMilestones(quit);
    const nxt = nextMilestone(milestones, today);

    if (nxt) {
      const remaining = diffDays(today, nxt.date);
      const totalSpan = Math.max(1, diffDays(quit, nxt.date) + 1);
      const doneSpan = Math.max(0, Math.min(totalSpan, diffDays(quit, today) + 1));
      const pct = Math.max(0, Math.min(100, (doneSpan / totalSpan) * 100));

      if (els.nextMilestoneName) els.nextMilestoneName.textContent = nxt.name;
      if (els.nextMilestoneWhen) {
        els.nextMilestoneWhen.textContent =
          remaining === 0 ? `C’est aujourd’hui ! (${fmtDateFR(nxt.date)})` : `Dans ${remaining} j (${fmtDateFR(nxt.date)})`;
      }
      if (els.progressBar) els.progressBar.style.width = pct.toFixed(1) + "%";
      if (els.progressText) els.progressText.textContent = `${doneSpan} / ${totalSpan} jours`;
      if (els.nextMilestoneGain) els.nextMilestoneGain.textContent = euro(Math.max(0, remaining) * rate);
    }

    // Milestone list with money at milestone date
    if (els.milestoneList) {
      els.milestoneList.innerHTML = "";
      for (const ms of milestones) {
        const msDays = savedDaysOnDate(quit, ms.date);
        const msTotal = msDays * rate;

        const isPast = ms.date < today;
        const isToday = ms.date.getTime() === today.getTime();
        let status = isPast ? "Accompli" : isToday ? "Aujourd’hui !" : `Dans ${diffDays(today, ms.date)} j`;

        const row = document.createElement("div");
        row.className = "pill";
        row.style.justifyContent = "space-between";
        row.style.width = "100%";

        const left = document.createElement("span");
        left.innerHTML = `${isPast ? "✅" : isToday ? "🏁" : "⏳"} <strong>${ms.name}</strong> <span class="muted">— ${fmtDateFR(ms.date)}</span>`;

        const right = document.createElement("span");
        right.className = "muted";
        right.innerHTML = `<strong style="color:rgba(255,255,255,.92)">${euro(msTotal)}</strong><br><span class="muted" style="font-size:12px">${status}</span>`;

        row.appendChild(left);
        row.appendChild(right);
        els.milestoneList.appendChild(row);
      }
    }

    // Calendar
    buildCalendar(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), quit, today, milestones, rate);

    // Badges (relevant + all)
    const badges = getBadges(total, days);
    let currentIndex = -1;
    for (let i = 0; i < badges.length; i++) if (badges[i].on) currentIndex = i;

    const start = Math.max(0, currentIndex - 1);
    const end = Math.min(badges.length - 1, currentIndex + 2);

    const badgeRow = document.getElementById("badgeRow");
    const badgesAll = document.getElementById("badgesAll");

    if (badgeRow) {
      badgeRow.innerHTML = "";
      for (let i = start; i <= end; i++) {
        const b = badges[i];
        const div = document.createElement("div");
        div.className = "badge";
        if (b.on) div.classList.add("unlocked");
        if (i === currentIndex) div.classList.add("current");
        div.innerHTML = `<div class="t">${b.e} ${b.t} <span class="muted" style="font-weight:700">(${b.label})</span></div>`;
        badgeRow.appendChild(div);
      }
    }

    if (badgesAll) {
      badgesAll.innerHTML = "";
      for (let i = 0; i < badges.length; i++) {
        const b = badges[i];
        const div = document.createElement("div");
        div.className = "badge";
        if (b.on) div.classList.add("unlocked");
        if (i === currentIndex) div.classList.add("current");
        div.innerHTML = `<div class="t">${b.e} ${b.t} <span class="muted" style="font-weight:700">(${b.label})</span></div>`;
        badgesAll.appendChild(div);
      }
    }

    // Inputs
    if (els.quitDate) els.quitDate.value = state.quitDate;
    if (els.dailyRate) els.dailyRate.value = state.dailyRate;
  }

  /* ============================================================
     UI toggles
  ============================================================ */
  // Settings collapse
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsContent = document.getElementById("settingsContent");
  if (settingsToggle && settingsContent) {
    settingsToggle.addEventListener("click", () => {
      settingsContent.classList.toggle("open");
      settingsToggle.classList.toggle("open");
    });
  }

  // Badges collapse (hide relevant when open)
  const badgesToggle = document.getElementById("badgesToggle");
  const leftCard = document.getElementById("leftCard");
  if (badgesToggle && leftCard) {
    badgesToggle.addEventListener("click", () => {
      leftCard.classList.toggle("badges-open");
      badgesToggle.classList.toggle("open");
    });
  }

  /* ============================================================
     Buttons
  ============================================================ */
  document.getElementById("save")?.addEventListener("click", () => {
    const q = document.getElementById("quitDate")?.value;
    const r = Number(document.getElementById("dailyRate")?.value);
    if (!q || Number.isNaN(r) || r < 0) {
      showToast("⚠️ Vérifie la date et le montant.");
      return;
    }
    state = { quitDate: q, dailyRate: r };
    saveState(state);
    showToast("✅ Sauvegardé !");
    render();
  });

  document.getElementById("reset")?.addEventListener("click", () => {
    localStorage.removeItem(KEY);
    state = loadState();
    showToast("🔁 Réinitialisé.");
    viewDate = new Date();
    render();
  });

  document.getElementById("prevMonth")?.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    render();
  });

  document.getElementById("nextMonth")?.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    render();
  });

  document.getElementById("jumpToday")?.addEventListener("click", () => {
    viewDate = new Date();
    render();
    showToast("📅 Retour au mois courant.");
  });

  // --- Theme toggle (dark/light) ---
const THEME_KEY = "smokefree_theme";
const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme; // "light" | "dark"
  if (themeToggle) themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
    return;
  }
  const prefersLight =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches;

  applyTheme(prefersLight ? "light" : "dark");
}

initTheme();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

  /* ============================================================
     Start
  ============================================================ */
  render();
});