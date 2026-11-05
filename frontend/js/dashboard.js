// js/dashboard.js
// จัดการหน้า dashboard ทั้งหมด: โหลดรายการ, สรุปยอด, ฟอร์มเพิ่ม/แก้ไข/ลบ, กรองข้อมูล, วาดกราฟโดนัททันสมัย

const THB = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const THAI_DATE = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

const SHORT_DATE = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

let allCategories = new Set();
let currentTransactionsList = [];
let pendingDeleteId = null;

// สีสำหรับกราฟหมวดหมู่ สไตล์ Modern FinTech
const CHART_COLORS = [
  '#F43F5E', // Rose
  '#6366F1', // Indigo
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const PRESET_EXPENSE_CATEGORIES = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'ค่าน้ำค่าไฟ', 'บันเทิง', 'สุขภาพ', 'ที่พัก'];
const PRESET_INCOME_CATEGORIES = ['เงินเดือน', 'โบนัส', 'ขายของ', 'ลงทุน', 'เงินคืน', 'อื่นๆ'];

const CATEGORY_ICONS = {
  'อาหาร': '🍱',
  'เดินทาง': '🚗',
  'ช้อปปิ้ง': '🛍️',
  'ค่าน้ำค่าไฟ': '💡',
  'บันเทิง': '🎬',
  'สุขภาพ': '💊',
  'ที่พัก': '🏠',
  'เงินเดือน': '💼',
  'โบนัส': '🎁',
  'ขายของ': '📦',
  'ลงทุน': '📈',
  'เงินคืน': '💵',
  'อื่นๆ': '🏷️'
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // กำหนดชื่อและ Avatar
  const username = localStorage.getItem('username') || 'ผู้ใช้งาน';
  const usernameEl = document.getElementById('current-username');
  if (usernameEl) usernameEl.textContent = username;

  const greetingNameEl = document.getElementById('user-greeting-name');
  if (greetingNameEl) greetingNameEl.textContent = username;

  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) avatarEl.textContent = (username[0] || 'U').toUpperCase();

  // กำหนดคำทักทายตามช่วงเวลา
  updateGreetingTime();

  // กำหนดวันที่ปัจจุบัน
  const todayDateEl = document.getElementById('today-date');
  if (todayDateEl) todayDateEl.textContent = THAI_DATE.format(new Date());

  const txDateInput = document.getElementById('tx-date');
  if (txDateInput) txDateInput.value = new Date().toISOString().slice(0, 10);

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = 'index.html';
    });
  }

  // Type Switcher Buttons (+ รายรับ / - รายจ่าย)
  setupTypeSwitcher();

  // Quick Category Tags
  renderQuickCategoryTags('expense');

  // Quick Date Shortcut Buttons (วันนี้ / เมื่อวาน)
  setupDateShortcuts();

  // Filter Presets (ทั้งหมด, เดือนนี้, 7 วัน)
  setupFilterPresets();

  // Real-time Search Input
  const searchInput = document.getElementById('table-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleTableSearch);
  }

  // Mobile menu toggle
  setupMobileDrawer();

  // Delete Modal listeners
  setupDeleteModal();

  // Form submit & cancel
  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('tx-cancel-btn').addEventListener('click', resetForm);
  document.getElementById('apply-filter-btn').addEventListener('click', () => {
    clearPresetActiveState();
    loadAll();
  });
  document.getElementById('reset-filter-btn').addEventListener('click', () => {
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-category').value = '';
    setActivePreset('preset-all');
    loadAll();
  });

  // โหลดข้อมูลเริ่มต้น
  loadAll();

  // Refresh icons
  if (window.lucide) window.lucide.createIcons();
});

// คำทักทายตามช่วงเวลาของวัน
function updateGreetingTime() {
  const hour = new Date().getHours();
  let timeGreeting = 'สวัสดี';
  if (hour >= 5 && hour < 12) {
    timeGreeting = 'สวัสดีตอนเช้า';
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = 'สวัสดีตอนบ่าย';
  } else if (hour >= 17 && hour < 21) {
    timeGreeting = 'สวัสดีตอนเย็น';
  } else {
    timeGreeting = 'สวัสดีตอนค่ำ';
  }

  const greetingEl = document.querySelector('.main__greeting');
  if (greetingEl) {
    const username = localStorage.getItem('username') || 'ผู้ใช้งาน';
    greetingEl.innerHTML = `${timeGreeting}, <span class="accent">${escapeHtml(username)}</span> 👋`;
  }
}

