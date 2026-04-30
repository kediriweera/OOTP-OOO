'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const VERSION = '1.3';
const STORAGE_KEY = 'team-ooo-v1';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DOW_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_COLORS = [
  '#dbeafe', // Jan – blue
  '#fce7f3', // Feb – pink
  '#dcfce7', // Mar – green
  '#fef9c3', // Apr – yellow
  '#f3e8ff', // May – purple
  '#ffedd5', // Jun – orange
  '#fee2e2', // Jul – red
  '#fef3c7', // Aug – amber
  '#ccfbf1', // Sep – teal
  '#ecfccb', // Oct – lime
  '#e0f2fe', // Nov – sky
  '#e0e7ff', // Dec – indigo
];

const PRESET_COLORS = [
  '#e53935', '#d81b60', '#8e24aa', '#5e35b1',
  '#1e88e5', '#039be5', '#00897b', '#43a047',
  '#f4511e', '#fb8c00', '#546e7a', '#6d4c41',
];

// ── State ─────────────────────────────────────────────────────────────────────

/** @type {{ year: number, members: Member[], entries: Entry[] }} */
let state = {
  year: new Date().getFullYear(),
  members: [],
  entries: [],
};

/**
 * @typedef {{ id: string, name: string, color: string }} Member
 * @typedef {{ id: string, memberId: string, startDate: string, endDate: string, note: string }} Entry
 */

// ── Storage ───────────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.members = saved.members || [];
      state.entries = saved.entries || [];
      if (saved.year) state.year = saved.year;
    }
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

// ── Holidays ──────────────────────────────────────────────────────────────────

/** Returns the date string for the Nth occurrence of a weekday in a month (0-indexed month, 0=Sun weekday) */
function nthWeekday(year, month, weekday, n) {
  const firstDow = new Date(year, month, 1).getDay();
  const day = 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
  return ymd(year, month + 1, day);
}

/** Returns the date string for the last occurrence of a weekday in a month */
function lastWeekday(year, month, weekday) {
  const lastDay = new Date(year, month + 1, 0);
  const day = lastDay.getDate() - ((lastDay.getDay() - weekday + 7) % 7);
  return ymd(year, month + 1, day);
}

/** Returns a Map of dateStr → holiday name for the given year (US federal holidays) */
function getHolidaysForYear(year) {
  const h = new Map();
  // Fixed-date holidays
  h.set(ymd(year,  1,  1), "New Year's Day");
  h.set(ymd(year,  6, 19), 'Juneteenth');
  h.set(ymd(year,  7,  4), 'Independence Day');
  h.set(ymd(year, 11, 11), 'Veterans Day');
  h.set(ymd(year, 12, 25), 'Christmas Day');
  // Floating holidays
  h.set(nthWeekday(year,  0, 1, 3), 'MLK Day');          // 3rd Mon Jan
  h.set(nthWeekday(year,  1, 1, 3), "Presidents' Day");  // 3rd Mon Feb
  h.set(lastWeekday(year, 4, 1),    'Memorial Day');      // Last Mon May
  h.set(nthWeekday(year,  8, 1, 1), 'Labor Day');        // 1st Mon Sep
  h.set(nthWeekday(year,  9, 1, 2), 'Columbus Day');     // 2nd Mon Oct
  h.set(nthWeekday(year, 10, 4, 4), 'Thanksgiving');     // 4th Thu Nov
  return h;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Returns YYYY-MM-DD for today */
function todayStr() {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Zero-pads and joins to YYYY-MM-DD */
function ymd(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** All members whose OOO covers the given date string */
function getOooForDate(dateStr) {
  const results = [];
  for (const entry of state.entries) {
    if (entry.startDate <= dateStr && dateStr <= entry.endDate) {
      const member = state.members.find(m => m.id === entry.memberId);
      if (member) results.push({ entry, member });
    }
  }
  return results;
}

/** Next unused color from PRESET_COLORS */
function nextColor() {
  const used = new Set(state.members.map(m => m.color));
  return PRESET_COLORS.find(c => !used.has(c)) ?? PRESET_COLORS[state.members.length % PRESET_COLORS.length];
}

/** Format a date range for display */
function fmtRange(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts = { month: 'short', day: 'numeric' };
  if (start === end) return s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) {
      return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
    }
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
  }
  return `${s.toLocaleDateString(undefined, { ...opts, year: 'numeric' })} – ${e.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`;
}

/** Format a date string as "Mon Jan 5" */
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderAll() {
  document.getElementById('current-year').textContent = state.year;
  renderMembersList();
  populateMemberSelect();
  renderCalendar();
  renderEntriesList();
}

function renderMembersList() {
  const list = document.getElementById('members-list');
  list.innerHTML = '';

  if (state.members.length === 0) {
    list.innerHTML = '<li class="empty-msg">No members yet.</li>';
    return;
  }

  state.members.forEach(m => {
    const li = document.createElement('li');
    li.className = 'member-item';
    li.innerHTML = `
      <span class="member-dot" style="background:${m.color}"></span>
      <span class="member-name">${escHtml(m.name)}</span>
      <button class="btn-icon remove-member" data-id="${m.id}" title="Remove ${escHtml(m.name)}">&times;</button>
    `;
    list.appendChild(li);
  });
}

function populateMemberSelect() {
  const sel = document.getElementById('ooo-member');
  const prev = sel.value;
  sel.innerHTML = '';

  if (state.members.length === 0) {
    sel.innerHTML = '<option value="">— add members first —</option>';
    sel.disabled = true;
    return;
  }

  sel.disabled = false;
  state.members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    sel.appendChild(opt);
  });

  // Restore previous selection if still valid
  if (prev && state.members.find(m => m.id === prev)) sel.value = prev;
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  const holidays = getHolidaysForYear(state.year);
  for (let mo = 0; mo < 12; mo++) {
    grid.appendChild(buildMonthCard(state.year, mo, holidays));
  }
}

