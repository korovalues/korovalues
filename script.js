const DATA_FILES = ['values.json', 'values'];
const cardsGrid = document.getElementById('cards-grid');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const rareToggle = document.getElementById('rare-toggle');
const resetButton = document.getElementById('reset-button');
const metricCount = document.getElementById('metric-count');
const metricRare = document.getElementById('metric-rare');
const metricAverage = document.getElementById('metric-average');
const sideTabs = document.querySelectorAll('.side-tabs .tab');
const panels = document.querySelectorAll('.panel');

const tradeSearchInputs = {
  left: document.getElementById('trade-search-left'),
  right: document.getElementById('trade-search-right'),
};
const tradeSuggestions = {
  left: document.getElementById('trade-suggestions-left'),
  right: document.getElementById('trade-suggestions-right'),
};
const tradeLists = {
  left: document.getElementById('trade-list-left'),
  right: document.getElementById('trade-list-right'),
};
const tradeTotals = {
  left: {
    value: document.getElementById('trade-total-value-left'),
    rap: document.getElementById('trade-total-rap-left'),
  },
  right: {
    value: document.getElementById('trade-total-value-right'),
    rap: document.getElementById('trade-total-rap-right'),
  },
};
const tradeNetDifference = document.getElementById('trade-net-difference');
const tradeNote = document.getElementById('trade-note');

let items = [];
let filteredItems = [];
let tradeLeft = [];
let tradeRight = [];

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatValue(value) {
  if (!value || value === 0) return 'N/A';
  return `₵ ${formatNumber(value)}`;
}

function getTrendLabel(trend) {
  const normalized = String(trend || 'Unknown').toLowerCase();
  if (normalized.includes('stable')) return 'Stable';
  if (normalized.includes('up') || normalized.includes('rise') || normalized.includes('bull')) return 'Trending';
  if (normalized.includes('down') || normalized.includes('fall') || normalized.includes('bear')) return 'Falling';
  return normalized === 'none' ? 'None' : trend || 'Unknown';
}

function lookupItemById(id) {
  return items.find(entry => entry._id === id) || null;
}