// ปุ่มสลับประเภท รายรับ / รายจ่าย
function setupTypeSwitcher() {
  const btnIncome = document.getElementById('type-btn-income');
  const btnExpense = document.getElementById('type-btn-expense');
  const typeSelect = document.getElementById('tx-type');

  if (!btnIncome || !btnExpense || !typeSelect) return;

  btnIncome.addEventListener('click', () => {
    setType('income');
  });

  btnExpense.addEventListener('click', () => {
    setType('expense');
  });

  typeSelect.addEventListener('change', () => {
    setType(typeSelect.value, false);
  });
}

function setType(type, updateSelect = true) {
  const btnIncome = document.getElementById('type-btn-income');
  const btnExpense = document.getElementById('type-btn-expense');
  const typeSelect = document.getElementById('tx-type');

  if (updateSelect && typeSelect) {
    typeSelect.value = type;
  }

  if (type === 'income') {
    btnIncome.className = 'type-btn is-active-income';
    btnExpense.className = 'type-btn';
    renderQuickCategoryTags('income');
  } else {
    btnIncome.className = 'type-btn';
    btnExpense.className = 'type-btn is-active-expense';
    renderQuickCategoryTags('expense');
  }

  if (window.lucide) window.lucide.createIcons();
}

// แสดงปุ่มแท็กหมวดหมู่ด่วน
function renderQuickCategoryTags(type) {
  const container = document.getElementById('quick-category-tags');
  if (!container) return;

  const presets = type === 'income' ? PRESET_INCOME_CATEGORIES : PRESET_EXPENSE_CATEGORIES;
  container.innerHTML = '';

  presets.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quick-tag';
    const icon = CATEGORY_ICONS[cat] || '🏷️';
    btn.textContent = `${icon} ${cat}`;
    btn.addEventListener('click', () => {
      const catInput = document.getElementById('tx-category');
      if (catInput) {
        catInput.value = cat;
        catInput.focus();
      }
    });
    container.appendChild(btn);
  });
}

// ปุ่มเลือกวันที่ด่วน (วันนี้ / เมื่อวาน)
function setupDateShortcuts() {
  const btnToday = document.getElementById('date-btn-today');
  const btnYesterday = document.getElementById('date-btn-yesterday');
  const dateInput = document.getElementById('tx-date');

  if (btnToday && dateInput) {
    btnToday.addEventListener('click', () => {
      dateInput.value = new Date().toISOString().slice(0, 10);
    });
  }

  if (btnYesterday && dateInput) {
    btnYesterday.addEventListener('click', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      dateInput.value = yesterday.toISOString().slice(0, 10);
    });
  }
}

// Preset Filters (ทั้งหมด / เดือนนี้ / 7 วัน)
function setupFilterPresets() {
  const btnAll = document.getElementById('preset-all');
  const btnMonth = document.getElementById('preset-month');
  const btnWeek = document.getElementById('preset-week');

  if (btnAll) {
    btnAll.addEventListener('click', () => {
      document.getElementById('filter-start').value = '';
      document.getElementById('filter-end').value = '';
      setActivePreset('preset-all');
      loadAll();
    });
  }

  if (btnMonth) {
    btnMonth.addEventListener('click', () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      document.getElementById('filter-start').value = firstDay.toISOString().slice(0, 10);
      document.getElementById('filter-end').value = now.toISOString().slice(0, 10);
      setActivePreset('preset-month');
      loadAll();
    });
  }

  if (btnWeek) {
    btnWeek.addEventListener('click', () => {
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      document.getElementById('filter-start').value = weekAgo.toISOString().slice(0, 10);
      document.getElementById('filter-end').value = now.toISOString().slice(0, 10);
      setActivePreset('preset-week');
      loadAll();
    });
  }
}

function setActivePreset(id) {
  document.querySelectorAll('.preset-chip').forEach((chip) => chip.classList.remove('is-active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('is-active');
}

function clearPresetActiveState() {
  document.querySelectorAll('.preset-chip').forEach((chip) => chip.classList.remove('is-active'));
}

// Responsive Drawer บนมือถือ
function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggleBtn || !sidebar || !overlay) return;

  function toggleMenu() {
    sidebar.classList.toggle('is-open');
    overlay.classList.toggle('is-open');
  }

  toggleBtn.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);

  document.querySelectorAll('.sidebar__nav .nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 820) {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-open');
      }
    });
  });
}