function buildMonthCard(year, monthIdx, holidays) {
  const card = document.createElement('div');
  card.className = 'month-card';
  card.style.background = MONTH_COLORS[monthIdx];

  const heading = document.createElement('div');
  heading.className = 'month-name';
  heading.textContent = MONTH_NAMES[monthIdx];
  card.appendChild(heading);

  // Day-of-week header row
  const dowGrid = document.createElement('div');
  dowGrid.className = 'month-grid';
  DOW_ABBR.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'dow-header';
    cell.textContent = d;
    dowGrid.appendChild(cell);
  });
  card.appendChild(dowGrid);

  // Days grid
  const daysGrid = document.createElement('div');
  daysGrid.className = 'month-grid';

  const firstDow = new Date(year, monthIdx, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = todayStr();

  // Empty leading cells
  for (let i = 0; i < firstDow; i++) {
    daysGrid.appendChild(Object.assign(document.createElement('div'), { className: 'day-cell empty' }));
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = ymd(year, monthIdx + 1, d);
    const ooos = getOooForDate(ds);
    const dow = (firstDow + d - 1) % 7;

    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.dataset.date = ds;
    if (dow === 0 || dow === 6) cell.classList.add('weekend');
    if (ds === today) cell.classList.add('today');
    if (ooos.length > 0) cell.classList.add('has-ooo');
    const holiday = holidays.get(ds);
    if (holiday) {
      cell.classList.add('holiday');
      cell.dataset.holiday = holiday;
    }

    // Date number
    const num = document.createElement('div');
    num.className = 'day-num';
    num.textContent = d;
    cell.appendChild(num);

    // OOO bars
    if (ooos.length > 0) {
      const barsWrap = document.createElement('div');
      barsWrap.className = 'ooo-bars';

      const visible = ooos.slice(0, 3);
      visible.forEach(({ member }) => {
        const bar = document.createElement('div');
        bar.className = 'ooo-bar';
        bar.style.background = member.color;
        barsWrap.appendChild(bar);
      });

      if (ooos.length > 3) {
        const more = document.createElement('div');
        more.className = 'ooo-bar-more';
        more.textContent = `+${ooos.length - 3}`;
        barsWrap.appendChild(more);
      }

      cell.appendChild(barsWrap);
    }

    daysGrid.appendChild(cell);
  }

  card.appendChild(daysGrid);
  return card;
}

