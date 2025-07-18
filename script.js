const alertBox = document.getElementById('dataAlert');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const chartsContainer = document.getElementById('chartsContainer');
document.getElementById('year').textContent = new Date().getFullYear();

const LOCAL_DATA_URL = 'data.json';

let rawData = [];
let filteredData = [];
let columns = [];
let numericColumns = [];

// ---------- Data Load ----------
async function loadData() {
  showAlert('Loading data...', 'warning');
  try {
    const res = await fetch(LOCAL_DATA_URL);
    if (!res.ok) throw new Error(res.status);
    rawData = await res.json();
    console.log('Loaded local data.json:', rawData);
    showAlert('Using local embedded data.', 'info', true);
    init();
  } catch (err) {
    console.error('Failed to load local data:', err);
    showAlert('Failed to load data.', 'danger');
  }
}

function showAlert(msg, style, autoHide=false) {
  alertBox.textContent = msg;
  alertBox.className = `alert alert-${style}`;
  alertBox.classList.remove('d-none');
  if (autoHide) {
    setTimeout(() => alertBox.classList.add('d-none'), 2500);
  }
}

// ---------- Init ----------
function init() {
  if (!Array.isArray(rawData) || !rawData.length) {
    showAlert('No data to display.', 'warning');
    return;
  }
  columns = getColumns(rawData);
  numericColumns = getNumericColumns(rawData, columns);
  filteredData = [...rawData];

  buildTableHeader(columns);
  renderTableRows(filteredData, columns);
  buildCharts(filteredData, numericColumns, columns);

  searchInput.addEventListener('input', handleSearch);
}

function getColumns(data) {
  const colSet = new Set();
  data.forEach(row => {
    Object.keys(row).forEach(k => colSet.add(k));
  });
  return Array.from(colSet);
}

function getNumericColumns(data, cols) {
  const numeric = [];
  cols.forEach(col => {
    let numericCount = 0;
    let totalCount = 0;
    data.forEach(row => {
      const val = row[col];
      if (val !== null && val !== undefined && val !== '') {
        totalCount++;
        if (!isNaN(Number(val))) numericCount++;
      }
    });
    if (totalCount && numericCount / totalCount >= 0.5) numeric.push(col);
  });
  return numeric;
}

function buildTableHeader(cols) {
  const ths = cols.map(c => `<th scope="col">${escapeHtml(c)}</th>`).join('');
  tableHead.innerHTML = `<tr>${ths}</tr>`;
}

function renderTableRows(rows, cols) {
  const trs = rows.map(row => {
    const tds = cols.map(c => `<td>${escapeHtml(row[c])}</td>`).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  tableBody.innerHTML = trs;
}

function handleSearch() {
  const q = searchInput.value.toLowerCase().trim();
  if (!q) {
    filteredData = [...rawData];
  } else {
    filteredData = rawData.filter(row => {
      return Object.values(row).some(v =>
        String(v ?? '').toLowerCase().includes(q)
      );
    });
  }
  renderTableRows(filteredData, columns);
  buildCharts(filteredData, numericColumns, columns);
}

let chartInstances = [];
function clearCharts() {
  chartInstances.forEach(ch => ch.destroy());
  chartInstances = [];
  chartsContainer.innerHTML = '';
}

function buildCharts(data, numCols, cols) {
  clearCharts();
  if (!numCols.length || !data.length) return;

  const dateCol = cols.find(c => /date/i.test(c));
  const labels = dateCol
    ? data.map(row => row[dateCol])
    : data.map((_, i) => i + 1);

  numCols.forEach(col => {
    const container = document.createElement('div');
    container.className = 'col-12 col-md-6';
    container.innerHTML = `
      <div class="chart-card">
        <h3 class="h6 mb-3">${escapeHtml(col)}</h3>
        <canvas></canvas>
      </div>
    `;
    const canvas = container.querySelector('canvas');
    chartsContainer.appendChild(container);

    const values = data.map(row => {
      const v = Number(row[col]);
      return isNaN(v) ? null : v;
    });

    const ch = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: col,
          data: values,
          spanGaps: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: !!dateCol, text: dateCol || 'Index' } },
          y: { beginAtZero: false }
        },
        plugins: { legend: { display: false } }
      }
    });
    chartInstances.push(ch);
  });
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

loadData();