// สร้าง query string จากตัวกรอง
function buildFilterQuery() {
  const params = new URLSearchParams();
  const start = document.getElementById('filter-start').value;
  const end = document.getElementById('filter-end').value;
  const type = document.getElementById('filter-type').value;
  const category = document.getElementById('filter-category').value;

  if (start) params.set('start_date', start);
  if (end) params.set('end_date', end);
  if (type) params.set('type', type);
  if (category) params.set('category', category);

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// โหลดรายการและสรุปยอดพร้อมกัน
async function loadAll() {
  const query = buildFilterQuery();
  try {
    const [transactions, summary] = await Promise.all([
      api.getTransactions(query),
      api.getSummary(query),
    ]);
    currentTransactionsList = transactions || [];
    updateCategoryOptions(transactions);
    renderTable(transactions);
    renderSummary(summary);
    renderChart(summary.by_category);
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'ไม่สามารถโหลดข้อมูลได้', 'error');
  }
}

// อัปเดตรายการหมวดหมู่
function updateCategoryOptions(transactions) {
  transactions.forEach((t) => allCategories.add(t.category));

  const filterSelect = document.getElementById('filter-category');
  const currentFilterValue = filterSelect.value;
  filterSelect.innerHTML = '<option value="">ทั้งหมด</option>';
  [...allCategories].sort().forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterSelect.appendChild(opt);
  });
  filterSelect.value = currentFilterValue;

  const datalist = document.getElementById('category-options');
  datalist.innerHTML = '';
  [...allCategories].sort().forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    datalist.appendChild(opt);
  });
}

// วาดตารางรายการ
function renderTable(transactions) {
  const tbody = document.getElementById('transactions-body');
  const emptyMsg = document.getElementById('table-empty');
  const countBadge = document.getElementById('tx-count-badge');
  const subtitle = document.getElementById('table-subtitle');

  tbody.innerHTML = '';

  if (countBadge) {
    countBadge.textContent = `${transactions.length} รายการ`;
  }
  if (subtitle) {
    subtitle.textContent = `ประวัติรายการที่บันทึกไว้ (${transactions.length} รายการ)`;
  }

  if (transactions.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  transactions.forEach((t) => {
    const tr = document.createElement('tr');
    tr.dataset.id = t.id;
    const isIncome = t.type === 'income';
    const categoryIcon = CATEGORY_ICONS[t.category] || '🏷️';

    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="calendar" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
          <span>${SHORT_DATE.format(new Date(t.transaction_date))}</span>
        </div>
      </td>
      <td>
        <span class="tag ${isIncome ? 'tag--income' : 'tag--expense'}">
          <i data-lucide="${isIncome ? 'arrow-up-right' : 'arrow-down-right'}" style="width: 12px; height: 12px;"></i>
          ${isIncome ? 'รายรับ' : 'รายจ่าย'}
        </span>
      </td>
      <td>
        <span class="category-badge">
          <span>${categoryIcon}</span>
          <span>${escapeHtml(t.category)}</span>
        </span>
      </td>
      <td style="color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
        ${escapeHtml(t.note || '-')}
      </td>
      <td class="align-right ${isIncome ? 'amount--income' : 'amount--expense'}">
        ${isIncome ? '+' : '-'}${THB.format(t.amount)}
      </td>
      <td class="align-right">
        <div class="row-actions">
          <button class="btn-icon" data-action="edit" data-id="${t.id}" title="แก้ไขรายการ">
            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
            <span>แก้ไข</span>
          </button>
          <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${t.id}" title="ลบรายการ">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            <span>ลบ</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(t));
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => handleDelete(t.id, t));
  });

  if (window.lucide) window.lucide.createIcons();
}

// ค้นหาในตารางทันที (Real-time Filter)
function handleTableSearch(e) {
  const query = (e.target.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#transactions-body tr');
  let matchCount = 0;

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    const isMatch = text.includes(query);
    row.style.display = isMatch ? '' : 'none';
    if (isMatch) matchCount++;
  });

  const countBadge = document.getElementById('tx-count-badge');
  if (countBadge) {
    countBadge.textContent = query ? `พบ ${matchCount} รายการ` : `${rows.length} รายการ`;
  }
}