function renderEntriesList() {
  const list = document.getElementById('entries-list');
  const badge = document.getElementById('entries-count');
  list.innerHTML = '';

  const y = String(state.year);
  const yearEntries = state.entries
    .filter(e => e.startDate.slice(0, 4) === y || e.endDate.slice(0, 4) === y)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  badge.textContent = yearEntries.length || '';

  if (yearEntries.length === 0) {
    list.innerHTML = '<li class="empty-msg">No OOO entries for this year.</li>';
    return;
  }

  yearEntries.forEach(entry => {
    const member = state.members.find(m => m.id === entry.memberId);
    if (!member) return;

    const li = document.createElement('li');
    li.className = 'entry-item';
    li.innerHTML = `
      <div class="entry-stripe" style="background:${member.color}"></div>
      <div class="entry-info">
        <span class="entry-member">${escHtml(member.name)}</span>
        <span class="entry-dates">${fmtRange(entry.startDate, entry.endDate)}</span>
        ${entry.note ? `<span class="entry-note">${escHtml(entry.note)}</span>` : ''}
      </div>
      <button class="btn-icon remove-entry" data-id="${entry.id}" title="Remove entry">&times;</button>
    `;
    list.appendChild(li);
  });
}

function renderColorPicker(preSelected) {
  const picker = document.getElementById('color-picker');
  picker.innerHTML = '';
  PRESET_COLORS.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch' + (color === preSelected ? ' selected' : '');
    btn.style.background = color;
    btn.dataset.color = color;
    btn.setAttribute('aria-label', color);
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
    });
    picker.appendChild(btn);
  });
}

// ── Floating Tooltip ──────────────────────────────────────────────────────────

const floatingTooltip = (() => {
  const el = document.getElementById('floating-tooltip');

  function show(dateStr, ooos, holiday, anchorRect) {
    const d = new Date(dateStr + 'T00:00:00');
    const dateLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    let html = `<div class="tip-date">${escHtml(dateLabel)}</div>`;
    if (holiday) {
      html += `<div class="tip-holiday">★ ${escHtml(holiday)}</div>`;
    }
    html += ooos.map(({ entry, member }) =>
      `<div class="tip-entry">
        <span class="tip-dot" style="background:${member.color}"></span>
        <span class="tip-name">${escHtml(member.name)}</span>
        ${entry.note ? `<span class="tip-note"> · ${escHtml(entry.note)}</span>` : ''}
      </div>`
    ).join('');
    el.innerHTML = html;

    el.classList.remove('hidden');

    // Position below the cell, clamped to viewport
    const tipW = el.offsetWidth;
    const rawLeft = anchorRect.left + anchorRect.width / 2;
    const clampedLeft = Math.min(
      Math.max(rawLeft, tipW / 2 + 8),
      window.innerWidth - tipW / 2 - 8
    );

    el.style.left = clampedLeft + 'px';
    el.style.top = (anchorRect.bottom + 6) + 'px';
    el.style.transform = 'translateX(-50%)';
  }

  function hide() {
    el.classList.add('hidden');
  }

  return { show, hide };
})();

// ── Event Handlers ────────────────────────────────────────────────────────────

function handleAddMember() {
  const nameInput = document.getElementById('member-name');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  const selected = document.querySelector('#color-picker .color-swatch.selected');
  const color = selected ? selected.dataset.color : nextColor();

  state.members.push({ id: uid(), name, color });
  saveState();
  renderAll();
  closeMemberModal();
}

function handleRemoveMember(id) {
  const member = state.members.find(m => m.id === id);
  if (!member) return;
  if (!confirm(`Remove "${member.name}" and all their OOO entries?`)) return;

  state.members = state.members.filter(m => m.id !== id);
  state.entries = state.entries.filter(e => e.memberId !== id);
  saveState();
  renderAll();
}

