document.addEventListener("DOMContentLoaded", function() {
  // --------- Utils dates (timezone locale) ----------
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDateFR = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const fmtMonthFR = (d) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
    // Ajuste si le mois cible n'a pas le "day" (ex: 31 -> 30/28)
    while (x.getDate() !== day) {
      x.setDate(x.getDate() - 1);
      if (x.getMonth() === (new Date(d.getFullYear(), d.getMonth() + months, 1)).getMonth()) break;
    }
    return x;
  }
  function addYears(d, years) {
    const x = new Date(d);
    const m = x.getMonth();
    x.setFullYear(x.getFullYear() + years);
    // Gestion 29 février etc.
    if (x.getMonth() !== m) x.setDate(0);
    return x;
  }
  function diffDays(a, b) {
    // b - a in days, a & b should be startOfDay
    const ms = b.getTime() - a.getTime();
    return Math.floor(ms / 86400000);
  }
  function euro(n) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  }

  // ✅ Include quit day: quit day counts as 1 saved day
  function savedDaysOnDate(quit, date) {
    const d = startOfDay(date);
    if (d < quit) return 0;
    return diffDays(quit, d) + 1;
  }

  // --------- Storage ----------
  const KEY = 'smokefree_v1';
  function loadState() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    // Default: 5 Feb 2026, 13€/day
    return { quitDate: '2026-02-05', dailyRate: 13 };
  }
  function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  // --------- Milestones ----------
  function buildMilestones(quit) {
    // returns array {name, date, kind}
    const m = [];
    const push = (name, date, kind = 'milestone') => m.push({ name, date: startOfDay(date), kind });

    // weeks
    push('1 semaine', addDays(quit, 7));
    push('2 semaines', addDays(quit, 14));
    push('3 semaines', addDays(quit, 21));

    // months
    push('1 mois', addMonths(quit, 1));
    push('2 mois', addMonths(quit, 2));
    push('3 mois', addMonths(quit, 3));
    push('6 mois', addMonths(quit, 6));

    // 1 year + anniversaries (up to 10 years for display)
    push('1 an', addYears(quit, 1));
    for (let y = 2; y <= 10; y++) {
      push(`${y} ans`, addYears(quit, y), 'anniversary');
    }

    // Sort by date
    m.sort((a, b) => a.date - b.date);
    return m;
  }

  function nextMilestone(milestones, today) {
    return milestones.find(x => x.date >= today) || null;
  }

  // --------- Gamification ----------
  function getBadges(total) {
    // thresholds in euros
    const defs = [
      { t: 'Bronze',  e: '🥉', at: 50,   d: 'Tu commences à sentir la différence.' },
      { t: 'Argent',  e: '🥈', at: 150,  d: 'Ça fait déjà de quoi te faire plaisir.' },
      { t: 'Or',      e: '🥇', at: 300,  d: 'Solide. On tient la routine.' },
      { t: 'Platine', e: '💎', at: 600,  d: 'Gros palier. Respect.' },
      { t: 'Légende', e: '🏅', at: 1000, d: 'Tu es officiellement en mode boss.' },
    ];
    return defs.map(b => ({ ...b, on: total >= b.at }));
  }

  // --------- Toast ----------
  const toast = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // --------- Calendar ----------
  const calendarEl = document.getElementById('calendar');
  const monthTitleEl = document.getElementById('monthTitle');

  const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  function buildCalendar(viewDate, quit, today, milestones, dailyRate) {
    if (!calendarEl || !monthTitleEl) return;

    calendarEl.innerHTML = '';

    // DOW header
    for (const w of DOW) {
      const d = document.createElement('div');
      d.className = 'dow';
      d.textContent = w;
      calendarEl.appendChild(d);
    }

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    monthTitleEl.textContent = fmtMonthFR(new Date(year, month, 1));

    const first = new Date(year, month, 1);
    // Monday-based index: (Sun=0..Sat=6) -> (Mon=0..Sun=6)
    const firstDow = (first.getDay() + 6) % 7;

    // Start cell date (may be previous month)
    const start = addDays(first, -firstDow);
    const totalCells = 42; // 6 weeks view

    const milestoneMap = new Map();
    for (const ms of milestones) {
      const key = `${ms.date.getFullYear()}-${ms.date.getMonth()}-${ms.date.getDate()}`;
      if (!milestoneMap.has(key)) milestoneMap.set(key, []);
      milestoneMap.get(key).push(ms);
    }

    for (let i = 0; i < totalCells; i++) {
      const d = addDays(start, i);
      const cell = document.createElement('div');
      cell.className = 'day';

      const inMonth = d.getMonth() === month;
      if (!inMonth) cell.classList.add('off');

      const sd = startOfDay(d);
      const isOnOrAfterQuit = sd >= quit;
      const isOnOrBeforeToday = sd <= today;
      const isClean = isOnOrAfterQuit && isOnOrBeforeToday;
      const isToday = sd.getTime() === today.getTime();

      // top number
      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d.getDate();
      cell.appendChild(num);

      // ✅ money line (projection included)
      const savedDays = savedDaysOnDate(quit, sd);
        const money = savedDays * Number(dailyRate || 0);
        const moneyEl = document.createElement('div');
        moneyEl.className = 'money';

        if (savedDays > 0) {
        moneyEl.textContent = euro(money);

        if (sd < today) {
            moneyEl.classList.add('past');      // vert
        } else if (sd.getTime() === today.getTime()) {
            moneyEl.classList.add('today');     // jaune
        } else {
            moneyEl.classList.add('future');    // violet
        }
        }

cell.appendChild(moneyEl);

      const chips = document.createElement('div');
      chips.className = 'chips';

      if (isToday) {
        const chip = document.createElement('div');
        chip.className = 'chip warn';
        chip.textContent = '⭐ Aujourd’hui';
        chips.appendChild(chip);
      }

      if (isClean) {
        const chip = document.createElement('div');
        chip.className = 'chip good';
        chip.textContent = '✅ Jour clean';
        chips.appendChild(chip);
        cell.style.boxShadow = '0 0 0 2px rgba(46,229,157,.08) inset';
        cell.style.borderColor = 'rgba(46,229,157,.25)';
      }

      const key = `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}`;
      const msHere = milestoneMap.get(key);
      if (msHere && msHere.length) {
        for (const ms of msHere) {
          const chip = document.createElement('div');
          chip.className = 'chip accent';
          chip.textContent = `🏁 ${ms.name}`;
          chips.appendChild(chip);
        }
        cell.style.boxShadow = '0 0 0 2px rgba(124,92,255,.10) inset';
        cell.style.borderColor = 'rgba(124,92,255,.28)';
      }

      cell.appendChild(chips);
      calendarEl.appendChild(cell);
    }
  }

  // --------- Render ----------
  const els = {
    streakDays: document.getElementById('streakDays'),
    totalEuros: document.getElementById('totalEuros'),
    sinceText: document.getElementById('sinceText'),
    sinceDetail: document.getElementById('sinceDetail'),
    kpiDays: document.getElementById('kpiDays'),
    kpiDaysSub: document.getElementById('kpiDaysSub'),
    kpiRate: document.getElementById('kpiRate'),
    kpiTotal: document.getElementById('kpiTotal'),
    kpiTotalSub: document.getElementById('kpiTotalSub'),
    nextMilestoneName: document.getElementById('nextMilestoneName'),
    nextMilestoneWhen: document.getElementById('nextMilestoneWhen'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    nextMilestoneGain: document.getElementById('nextMilestoneGain'),
    badgeRow: document.getElementById('badgeRow'),
    milestoneList: document.getElementById('milestoneList'),
    quitDate: document.getElementById('quitDate'),
    dailyRate: document.getElementById('dailyRate'),
  };

  let state = loadState();
  let viewDate = new Date(); // month being viewed

  function render() {
    const quit = startOfDay(new Date(state.quitDate + 'T00:00:00'));
    const today = startOfDay(new Date());

    const dailyRate = Number(state.dailyRate || 0);

    // ✅ Includes quit day as day 1
    const days = savedDaysOnDate(quit, today);
    const total = days * dailyRate;

    if (els.streakDays) els.streakDays.textContent = days;
    if (els.totalEuros) els.totalEuros.textContent = euro(total);

    if (els.sinceText) els.sinceText.textContent = `${days} jour${days > 1 ? 's' : ''} sans fumer`;
    if (els.sinceDetail) els.sinceDetail.textContent = `Arrêt le ${fmtDateFR(quit)} • Aujourd’hui le ${fmtDateFR(today)}`;

    if (els.kpiDays) els.kpiDays.textContent = days;
    if (els.kpiDaysSub) els.kpiDaysSub.textContent = days === 0 ? 'Départ : demain ?' : 'Continue comme ça 👊';
    if (els.kpiRate) els.kpiRate.textContent = euro(dailyRate).replace(',00', '');
    if (els.kpiTotal) els.kpiTotal.textContent = euro(total);
    if (els.kpiTotalSub) els.kpiTotalSub.textContent = `≈ ${euro(dailyRate * 7)} / semaine`;

    // Milestones
    const milestones = buildMilestones(quit);
    const nxt = nextMilestone(milestones, today);

    // next milestone progress (based on saved days logic)
    if (nxt) {
      if (els.nextMilestoneName) els.nextMilestoneName.textContent = nxt.name;

      const remaining = diffDays(today, nxt.date);
      const totalSpan = Math.max(1, diffDays(quit, nxt.date) + 1); // include quit day
      const doneSpan = Math.max(0, Math.min(totalSpan, diffDays(quit, today) + 1));
      const pct = Math.max(0, Math.min(100, (doneSpan / totalSpan) * 100));

      if (els.nextMilestoneWhen) {
        els.nextMilestoneWhen.textContent = remaining === 0
          ? `C’est aujourd’hui ! (${fmtDateFR(nxt.date)})`
          : `Dans ${remaining} jour${remaining > 1 ? 's' : ''} (${fmtDateFR(nxt.date)})`;
      }

      if (els.progressBar) els.progressBar.style.width = pct.toFixed(1) + '%';
      if (els.progressText) els.progressText.textContent = `${doneSpan} / ${totalSpan} jours`;

      const gainToNext = Math.max(0, remaining) * dailyRate;
      if (els.nextMilestoneGain) els.nextMilestoneGain.textContent = euro(gainToNext);
    } else {
      if (els.nextMilestoneName) els.nextMilestoneName.textContent = '—';
      if (els.nextMilestoneWhen) els.nextMilestoneWhen.textContent = '—';
      if (els.progressBar) els.progressBar.style.width = '0%';
      if (els.progressText) els.progressText.textContent = '—';
      if (els.nextMilestoneGain) els.nextMilestoneGain.textContent = '—';
    }

    // Badges
    if (els.badgeRow) {
      els.badgeRow.innerHTML = '';
      const badges = getBadges(total);
      for (const b of badges) {
        const div = document.createElement('div');
        div.className = 'badge' + (b.on ? ' on' : '');
        div.innerHTML = `
          <div class="t">${b.e} ${b.t} <span class="muted" style="font-weight:700">(${euro(b.at)})</span></div>
          <div class="d">${b.on ? 'Débloqué ✅' : 'À débloquer…'} — ${b.d}</div>
        `;
        els.badgeRow.appendChild(div);
      }
    }

    // Milestone list + ✅ display money at milestone date
    if (els.milestoneList) {
      els.milestoneList.innerHTML = '';
      for (const ms of milestones) {
        const isPast = ms.date < today;
        const isToday = ms.date.getTime() === today.getTime();

        const row = document.createElement('div');
        row.className = 'pill';
        row.style.justifyContent = 'space-between';
        row.style.width = '100%';

        const left = document.createElement('span');
        left.innerHTML = `${isPast ? '✅' : (isToday ? '🏁' : '⏳')} <strong>${ms.name}</strong> <span class="muted">— ${fmtDateFR(ms.date)}</span>`;

        const msDays = savedDaysOnDate(quit, ms.date);
        const msTotal = msDays * dailyRate;

        let status = '';
        if (isPast) status = 'Accompli';
        else if (isToday) status = 'Aujourd’hui !';
        else status = `Dans ${diffDays(today, ms.date)} j`;

        const right = document.createElement('span');
        right.className = 'muted';
        right.innerHTML = `<strong style="color:rgba(255,255,255,.92)">${euro(msTotal)}</strong><br><span class="muted" style="font-size:12px">${status}</span>`;

        row.appendChild(left);
        row.appendChild(right);
        els.milestoneList.appendChild(row);
      }
    }

    // Calendar view uses viewDate month + ✅ daily money
    buildCalendar(startOfDay(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)), quit, today, milestones, dailyRate);

    // Inputs
    if (els.quitDate) els.quitDate.value = state.quitDate;
    if (els.dailyRate) els.dailyRate.value = state.dailyRate;

    // Celebrate if milestone reached today (toast only)
    const msToday = milestones.filter(m => m.date.getTime() === today.getTime());
    if (msToday.length) {
      const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      const key = 'celebrated_' + todayKey;
      if (localStorage.getItem(key) !== '1') {
        localStorage.setItem(key, '1');
        showToast(`🎉 Jalon atteint : ${msToday.map(x => x.name).join(', ')} !`);
      }
    }
  }

  // --------- Events ----------
  const saveBtn = document.getElementById('save');
  const resetBtn = document.getElementById('reset');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  const jumpBtn = document.getElementById('jumpToday');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const q = els.quitDate?.value;
      const r = Number(els.dailyRate?.value);
      if (!q || isNaN(r) || r < 0) {
        showToast('⚠️ Vérifie la date et le montant.');
        return;
      }
      state = { quitDate: q, dailyRate: r };
      saveState(state);
      showToast('✅ Sauvegardé !');
      render();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(KEY);
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('celebrated_')) localStorage.removeItem(k);
      });
      state = loadState();
      showToast('🔁 Réinitialisé.');
      viewDate = new Date();
      render();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
      render();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
      render();
    });
  }

  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      viewDate = new Date();
      render();
      showToast('📅 Retour au mois courant.');
    });
  }

  // initial render
  render();
});