// ป้องกัน XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// แสดงยอดสรุป KPI
function renderSummary(summary) {
  const incomeEl = document.getElementById('summary-income');
  const expenseEl = document.getElementById('summary-expense');
  const balanceEl = document.getElementById('summary-balance');
  const balanceStatusEl = document.getElementById('balance-status-text');

  if (incomeEl) incomeEl.textContent = THB.format(summary.total_income);
  if (expenseEl) expenseEl.textContent = THB.format(summary.total_expense);
  if (balanceEl) {
    balanceEl.textContent = THB.format(summary.balance);
    if (summary.balance > 0) {
      balanceEl.style.color = 'var(--income)';
      if (balanceStatusEl) balanceStatusEl.textContent = 'ยอดคงเหลือเป็นบวก มีเงินเก็บออม';
    } else if (summary.balance < 0) {
      balanceEl.style.color = 'var(--expense)';
      if (balanceStatusEl) balanceStatusEl.textContent = 'ยอดติดลบ ควรควบคุมค่าใช้จ่าย';
    } else {
      balanceEl.style.color = 'var(--text-main)';
      if (balanceStatusEl) balanceStatusEl.textContent = 'รายรับและรายจ่ายสมดุลพอดี';
    }
  }
}

// --- ฟอร์มเพิ่ม/แก้ไขรายการ ---

async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('tx-submit-btn');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;

  const id = document.getElementById('tx-id').value;
  const payload = {
    type: document.getElementById('tx-type').value,
    amount: parseFloat(document.getElementById('tx-amount').value),
    category: document.getElementById('tx-category').value.trim(),
    transaction_date: document.getElementById('tx-date').value,
    note: document.getElementById('tx-note').value.trim(),
  };

  try {
    if (id) {
      await api.updateTransaction(id, payload);
      showToast('แก้ไขรายการสำเร็จเรียบร้อย', 'success');
    } else {
      await api.createTransaction(payload);
      showToast('บันทึกรายการใหม่สำเร็จ', 'success');
    }
    resetForm();
    loadAll();
  } catch (err) {
    showToast(err.message || 'ไม่สามารถบันทึกรายการได้', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
    if (window.lucide) window.lucide.createIcons();
  }
}

function startEdit(t) {
  document.getElementById('form-title').textContent = 'แก้ไขรายการ';
  const badge = document.getElementById('form-mode-badge');
  if (badge) {
    badge.textContent = `กำลังแก้ไข #${t.id}`;
    badge.style.background = 'var(--warning-light)';
    badge.style.color = 'var(--warning)';
  }

  document.getElementById('tx-id').value = t.id;
  setType(t.type);
  document.getElementById('tx-amount').value = t.amount;
  document.getElementById('tx-category').value = t.category;
  document.getElementById('tx-date').value = t.transaction_date.slice(0, 10);
  document.getElementById('tx-note').value = t.note || '';

  const submitBtn = document.getElementById('tx-submit-btn');
  submitBtn.innerHTML = '<i data-lucide="check" style="width: 16px; height: 16px;"></i> <span>บันทึกการแก้ไข</span>';
  document.getElementById('tx-cancel-btn').hidden = false;

  const formPanel = document.getElementById('form-panel');
  if (formPanel) {
    formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (window.lucide) window.lucide.createIcons();
}

function resetForm() {
  document.getElementById('form-title').textContent = 'เพิ่มรายการ';
  const badge = document.getElementById('form-mode-badge');
  if (badge) {
    badge.textContent = 'บันทึกใหม่';
    badge.style.background = '';
    badge.style.color = '';
  }

  document.getElementById('transaction-form').reset();
  document.getElementById('tx-id').value = '';
  setType('expense');
  document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);

  const submitBtn = document.getElementById('tx-submit-btn');
  submitBtn.innerHTML = '<i data-lucide="save" style="width: 16px; height: 16px;"></i> <span>บันทึกรายการ</span>';
  document.getElementById('tx-cancel-btn').hidden = true;

  if (window.lucide) window.lucide.createIcons();
}

// --- ลบรายการผ่าน Modal ---