function handleAddEntry(e) {
  e.preventDefault();

  const memberId = document.getElementById('ooo-member').value;
  const startDate = document.getElementById('ooo-start').value;
  const endDate = document.getElementById('ooo-end').value;
  const note = document.getElementById('ooo-note').value.trim();

  if (!memberId || !startDate || !endDate) return;

  if (endDate < startDate) {
    alert('End date must be on or after start date.');
    document.getElementById('ooo-end').focus();
    return;
  }

  // Warn for very long ranges (likely a mistake)
  const days = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  if (days > 90 && !confirm(`This entry spans ${days} days. Continue?`)) return;

  state.entries.push({ id: uid(), memberId, startDate, endDate, note });
  saveState();

  // Navigate to the entry's year if it differs
  const entryYear = parseInt(startDate.slice(0, 4), 10);
  if (entryYear !== state.year) {
    state.year = entryYear;
  }

  // Reset the note field only; keep member/dates for quick multi-entry input
  document.getElementById('ooo-note').value = '';
  renderAll();
}

function handleRemoveEntry(id) {
  state.entries = state.entries.filter(e => e.id !== id);
  saveState();
  renderCalendar();
  renderEntriesList();
}

function openMemberModal() {
  renderColorPicker(nextColor());
  document.getElementById('member-name').value = '';
  document.getElementById('member-modal').classList.remove('hidden');
  document.getElementById('member-name').focus();
}

function closeMemberModal() {
  document.getElementById('member-modal').classList.add('hidden');
}

// ── HTML escape ───────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Setup ─────────────────────────────────────────────────────────────────────

function setupEventListeners() {
  // Year navigation
  document.getElementById('prev-year').addEventListener('click', () => {
    state.year--;
    saveState();
    document.getElementById('current-year').textContent = state.year;
    renderCalendar();
    renderEntriesList();
  });

  document.getElementById('next-year').addEventListener('click', () => {
    state.year++;
    saveState();
    document.getElementById('current-year').textContent = state.year;
    renderCalendar();
    renderEntriesList();
  });

  document.getElementById('today-btn').addEventListener('click', () => {
    state.year = new Date().getFullYear();
    saveState();
    document.getElementById('current-year').textContent = state.year;
    renderCalendar();
    renderEntriesList();
  });

  // Member management
  document.getElementById('add-member-btn').addEventListener('click', openMemberModal);
  document.getElementById('cancel-member').addEventListener('click', closeMemberModal);
  document.getElementById('save-member').addEventListener('click', handleAddMember);

  document.getElementById('member-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAddMember();
    if (e.key === 'Escape') closeMemberModal();
  });

  document.getElementById('member-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeMemberModal();
  });

  // OOO form
  document.getElementById('add-ooo-form').addEventListener('submit', handleAddEntry);

  // Delegated: remove member
  document.getElementById('members-list').addEventListener('click', e => {
    const btn = e.target.closest('.remove-member');
    if (btn) handleRemoveMember(btn.dataset.id);
  });

  // Delegated: remove entry
  document.getElementById('entries-list').addEventListener('click', e => {
    const btn = e.target.closest('.remove-entry');
    if (btn) handleRemoveEntry(btn.dataset.id);
  });

  // Calendar tooltip on hover
  document.getElementById('calendar-grid').addEventListener('mouseover', e => {
    const cell = e.target.closest('.day-cell');
    if (!cell || cell.classList.contains('empty')) { floatingTooltip.hide(); return; }
    const ooos = getOooForDate(cell.dataset.date);
    const holiday = cell.dataset.holiday || null;
    if (!ooos.length && !holiday) { floatingTooltip.hide(); return; }
    floatingTooltip.show(cell.dataset.date, ooos, holiday, cell.getBoundingClientRect());
  });

  document.getElementById('calendar-grid').addEventListener('mouseleave', () => {
    floatingTooltip.hide();
  });

  // Hide tooltip on scroll (position would become stale)
  window.addEventListener('scroll', () => floatingTooltip.hide(), { passive: true });
  document.querySelector('.calendar-area').addEventListener('scroll', () => floatingTooltip.hide(), { passive: true });
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  document.getElementById('version-badge').textContent = 'v' + VERSION;
  loadState();
  setupEventListeners();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
