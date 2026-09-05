// js/dashboard.js
// จัดการหน้า dashboard ทั้งหมด: โหลดรายการ, สรุปยอด, ฟอร์มเพิ่ม/แก้ไข/ลบ, กรองข้อมูล, วาดกราฟวงกลม

const THB = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
const THAI_DATE = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

let allCategories = new Set();

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('current-username').textContent = localStorage.getItem('username') || 'ผู้ใช้งาน';
  document.getElementById('today-date').textContent = THAI_DATE.format(new Date());
  document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);

  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'index.html';
  });

  document.getElementById('transaction-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('tx-cancel-btn').addEventListener('click', resetForm);
  document.getElementById('apply-filter-btn').addEventListener('click', loadAll);
  document.getElementById('reset-filter-btn').addEventListener('click', () => {
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-category').value = '';
    loadAll();
  });

  loadAll();
});

// สร้าง query string จากค่า filter ปัจจุบัน
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

// โหลดทั้งรายการและสรุปยอดพร้อมกัน
async function loadAll() {
  const query = buildFilterQuery();
  try {
    const [transactions, summary] = await Promise.all([
      api.getTransactions(query),
      api.getSummary(query),
    ]);
    updateCategoryOptions(transactions);
    renderTable(transactions);
    renderSummary(summary);
    renderChart(summary.by_category);
  } catch (err) {
    console.error(err);
    alert(err.message || 'ไม่สามารถโหลดข้อมูลได้');
  }
}

// อัปเดตรายการหมวดหมู่ทั้ง dropdown filter และ datalist ในฟอร์ม
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
  tbody.innerHTML = '';

  if (transactions.length === 0) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  transactions.forEach((t) => {
    const tr = document.createElement('tr');
    const isIncome = t.type === 'income';

    tr.innerHTML = `
      <td>${THAI_DATE.format(new Date(t.transaction_date))}</td>
      <td><span class="tag ${isIncome ? 'tag--income' : 'tag--expense'}">${isIncome ? 'รายรับ' : 'รายจ่าย'}</span></td>
      <td>${escapeHtml(t.category)}</td>
      <td>${escapeHtml(t.note || '-')}</td>
      <td class="align-right ${isIncome ? 'amount--income' : 'amount--expense'}">${isIncome ? '+' : '-'}${THB.format(t.amount)}</td>
      <td class="align-right">
        <div class="row-actions">
          <button class="btn-icon" data-action="edit" data-id="${t.id}">แก้ไข</button>
          <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${t.id}">ลบ</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(t));
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => handleDelete(t.id));
  });
}

// ป้องกัน XSS แบบง่ายเมื่อแทรกข้อความลง innerHTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// แสดงยอดสรุปด้านบน
function renderSummary(summary) {
  document.getElementById('summary-income').textContent = THB.format(summary.total_income);
  document.getElementById('summary-expense').textContent = THB.format(summary.total_expense);
  const balanceEl = document.getElementById('summary-balance');
  balanceEl.textContent = THB.format(summary.balance);
  balanceEl.style.color = summary.balance >= 0 ? 'var(--income)' : 'var(--expense)';
}

// --- ฟอร์มเพิ่ม/แก้ไขรายการ ---

async function handleFormSubmit(e) {
  e.preventDefault();

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
    } else {
      await api.createTransaction(payload);
    }
    resetForm();
    loadAll();
  } catch (err) {
    alert(err.message || 'ไม่สามารถบันทึกรายการได้');
  }
}

function startEdit(t) {
  document.getElementById('form-title').textContent = 'แก้ไขรายการ';
  document.getElementById('tx-id').value = t.id;
  document.getElementById('tx-type').value = t.type;
  document.getElementById('tx-amount').value = t.amount;
  document.getElementById('tx-category').value = t.category;
  document.getElementById('tx-date').value = t.transaction_date.slice(0, 10);
  document.getElementById('tx-note').value = t.note || '';
  document.getElementById('tx-submit-btn').textContent = 'บันทึกการแก้ไข';
  document.getElementById('tx-cancel-btn').hidden = false;
  document.getElementById('transaction-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  document.getElementById('form-title').textContent = 'เพิ่มรายการ';
  document.getElementById('transaction-form').reset();
  document.getElementById('tx-id').value = '';
  document.getElementById('tx-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('tx-submit-btn').textContent = 'บันทึกรายการ';
  document.getElementById('tx-cancel-btn').hidden = true;
}

async function handleDelete(id) {
  if (!confirm('ยืนยันการลบรายการนี้หรือไม่?')) return;
  try {
    await api.deleteTransaction(id);
    loadAll();
  } catch (err) {
    alert(err.message || 'ไม่สามารถลบรายการได้');
  }
}

// --- กราฟวงกลมแสดงรายจ่ายแยกตามหมวดหมู่ (วาดด้วย Canvas API ล้วนๆ ไม่ใช้ไลบรารีภายนอก) ---

const CHART_COLORS = ['#B5472F', '#C9A227', '#2F6F4E', '#5C7A8A', '#8A5C7A', '#7A8A5C', '#4F6B8A', '#8A6B4F'];

function renderChart(byCategory) {
  const canvas = document.getElementById('category-chart');
  const emptyMsg = document.getElementById('chart-empty');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const expenseData = (byCategory || []).filter((row) => row.type === 'expense');

  if (expenseData.length === 0) {
    emptyMsg.hidden = false;
    canvas.hidden = true;
    return;
  }
  emptyMsg.hidden = true;
  canvas.hidden = false;

  const total = expenseData.reduce((sum, row) => sum + Number(row.total), 0);
  const centerX = 100;
  const centerY = 130;
  const radius = 85;
  let startAngle = -Math.PI / 2;

  expenseData.forEach((row, i) => {
    const sliceAngle = (Number(row.total) / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    startAngle += sliceAngle;
  });

  // วาด legend ด้านขวาของวงกลม
  const legendX = 210;
  let legendY = 30;
  ctx.font = '13px Inter, sans-serif';
  ctx.textBaseline = 'middle';

  expenseData.forEach((row, i) => {
    const percent = ((Number(row.total) / total) * 100).toFixed(0);
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillRect(legendX, legendY - 6, 12, 12);
    ctx.fillStyle = '#1B2620';
    ctx.fillText(`${row.category} (${percent}%)`, legendX + 18, legendY);
    legendY += 22;
  });
}