function setupDeleteModal() {
  const modal = document.getElementById('delete-modal');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  const cancelBtn = document.getElementById('cancel-delete-btn');

  if (!modal || !confirmBtn || !cancelBtn) return;

  closeDeleteModal();

  cancelBtn.addEventListener('click', closeDeleteModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDeleteModal();
  });

  confirmBtn.addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    confirmBtn.disabled = true;
    try {
      await api.deleteTransaction(pendingDeleteId);
      showToast('ลบรายการสำเร็จ', 'success');
      closeDeleteModal();
      loadAll();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถลบรายการได้', 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  });
}

function handleDelete(id, t) {
  pendingDeleteId = id;
  const modal = document.getElementById('delete-modal');
  const descEl = document.getElementById('delete-modal-desc');

  if (descEl && t) {
    const isIncome = t.type === 'income';
    descEl.innerHTML = `
      คุณต้องการลบรายการ <strong>${escapeHtml(t.category)}</strong> 
      จำนวน <strong>${isIncome ? '+' : '-'}${THB.format(t.amount)}</strong> 
      ใช่หรือไม่ ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้
    `;
  }

  if (modal) {
    modal.hidden = false;
    modal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
  } else {
    // Fallback ถ้า modal ไม่มี
    if (confirm('ยืนยันการลบรายการนี้หรือไม่?')) {
      api.deleteTransaction(id).then(() => {
        showToast('ลบรายการสำเร็จ', 'success');
        loadAll();
      }).catch((err) => showToast(err.message, 'error'));
    }
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('delete-modal');
  if (modal) {
    modal.hidden = true;
    modal.style.display = 'none';
  }
  pendingDeleteId = null;
}

// --- Toast Notification System ---

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icon = type === 'success' ? 'check-circle' : 'alert-circle';
  toast.innerHTML = `
    <i data-lucide="${icon}" style="width: 18px; height: 18px; flex-shrink: 0; color: ${type === 'success' ? 'var(--income)' : 'var(--expense)'};"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// --- กราฟวงกลม Donut Chart รายจ่ายแยกตามหมวดหมู่ ---

function renderChart(byCategory) {
  const canvas = document.getElementById('category-chart');
  const emptyMsg = document.getElementById('chart-empty');
  const legendWrap = document.getElementById('chart-legend');

  if (!canvas) return;

  const expenseData = (byCategory || []).filter((row) => row.type === 'expense');

  if (expenseData.length === 0) {
    emptyMsg.hidden = false;
    canvas.hidden = true;
    if (legendWrap) legendWrap.innerHTML = '';
    return;
  }

  emptyMsg.hidden = true;
  canvas.hidden = false;

  // ปรับความคมชัดระดับ HiDPI / Retina Screen
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = 320;
  const displayHeight = 220;

  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  const total = expenseData.reduce((sum, row) => sum + Number(row.total), 0);

  if (total <= 0) {
    emptyMsg.hidden = false;
    canvas.hidden = true;
    if (legendWrap) legendWrap.innerHTML = '';
    return;
  }
  const centerX = displayWidth / 2;
  const centerY = displayHeight / 2;
  const outerRadius = 88;
  const innerRadius = 56;
  let startAngle = -Math.PI / 2;

  // วาด Segment รูปโดนัท
  expenseData.forEach((row, i) => {
    const sliceAngle = (Number(row.total) / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();

    // ขอบเส้นแบ่งสีขาวบางๆ ให้ดูเนียนตา
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle += sliceAngle;
  });

  // วาดข้อความสรุปตรงกลางโดนัท
  ctx.fillStyle = '#64748B';
  ctx.font = '500 11.5px Prompt, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('รวมรายจ่าย', centerX, centerY - 9);

  ctx.fillStyle = '#0F172A';
  ctx.font = '700 15px Prompt, sans-serif';
  ctx.fillText(THB.format(total), centerX, centerY + 11);

  // วาด Legend Breakdown ด้านล่าง
  if (legendWrap) {
    legendWrap.innerHTML = '';
    expenseData.forEach((row, i) => {
      const percent = ((Number(row.total) / total) * 100).toFixed(1);
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const icon = CATEGORY_ICONS[row.category] || '🏷️';

      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <div class="legend-left">
          <span class="legend-dot" style="background: ${color};"></span>
          <span>${icon} ${escapeHtml(row.category)}</span>
        </div>
        <div class="legend-right">
          <span class="legend-percent">${percent}%</span>
          <span class="legend-amount">${THB.format(row.total)}</span>
        </div>
      `;
      legendWrap.appendChild(item);
    });
  }
}