function animateCount(element, value, prefix = '') {
  const start = 0;
  const end = Number(value);
  const duration = 650;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const current = Math.round(start + (end - start) * progress);
    element.textContent = `${prefix}${formatNumber(current)}`;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function renderMetrics(itemsList) {
  const total = itemsList.length;
  const rareCount = itemsList.filter(item => item.IsRare).length;
  const average = total ? Math.round(itemsList.reduce((sum, item) => sum + Number(item.Value || 0), 0) / total) : 0;

  animateCount(metricCount, total);
  animateCount(metricRare, rareCount);
  animateCount(metricAverage, average, '₵ ');
}

function createBadge(text, type = '') {
  const badge = document.createElement('span');
  badge.className = `badge ${type}`.trim();
  badge.textContent = text;
  return badge;
}

function renderCard(item) {
  const card = document.createElement('article');
  card.className = 'item-card';
  card.innerHTML = `
    <div class="item-top">
      <div class="thumbnail"><img src="${item.Image || ''}" alt="${item.Name || 'Item'} thumbnail" loading="lazy" /></div>
      <div class="item-labels">
        <h2 class="item-title">${item.Name || 'Unknown Item'}</h2>
        <p class="item-acronym">${item.Acronym || '—'}</p>
        <div class="badge-row"></div>
      </div>
    </div>
    <div class="data-grid">
      <div class="data-row"><span>Value</span><strong class="${item.Value ? 'value-positive' : 'value-zero'}">${formatValue(item.Value)}</strong></div>
      <div class="data-row"><span>RAP</span><strong>${formatNumber(item.RAP || 0)}</strong></div>
      <div class="data-row"><span>Demand</span><strong>${item.Demand || 'Unknown'}</strong></div>
      <div class="data-row"><span>Trend</span><strong>${getTrendLabel(item.Trend)}</strong></div>
      <div class="data-row"><span>Item ID</span><strong>${item.itemId || '—'}</strong></div>
      <div class="data-row"><span>Market Link</span><strong>${item.Link ? `<a class="card-link" href="${item.Link}" target="_blank" rel="noreferrer noopener">View item</a>` : 'Unavailable'}</strong></div>
    </div>
  `;

  const badgeRow = card.querySelector('.badge-row');
  badgeRow.append(createBadge(item.Demand || 'Unknown', 'stable'));
  badgeRow.append(createBadge(getTrendLabel(item.Trend), item.Trend?.toLowerCase().includes('stable') ? 'stable' : 'trending'));
  if (item.IsRare) badgeRow.append(createBadge('Rare', 'rare'));
  if (Array.isArray(item.Tags) && item.Tags.length) {
    item.Tags.slice(0, 2).forEach(tag => badgeRow.append(createBadge(tag, 'none')));
  }

  return card;
}

function sortItems(list) {
  const order = sortSelect.value;
  return [...list].sort((a, b) => {
    if (order === 'valueDesc') return Number(b.Value || 0) - Number(a.Value || 0);
    if (order === 'valueAsc') return Number(a.Value || 0) - Number(b.Value || 0);
    if (order === 'rapDesc') return Number(b.RAP || 0) - Number(a.RAP || 0);
    if (order === 'nameAsc') return String(a.Name || '').localeCompare(String(b.Name || ''));
    if (order === 'demandDesc') return String(b.Demand || '').localeCompare(String(a.Demand || ''));
    return 0;
  });
}

function filterItems() {
  const query = searchInput.value.trim().toLowerCase();
  const rareOnly = rareToggle.checked;

  filteredItems = items.filter(item => {
    const matchesText = [item.Name, item.Acronym, item.Demand, item.Trend, item.Tags?.join(' ')].filter(Boolean)
      .join(' ').toLowerCase().includes(query);
    const matchesRare = rareOnly ? item.IsRare : true;
    return matchesText && matchesRare;
  });

  const sorted = sortItems(filteredItems);
  renderCards(sorted);
  renderMetrics(sorted);
}

function renderCards(list) {
  cardsGrid.innerHTML = '';
  if (!list.length) {
    cardsGrid.innerHTML = '<p class="footer-note">No items match your search and filter settings. Try clearing filters or adjusting the search term.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  list.forEach(item => fragment.appendChild(renderCard(item)));
  cardsGrid.appendChild(fragment);
}

function setActivePanel(panelId) {
  panels.forEach(panel => {
    const active = panel.id === panelId;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  sideTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.panel === panelId));
}

function filterTradeItems(side, query) {
  const normalized = String(query || '').trim().toLowerCase();
  const pool = items.filter(item => Number(item.Value || 0) > 0);
  if (!normalized) return pool.slice(0, 12);

  return pool.filter(item => {
    const searchText = [item.Name, item.Acronym, item.Demand, item.Trend, item.Tags?.join(' ')].filter(Boolean)
      .join(' ').toLowerCase();
    return searchText.includes(normalized);
  }).slice(0, 12);
}

function renderTradeSuggestions(side, matches) {
  const box = tradeSuggestions[side];
  box.innerHTML = '';

  if (!matches.length) {
    box.innerHTML = '<div class="suggestion-item">No matching items found.</div>';
    box.classList.remove('hidden');
    return;
  }

  matches.forEach(item => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'suggestion-item';
    row.setAttribute('role', 'option');
    row.innerHTML = `
      <span class="suggestion-title">${item.Name || 'Unnamed'} ${item.Acronym ? `(${item.Acronym})` : ''}</span>
      <span class="suggestion-meta">Value: ${item.Value ? formatValue(item.Value) : 'N/A'} • RAP: ${formatNumber(item.RAP || 0)} • ${getTrendLabel(item.Trend)}</span>
    `;
    row.addEventListener('click', () => addTradeItem(item, side));
    box.appendChild(row);
  });
  box.classList.remove('hidden');
}

function addTradeItem(item, side) {
  const bucket = side === 'left' ? tradeLeft : tradeRight;
  const existing = bucket.find(entry => entry._id === item._id);
  if (existing) {
    existing.quantity += 1;
  } else {
    bucket.push({ _id: item._id, quantity: 1 });
  }
  tradeSearchInputs[side].value = '';
  tradeSuggestions[side].classList.add('hidden');
  updateTradePanel();
}

function updateTradeItemQuantity(side, itemId, quantity) {
  const bucket = side === 'left' ? tradeLeft : tradeRight;
  const entry = bucket.find(entry => entry._id === itemId);
  if (!entry) return;
  entry.quantity = Math.max(1, Number(quantity) || 1);
  updateTradePanel();
}

function removeTradeItem(side, itemId) {
  if (side === 'left') {
    tradeLeft = tradeLeft.filter(entry => entry._id !== itemId);
  } else {
    tradeRight = tradeRight.filter(entry => entry._id !== itemId);
  }
  updateTradePanel();
}

function computeTradeSummary(bucket) {
  return bucket.reduce((summary, entry) => {
    const item = lookupItemById(entry._id);
    if (!item) return summary;
    const unitValue = Number(item.Value || 0);
    const rapValue = Number(item.RAP || 0);
    summary.value += unitValue * entry.quantity;
    summary.rap += rapValue * entry.quantity;
    return summary;
  }, { value: 0, rap: 0 });
}

function renderTradeList(side) {
  const bucket = side === 'left' ? tradeLeft : tradeRight;
  const container = tradeLists[side];
  container.innerHTML = '';

  if (!bucket.length) {
    container.innerHTML = `<div class="footer-note">No items added yet. Search for items and tap one to add it to side ${side === 'left' ? 'A' : 'B'}.</div>`;
    return;
  }

  bucket.forEach(entry => {
    const item = lookupItemById(entry._id);
    if (!item) return;

    const row = document.createElement('div');
    row.className = 'trade-item-row';
    row.innerHTML = `
      <div><img src="${item.Image || ''}" alt="${item.Name || ''}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" /></div>
      <div>
        <strong>${item.Name || 'Unnamed'}</strong>
        <small>${item.Acronym ? `(${item.Acronym}) • ${getTrendLabel(item.Trend)}` : getTrendLabel(item.Trend)}</small>
      </div>
      <input type="number" min="1" value="${entry.quantity}" aria-label="Quantity for ${item.Name || 'item'}" />
      <strong>${item.Value ? formatValue(item.Value) : 'N/A'}</strong>
      <button type="button" aria-label="Remove ${item.Name || 'item'}">×</button>
    `;

    const quantityInput = row.querySelector('input');
    const removeButton = row.querySelector('button');
    quantityInput.addEventListener('input', () => updateTradeItemQuantity(side, entry._id, quantityInput.value));
    removeButton.addEventListener('click', () => removeTradeItem(side, entry._id));

    container.appendChild(row);
  });
}

function updateTradeTotals() {
  const leftSummary = computeTradeSummary(tradeLeft);
  const rightSummary = computeTradeSummary(tradeRight);

  tradeTotals.left.value.textContent = leftSummary.value ? formatValue(leftSummary.value) : '—';
  tradeTotals.left.rap.textContent = leftSummary.rap ? formatNumber(leftSummary.rap) : '—';
  tradeTotals.right.value.textContent = rightSummary.value ? formatValue(rightSummary.value) : '—';
  tradeTotals.right.rap.textContent = rightSummary.rap ? formatNumber(rightSummary.rap) : '—';

  const diff = leftSummary.value - rightSummary.value;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  tradeNetDifference.textContent = diff === 0 ? 'Balanced' : `${sign}${formatValue(Math.abs(diff))}`;
  tradeNote.textContent = tradeLeft.length || tradeRight.length
    ? 'Adjust quantities or add items to improve trade parity.'
    : 'Add items to both sides to compare the deal balance.';
}

function updateTradePanel() {
  renderTradeList('left');
  renderTradeList('right');
  updateTradeTotals();
}

function setupTradeInputs() {
  ['left', 'right'].forEach(side => {
    const input = tradeSearchInputs[side];
    input.addEventListener('input', () => {
      renderTradeSuggestions(side, filterTradeItems(side, input.value));
    });
    input.addEventListener('focus', () => {
      renderTradeSuggestions(side, filterTradeItems(side, input.value));
    });
  });

  window.addEventListener('click', event => {
    Object.values(tradeSuggestions).forEach(box => {
      if (!event.composedPath().includes(box) && !event.composedPath().includes(tradeSearchInputs.left) && !event.composedPath().includes(tradeSearchInputs.right)) {
        box.classList.add('hidden');
      }
    });
  });
}

async function loadData() {
  for (const file of DATA_FILES) {
    try {
      const response = await fetch(file);
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data)) return data;
      if (typeof data === 'object' && data !== null) return Object.values(data);
    } catch (error) {
      continue;
    }
  }
  throw new Error('Could not load data from values.json or values. Please serve the folder with a static web server.');
}

function initTabs() {
  sideTabs.forEach(tab => {
    tab.addEventListener('click', () => setActivePanel(tab.dataset.panel));
  });
}

async function init() {
  try {
    items = await loadData();
    initTabs();
    setupTradeInputs();
    filterItems();
    updateTradePanel();
  } catch (error) {
    cardsGrid.innerHTML = `<div class="footer-note">Error loading data: ${error.message}</div>`;
    console.error(error);
  }
}

searchInput.addEventListener('input', () => filterItems());
sortSelect.addEventListener('change', () => filterItems());
rareToggle.addEventListener('change', () => filterItems());
resetButton.addEventListener('click', () => {
  searchInput.value = '';
  sortSelect.value = 'valueDesc';
  rareToggle.checked = false;
  tradeSearchInputs.left.value = '';
  tradeSearchInputs.right.value = '';
  tradeLeft = [];
  tradeRight = [];
  tradeSuggestions.left.classList.add('hidden');
  tradeSuggestions.right.classList.add('hidden');
  filterItems();
  updateTradePanel();
});

init();
