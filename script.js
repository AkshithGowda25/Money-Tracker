/**
 * RupeeTrack - Modern Expense & Savings Tracker
 * Vanilla JavaScript implementation (No frameworks, no build step)
 *
 * Code Structure:
 * 1. State & Constants
 * 2. Storage Functions (LocalStorage)
 * 3. Calculation Functions (Totals, 6-Month trends, Goal progress)
 * 4. Rendering Functions (DOM updates & Chart.js)
 * 5. Event Listeners & Validation
 * 6. Utility Functions (Formatters, CSV Export, Toasts)
 * 7. Initialization
 */

// =============================================================================
// 1. STATE & CONSTANTS
// =============================================================================

// Standard category icons
const CATEGORY_ICONS = {
  Food: '🍔',
  Travel: '✈️',
  Gym: '💪',
  Shopping: '🛍️',
  Education: '📚',
  Bills: '🧾',
  Other: '✨'
};

// Default starter accounts if none exist
const DEFAULT_ACCOUNTS = [
  { id: 'acc_1', name: 'SBI', mode: 'UPI' },
  { id: 'acc_2', name: 'HDFC', mode: 'Debit Card' },
  { id: 'acc_3', name: 'Cash In Hand', mode: 'Cash' }
];

// Application Global State
const state = {
  accounts: [],
  transactions: [],
  goals: [],
  selectedMonth: '', // Format: 'YYYY-MM'
  searchTerm: '',
  typeFilter: 'all'
};

// Chart.js instances
let categoryChartInstance = null;
let trendChartInstance = null;

// =============================================================================
// 2. STORAGE FUNCTIONS (LocalStorage)
// =============================================================================

/**
 * Loads data from localStorage into application state.
 * If storage is empty, sets initial default accounts.
 */
function loadFromStorage() {
  try {
    const storedAccounts = localStorage.getItem('rt_accounts');
    const storedTransactions = localStorage.getItem('rt_transactions');
    const storedGoals = localStorage.getItem('rt_goals');
    const storedMonth = localStorage.getItem('rt_selected_month');

    state.accounts = storedAccounts ? JSON.parse(storedAccounts) : [...DEFAULT_ACCOUNTS];
    state.transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
    state.goals = storedGoals ? JSON.parse(storedGoals) : [];

    // Current month as YYYY-MM
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    state.selectedMonth = storedMonth || currentMonthStr;

    // Save defaults back to storage if fresh
    if (!storedAccounts) {
      saveAccountsToStorage();
    }
  } catch (error) {
    console.error('Error reading localStorage data:', error);
    showToast('Failed to load local storage data', 'error');
  }
}

/**
 * Saves current accounts list to localStorage.
 */
function saveAccountsToStorage() {
  localStorage.setItem('rt_accounts', JSON.stringify(state.accounts));
}

/**
 * Saves current transactions list to localStorage.
 */
function saveTransactionsToStorage() {
  localStorage.setItem('rt_transactions', JSON.stringify(state.transactions));
}

/**
 * Saves current savings goals list to localStorage.
 */
function saveGoalsToStorage() {
  localStorage.setItem('rt_goals', JSON.stringify(state.goals));
}

/**
 * Saves current selected month to localStorage.
 */
function saveMonthToStorage() {
  localStorage.setItem('rt_selected_month', state.selectedMonth);
}

// =============================================================================
// 3. CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculates total income, total expense, and balance for the selected month.
 * @param {string} monthStr - 'YYYY-MM'
 * @returns {Object} { totalIncome, totalExpense, balance, incomeCount, expenseCount, savingsRate }
 */
function calculateMonthlySummary(monthStr) {
  const monthTransactions = state.transactions.filter(t => t.date.startsWith(monthStr));

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  monthTransactions.forEach(t => {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amount;
      incomeCount++;
    } else {
      totalExpense += amount;
      expenseCount++;
    }
  });

  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

  return {
    totalIncome,
    totalExpense,
    balance,
    incomeCount,
    expenseCount,
    savingsRate
  };
}

/**
 * Aggregates expenses by category for the selected month.
 * @param {string} monthStr - 'YYYY-MM'
 * @returns {Object} { labels: string[], amounts: number[] }
 */
function calculateCategoryExpenses(monthStr) {
  const monthExpenses = state.transactions.filter(
    t => t.date.startsWith(monthStr) && t.type === 'expense'
  );

  const categoryMap = {};

  monthExpenses.forEach(t => {
    // If it's 'Other' with a custom title, display e.g. "🍿 Movies" or custom title
    let categoryDisplay = t.category;
    if (t.category === 'Other' && t.customName) {
      const emoji = t.customEmoji ? `${t.customEmoji} ` : '✨ ';
      categoryDisplay = `${emoji}${t.customName}`;
    } else if (CATEGORY_ICONS[t.category]) {
      categoryDisplay = `${CATEGORY_ICONS[t.category]} ${t.category}`;
    }

    const amt = Number(t.amount) || 0;
    categoryMap[categoryDisplay] = (categoryMap[categoryDisplay] || 0) + amt;
  });

  return {
    labels: Object.keys(categoryMap),
    amounts: Object.values(categoryMap)
  };
}

/**
 * Computes income vs expense for the last 6 calendar months leading to the selected month.
 * @param {string} referenceMonthStr - 'YYYY-MM'
 * @returns {Object} { months: string[], incomeData: number[], expenseData: number[] }
 */
function calculateSixMonthTrends(referenceMonthStr) {
  const [yearStr, monthStr] = referenceMonthStr.split('-');
  const refDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);

  const months = [];
  const incomeData = [];
  const expenseData = [];

  // Loop back 5 months to current month (total 6 months)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleString('en-IN', { month: 'short' });

    months.push(monthLabel);

    let inc = 0;
    let exp = 0;

    state.transactions.forEach(t => {
      if (t.date.startsWith(key)) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') inc += amt;
        else exp += amt;
      }
    });

    incomeData.push(inc);
    expenseData.push(exp);
  }

  return { months, incomeData, expenseData };
}

/**
 * Calculates progress percentage and remaining amount for a savings goal.
 * @param {Object} goal
 * @returns {Object} { percentage, remaining }
 */
function calculateGoalProgress(goal) {
  const current = Number(goal.currentAmount) || 0;
  const target = Number(goal.targetAmount) || 1;
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);

  return { percentage, remaining };
}

// =============================================================================
// 4. RENDERING FUNCTIONS (DOM & Charts)
// =============================================================================

/**
 * Refreshes all UI components in the application.
 */
function renderAll() {
  renderMonthControls();
  renderSummaryCards();
  renderAccountsList();
  renderAccountSelectDropdown();
  renderTransactionsList();
  renderGoalsList();
  renderCategoryChart();
  renderTrendChart();
}

/**
 * Updates the month selector input and labels.
 */
function renderMonthControls() {
  const monthInput = document.getElementById('month-input');
  if (monthInput) {
    monthInput.value = state.selectedMonth;
  }

  const categoryPeriod = document.getElementById('category-chart-period');
  if (categoryPeriod) {
    categoryPeriod.textContent = formatMonthTitle(state.selectedMonth);
  }

  const listMonthIndicator = document.getElementById('tx-list-month-indicator');
  if (listMonthIndicator) {
    listMonthIndicator.textContent = `Showing records for ${formatMonthTitle(state.selectedMonth)}`;
  }
}

/**
 * Renders the top summary cards (Income, Expense, Balance, Savings Rate).
 */
function renderSummaryCards() {
  const summary = calculateMonthlySummary(state.selectedMonth);

  const totalIncomeEl = document.getElementById('total-income');
  const totalExpenseEl = document.getElementById('total-expense');
  const netBalanceEl = document.getElementById('net-balance');
  const savingsRateEl = document.getElementById('savings-rate');

  const incomeCountEl = document.getElementById('income-count-label');
  const expenseCountEl = document.getElementById('expense-count-label');
  const balanceSubtextEl = document.getElementById('balance-subtext');

  if (totalIncomeEl) totalIncomeEl.textContent = formatINR(summary.totalIncome);
  if (totalExpenseEl) totalExpenseEl.textContent = formatINR(summary.totalExpense);
  
  if (netBalanceEl) {
    netBalanceEl.textContent = (summary.balance >= 0 ? '+' : '-') + formatINR(Math.abs(summary.balance));
    netBalanceEl.classList.remove('positive', 'negative');
    if (summary.balance > 0) netBalanceEl.classList.add('positive');
    else if (summary.balance < 0) netBalanceEl.classList.add('negative');
  }

  if (savingsRateEl) savingsRateEl.textContent = `${summary.savingsRate}%`;

  if (incomeCountEl) incomeCountEl.textContent = `${summary.incomeCount} transaction${summary.incomeCount === 1 ? '' : 's'}`;
  if (expenseCountEl) expenseCountEl.textContent = `${summary.expenseCount} transaction${summary.expenseCount === 1 ? '' : 's'}`;
  
  if (balanceSubtextEl) {
    if (summary.balance > 0) balanceSubtextEl.textContent = 'Surplus this month 🎉';
    else if (summary.balance < 0) balanceSubtextEl.textContent = 'Deficit this month ⚠️';
    else balanceSubtextEl.textContent = 'Break-even';
  }
}

/**
 * Renders user's bank accounts & payment modes in the top accounts bar.
 */
function renderAccountsList() {
  const container = document.getElementById('accounts-container');
  if (!container) return;

  container.innerHTML = '';

  if (state.accounts.length === 0) {
    container.innerHTML = `<span class="summary-subtext">No accounts added yet. Click "+ Add Account" to configure your bank/UPI modes.</span>`;
    return;
  }

  state.accounts.forEach(acc => {
    const pill = document.createElement('div');
    pill.className = 'account-pill';

    // Choose an icon based on payment mode
    const modeLower = (acc.mode || '').toLowerCase();
    let modeIcon = '🏦';
    if (modeLower.includes('upi')) modeIcon = '⚡';
    else if (modeLower.includes('card')) modeIcon = '💳';
    else if (modeLower.includes('cash')) modeIcon = '💵';
    else if (modeLower.includes('net')) modeIcon = '🌐';
    else if (modeLower.includes('wallet')) modeIcon = '👛';

    pill.innerHTML = `
      <div class="account-pill-icon" aria-hidden="true">${modeIcon}</div>
      <div class="account-pill-info">
        <span class="account-pill-name">${escapeHTML(acc.name)}</span>
        <span class="account-pill-mode">${escapeHTML(acc.mode)}</span>
      </div>
      <button class="account-pill-delete" data-id="${acc.id}" title="Remove ${escapeHTML(acc.name)}" aria-label="Delete account ${escapeHTML(acc.name)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    `;

    // Delete account listener
    pill.querySelector('.account-pill-delete').addEventListener('click', () => {
      deleteAccount(acc.id);
    });

    container.appendChild(pill);
  });
}

/**
 * Populates the transaction form's Account dropdown with available accounts.
 */
function renderAccountSelectDropdown() {
  const select = document.getElementById('tx-account');
  if (!select) return;

  const previousVal = select.value;
  select.innerHTML = '';

  if (state.accounts.length === 0) {
    const opt = document.createElement('option');
    opt.value = 'General';
    opt.textContent = 'General / Cash';
    select.appendChild(opt);
    return;
  }

  state.accounts.forEach(acc => {
    const opt = document.createElement('option');
    const label = `${acc.name} (${acc.mode})`;
    opt.value = label;
    opt.textContent = label;
    select.appendChild(opt);
  });

  if (previousVal && Array.from(select.options).some(o => o.value === previousVal)) {
    select.value = previousVal;
  }
}

/**
 * Renders the transactions list filtered by current month, search term, and type.
 */
function renderTransactionsList() {
  const container = document.getElementById('transactions-list');
  if (!container) return;

  container.innerHTML = '';

  // Filter transactions
  let filtered = state.transactions.filter(t => t.date.startsWith(state.selectedMonth));

  if (state.typeFilter !== 'all') {
    filtered = filtered.filter(t => t.type === state.typeFilter);
  }

  if (state.searchTerm.trim() !== '') {
    const query = state.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(t => {
      const noteMatch = (t.note || '').toLowerCase().includes(query);
      const categoryMatch = (t.category || '').toLowerCase().includes(query);
      const customNameMatch = (t.customName || '').toLowerCase().includes(query);
      const accountMatch = (t.account || '').toLowerCase().includes(query);
      return noteMatch || categoryMatch || customNameMatch || accountMatch;
    });
  }

  // Sort newest first: primary by date desc, secondary by createdAt/id desc
  filtered.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Empty state handling
  if (filtered.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">💸</div>
      <h4>No transactions found</h4>
      <p>There are no transactions recorded for ${formatMonthTitle(state.selectedMonth)}${state.searchTerm ? ' matching your search' : ''}. Add an expense or income using the form above!</p>
    `;
    container.appendChild(emptyState);
    return;
  }

  // Render items
  filtered.forEach(tx => {
    const item = document.createElement('div');
    item.className = 'tx-item';
    item.setAttribute('role', 'listitem');

    // Emoji & Category title
    let icon = CATEGORY_ICONS[tx.category] || '💸';
    let displayName = tx.category;

    if (tx.category === 'Other') {
      displayName = tx.customName ? tx.customName : 'Other';
      icon = tx.customEmoji ? tx.customEmoji : '✨';
    }

    const isIncome = tx.type === 'income';
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'income' : 'expense';

    item.innerHTML = `
      <div class="tx-left">
        <div class="tx-category-icon" aria-hidden="true">${icon}</div>
        <div class="tx-details">
          <div class="tx-title-row">
            <span class="tx-category-name">${escapeHTML(displayName)}</span>
            ${tx.account ? `<span class="tx-account-tag">${escapeHTML(tx.account)}</span>` : ''}
          </div>
          ${tx.note ? `<span class="tx-note" title="${escapeHTML(tx.note)}">${escapeHTML(tx.note)}</span>` : ''}
          <span class="tx-date">${formatFriendlyDate(tx.date)}</span>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${amountClass}">${sign}${formatINR(tx.amount)}</span>
        <button class="tx-delete-btn" data-id="${tx.id}" title="Delete transaction" aria-label="Delete transaction for ${escapeHTML(displayName)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `;

    // Delete handler
    item.querySelector('.tx-delete-btn').addEventListener('click', () => {
      deleteTransaction(tx.id);
    });

    container.appendChild(item);
  });
}

/**
 * Renders the Savings Goals list with animated progress bars and action buttons.
 */
function renderGoalsList() {
  const container = document.getElementById('goals-list');
  if (!container) return;

  container.innerHTML = '';

  if (state.goals.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">🎯</div>
      <h4>No Savings Goals Yet</h4>
      <p>Set a target for your dream gadget, trip, or emergency fund to stay motivated.</p>
    `;
    container.appendChild(emptyState);
    return;
  }

  state.goals.forEach(goal => {
    const { percentage, remaining } = calculateGoalProgress(goal);
    const isCompleted = percentage >= 100;

    const item = document.createElement('div');
    item.className = 'goal-item';
    item.setAttribute('role', 'listitem');

    item.innerHTML = `
      <div class="goal-top-row">
        <div class="goal-info">
          <h4>
            ${escapeHTML(goal.name)}
            ${isCompleted ? '<span>🎉</span>' : ''}
          </h4>
          ${goal.deadline ? `<span class="goal-deadline-pill">Target: ${formatFriendlyDate(goal.deadline)}</span>` : ''}
        </div>
        <div class="goal-actions">
          <button class="btn btn-sm btn-secondary deposit-btn" data-id="${goal.id}" title="Add money to this goal">
            + Add ₹
          </button>
          <button class="tx-delete-btn delete-goal-btn" data-id="${goal.id}" title="Delete goal" aria-label="Delete goal ${escapeHTML(goal.name)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>

      <div class="goal-progress-wrap">
        <div class="goal-progress-bar-bg" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
          <div class="goal-progress-bar-fill ${isCompleted ? 'completed' : ''}" style="width: ${percentage}%;"></div>
        </div>
      </div>

      <div class="goal-meta-row">
        <div>
          <span class="goal-saved">${formatINR(goal.currentAmount || 0)}</span>
          <span class="goal-target"> / ${formatINR(goal.targetAmount)}</span>
          ${remaining > 0 ? `<div class="goal-remaining">${formatINR(remaining)} to go</div>` : `<div class="goal-remaining" style="color:var(--income-green);">Goal Achieved!</div>`}
        </div>
        <div class="goal-percent-badge">${percentage}%</div>
      </div>
    `;

    // Deposit button click
    item.querySelector('.deposit-btn').addEventListener('click', () => {
      openDepositModal(goal.id);
    });

    // Delete goal click
    item.querySelector('.delete-goal-btn').addEventListener('click', () => {
      deleteGoal(goal.id);
    });

    container.appendChild(item);
  });
}

/**
 * Renders the Doughnut Chart of expenses by category using Chart.js.
 */
function renderCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  const emptyMessage = document.getElementById('category-chart-empty');
  if (!canvas) return;

  const data = calculateCategoryExpenses(state.selectedMonth);

  // If no expenses, show empty message overlay
  if (data.amounts.length === 0 || data.amounts.every(a => a === 0)) {
    if (emptyMessage) emptyMessage.classList.remove('hidden');
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }
    return;
  }

  if (emptyMessage) emptyMessage.classList.add('hidden');

  const palette = [
    '#6366f1', '#10b981', '#f59e0b', '#f43f5e',
    '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308'
  ];

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.amounts,
        backgroundColor: palette.slice(0, data.labels.length),
        borderColor: '#121826',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#94a3b8',
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 3,
            padding: 10,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const val = context.raw || 0;
              return ` ${label}: ${formatINR(val)}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Renders the 6-Month Income vs Expense Bar Chart using Chart.js.
 */
function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;

  const { months, incomeData, expenseData } = calculateSixMonthTrends(state.selectedMonth);

  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  trendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          backgroundColor: '#10b981',
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'Expenses',
          data: expenseData,
          backgroundColor: '#f43f5e',
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#94a3b8',
            boxWidth: 12,
            boxHeight: 12,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const val = context.raw || 0;
              return ` ${label}: ${formatINR(val)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            callback: function(value) {
              if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
              return `₹${value}`;
            },
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 10 }
          }
        }
      }
    }
  });
}

// =============================================================================
// 5. EVENT HANDLERS & INPUT VALIDATION
// =============================================================================

/**
 * Handles adding a new transaction.
 * Validates inputs: non-empty positive amount, valid date, category.
 */
function handleTransactionSubmit(e) {
  e.preventDefault();

  const amountInput = document.getElementById('tx-amount');
  const typeRadio = document.querySelector('input[name="tx-type"]:checked');
  const categorySelect = document.getElementById('tx-category');
  const accountSelect = document.getElementById('tx-account');
  const dateInput = document.getElementById('tx-date');
  const noteInput = document.getElementById('tx-note');

  const customNameInput = document.getElementById('tx-custom-name');
  const customEmojiInput = document.getElementById('tx-custom-emoji');

  const amount = parseFloat(amountInput.value);
  const type = typeRadio ? typeRadio.value : 'expense';
  const category = categorySelect.value;
  const account = accountSelect.value || 'General';
  const date = dateInput.value;
  const note = noteInput.value.trim();

  // Validation
  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than ₹0', 'error');
    amountInput.focus();
    return;
  }

  if (!date) {
    showToast('Please select a valid transaction date', 'error');
    dateInput.focus();
    return;
  }

  let customName = '';
  let customEmoji = '';

  if (category === 'Other') {
    customName = customNameInput.value.trim();
    customEmoji = customEmojiInput.value.trim() || '✨';
    if (!customName) {
      showToast('Please enter a custom title for "Other" category', 'error');
      customNameInput.focus();
      return;
    }
  }

  // Create transaction object
  const newTx = {
    id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    amount,
    type,
    category,
    account,
    date,
    note,
    customName,
    customEmoji,
    createdAt: Date.now()
  };

  // Prepend to list (newest first)
  state.transactions.unshift(newTx);
  saveTransactionsToStorage();

  // If transaction date is outside selected month, switch to transaction's month for instant visibility
  const txMonth = date.substring(0, 7);
  if (txMonth !== state.selectedMonth) {
    state.selectedMonth = txMonth;
    saveMonthToStorage();
  }

  // Reset form
  amountInput.value = '';
  noteInput.value = '';
  if (customNameInput) customNameInput.value = '';
  if (customEmojiInput) customEmojiInput.value = '';

  // Reset category dropdown & hide custom group
  categorySelect.value = 'Food';
  document.getElementById('custom-category-group').classList.add('hidden');

  renderAll();
  showToast(`Transaction of ${formatINR(amount)} added successfully!`, 'success');
}

/**
 * Deletes a transaction by ID.
 * @param {string} id
 */
function deleteTransaction(id) {
  const index = state.transactions.findIndex(t => t.id === id);
  if (index === -1) return;

  const item = state.transactions[index];
  state.transactions.splice(index, 1);
  saveTransactionsToStorage();
  renderAll();

  showToast(`Deleted ${item.category} transaction (${formatINR(item.amount)})`, 'info');
}

/**
 * Handles adding a new Bank Account / Payment Mode.
 */
function handleAccountSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('acc-name-input');
  const modeInput = document.getElementById('acc-mode-input');

  const name = nameInput.value.trim();
  const mode = modeInput.value.trim();

  if (!name) {
    showToast('Please enter an account or bank name', 'error');
    nameInput.focus();
    return;
  }

  if (!mode) {
    showToast('Please specify a payment mode (e.g. UPI, Net Banking, Card)', 'error');
    modeInput.focus();
    return;
  }

  const newAccount = {
    id: 'acc_' + Date.now(),
    name,
    mode
  };

  state.accounts.push(newAccount);
  saveAccountsToStorage();

  nameInput.value = '';
  modeInput.value = '';
  document.getElementById('account-form').classList.add('hidden');

  renderAccountsList();
  renderAccountSelectDropdown();
  showToast(`Account "${name} (${mode})" added!`, 'success');
}

/**
 * Deletes an account by ID.
 * @param {string} id
 */
function deleteAccount(id) {
  if (state.accounts.length <= 1) {
    showToast('You must keep at least one payment account', 'error');
    return;
  }

  state.accounts = state.accounts.filter(a => a.id !== id);
  saveAccountsToStorage();
  renderAccountsList();
  renderAccountSelectDropdown();
  showToast('Account removed', 'info');
}

/**
 * Handles creating a new savings goal.
 */
function handleGoalSubmit(e) {
  e.preventDefault();

  const nameInput = document.getElementById('goal-name');
  const targetInput = document.getElementById('goal-target');
  const deadlineInput = document.getElementById('goal-deadline');
  const initialInput = document.getElementById('goal-initial');

  const name = nameInput.value.trim();
  const targetAmount = parseFloat(targetInput.value);
  const deadline = deadlineInput.value;
  const initialAmount = parseFloat(initialInput.value) || 0;

  if (!name) {
    showToast('Please enter a goal name', 'error');
    nameInput.focus();
    return;
  }

  if (isNaN(targetAmount) || targetAmount <= 0) {
    showToast('Please enter a valid target amount greater than ₹0', 'error');
    targetInput.focus();
    return;
  }

  if (initialAmount < 0) {
    showToast('Initial savings cannot be negative', 'error');
    initialInput.focus();
    return;
  }

  const newGoal = {
    id: 'goal_' + Date.now(),
    name,
    targetAmount,
    currentAmount: initialAmount,
    deadline: deadline || null,
    createdAt: Date.now()
  };

  state.goals.push(newGoal);
  saveGoalsToStorage();

  nameInput.value = '';
  targetInput.value = '';
  deadlineInput.value = '';
  initialInput.value = '';
  document.getElementById('goal-form').classList.add('hidden');

  renderGoalsList();
  showToast(`Goal "${name}" created!`, 'success');
}

/**
 * Opens deposit modal for adding money to a goal.
 * @param {string} goalId
 */
function openDepositModal(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;

  const modal = document.getElementById('deposit-modal');
  const title = document.getElementById('deposit-modal-title');
  const subtitle = document.getElementById('deposit-goal-subtitle');
  const hiddenId = document.getElementById('deposit-goal-id');
  const amountInput = document.getElementById('deposit-amount');

  title.textContent = `Deposit into "${goal.name}"`;
  subtitle.textContent = `Target: ${formatINR(goal.targetAmount)} | Currently Saved: ${formatINR(goal.currentAmount || 0)}`;
  hiddenId.value = goal.id;
  amountInput.value = '';

  modal.classList.remove('hidden');
  amountInput.focus();
}

/**
 * Handles deposit form submission to allocate money to a goal.
 */
function handleDepositSubmit(e) {
  e.preventDefault();

  const hiddenId = document.getElementById('deposit-goal-id');
  const amountInput = document.getElementById('deposit-amount');
  const depositAmt = parseFloat(amountInput.value);

  if (isNaN(depositAmt) || depositAmt <= 0) {
    showToast('Please enter an amount greater than ₹0', 'error');
    amountInput.focus();
    return;
  }

  const goal = state.goals.find(g => g.id === hiddenId.value);
  if (!goal) return;

  goal.currentAmount = (goal.currentAmount || 0) + depositAmt;
  saveGoalsToStorage();

  closeDepositModal();
  renderGoalsList();

  const { percentage } = calculateGoalProgress(goal);
  if (percentage >= 100) {
    showToast(`🎉 Congratulations! You reached 100% of "${goal.name}"!`, 'success');
  } else {
    showToast(`Added ${formatINR(depositAmt)} to "${goal.name}" (${percentage}% completed)`, 'success');
  }
}

/**
 * Closes the deposit modal.
 */
function closeDepositModal() {
  const modal = document.getElementById('deposit-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Deletes a goal by ID.
 * @param {string} id
 */
function deleteGoal(id) {
  state.goals = state.goals.filter(g => g.id !== id);
  saveGoalsToStorage();
  renderGoalsList();
  showToast('Savings goal deleted', 'info');
}

/**
 * Changes month by relative offset (-1 for prev, +1 for next).
 * @param {number} delta
 */
function changeMonth(delta) {
  const [yearStr, monthStr] = state.selectedMonth.split('-');
  const d = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1 + delta, 1);
  const newMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  state.selectedMonth = newMonthStr;
  saveMonthToStorage();
  renderAll();
}

/**
 * Loads rich demo data for quick exploration and testing.
 */
function loadDemoData() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Generate date helper
  const makeDate = (monthOffset, day) => {
    const d = new Date(year, month - 1 + monthOffset, day);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  state.accounts = [
    { id: 'acc_demo_1', name: 'SBI', mode: 'UPI' },
    { id: 'acc_demo_2', name: 'HDFC', mode: 'Net Banking' },
    { id: 'acc_demo_3', name: 'ICICI', mode: 'Credit Card' },
    { id: 'acc_demo_4', name: 'Cash In Hand', mode: 'Cash' }
  ];

  state.goals = [
    {
      id: 'goal_demo_1',
      name: 'MacBook Pro M-Series',
      targetAmount: 120000,
      currentAmount: 75000,
      deadline: makeDate(3, 15),
      createdAt: Date.now() - 3000000
    },
    {
      id: 'goal_demo_2',
      name: 'Goa Weekend Trip',
      targetAmount: 25000,
      currentAmount: 18500,
      deadline: makeDate(1, 20),
      createdAt: Date.now() - 2000000
    },
    {
      id: 'goal_demo_3',
      name: 'Emergency Buffer Fund',
      targetAmount: 50000,
      currentAmount: 50000,
      deadline: null,
      createdAt: Date.now() - 1000000
    }
  ];

  state.transactions = [
    // Current Month
    {
      id: 'tx_demo_1',
      type: 'income',
      amount: 65000,
      category: 'Education',
      account: 'HDFC (Net Banking)',
      date: makeDate(0, 1),
      note: 'Monthly Developer Salary',
      createdAt: Date.now() - 10000
    },
    {
      id: 'tx_demo_2',
      type: 'income',
      amount: 8500,
      category: 'Other',
      customName: 'Freelance Design',
      customEmoji: '🎨',
      account: 'SBI (UPI)',
      date: makeDate(0, 5),
      note: 'Logo design project client payment',
      createdAt: Date.now() - 9000
    },
    {
      id: 'tx_demo_3',
      type: 'expense',
      amount: 1450,
      category: 'Food',
      account: 'SBI (UPI)',
      date: makeDate(0, 3),
      note: 'Dinner with college friends at Mainland China',
      createdAt: Date.now() - 8000
    },
    {
      id: 'tx_demo_4',
      type: 'expense',
      amount: 850,
      category: 'Travel',
      account: 'SBI (UPI)',
      date: makeDate(0, 7),
      note: 'Metro card topup & auto ride',
      createdAt: Date.now() - 7000
    },
    {
      id: 'tx_demo_5',
      type: 'expense',
      amount: 2200,
      category: 'Gym',
      account: 'HDFC (Net Banking)',
      date: makeDate(0, 2),
      note: 'Cult.fit quarterly fitness subscription',
      createdAt: Date.now() - 6000
    },
    {
      id: 'tx_demo_6',
      type: 'expense',
      amount: 3200,
      category: 'Shopping',
      account: 'ICICI (Credit Card)',
      date: makeDate(0, 9),
      note: 'Running shoes on sale',
      createdAt: Date.now() - 5000
    },
    {
      id: 'tx_demo_7',
      type: 'expense',
      amount: 1699,
      category: 'Bills',
      account: 'SBI (UPI)',
      date: makeDate(0, 6),
      note: 'Airtel WiFi broadband bill',
      createdAt: Date.now() - 4000
    },
    {
      id: 'tx_demo_8',
      type: 'expense',
      amount: 650,
      category: 'Other',
      customName: 'Movies & Popcorn',
      customEmoji: '🍿',
      account: 'SBI (UPI)',
      date: makeDate(0, 11),
      note: 'IMAX movie ticket with snacks',
      createdAt: Date.now() - 3000
    },

    // Prior Month 1
    {
      id: 'tx_demo_p1',
      type: 'income',
      amount: 65000,
      category: 'Education',
      account: 'HDFC (Net Banking)',
      date: makeDate(-1, 1),
      note: 'Monthly Salary',
      createdAt: Date.now() - 30000000
    },
    {
      id: 'tx_demo_p2',
      type: 'expense',
      amount: 18500,
      category: 'Food',
      account: 'SBI (UPI)',
      date: makeDate(-1, 15),
      note: 'Monthly groceries & dining',
      createdAt: Date.now() - 25000000
    },
    {
      id: 'tx_demo_p3',
      type: 'expense',
      amount: 5400,
      category: 'Shopping',
      account: 'ICICI (Credit Card)',
      date: makeDate(-1, 18),
      note: 'Electronics & festive purchases',
      createdAt: Date.now() - 20000000
    },

    // Prior Month 2
    {
      id: 'tx_demo_p4',
      type: 'income',
      amount: 65000,
      category: 'Education',
      account: 'HDFC (Net Banking)',
      date: makeDate(-2, 1),
      note: 'Monthly Salary',
      createdAt: Date.now() - 60000000
    },
    {
      id: 'tx_demo_p5',
      type: 'expense',
      amount: 21000,
      category: 'Bills',
      account: 'HDFC (Net Banking)',
      date: makeDate(-2, 8),
      note: 'Apartment rent & maintenance',
      createdAt: Date.now() - 55000000
    },

    // Prior Month 3
    {
      id: 'tx_demo_p6',
      type: 'income',
      amount: 60000,
      category: 'Education',
      account: 'HDFC (Net Banking)',
      date: makeDate(-3, 1),
      note: 'Monthly Salary',
      createdAt: Date.now() - 90000000
    },
    {
      id: 'tx_demo_p7',
      type: 'expense',
      amount: 14000,
      category: 'Travel',
      account: 'SBI (UPI)',
      date: makeDate(-3, 12),
      note: 'Flight tickets to Bangalore',
      createdAt: Date.now() - 85000000
    }
  ];

  saveAccountsToStorage();
  saveTransactionsToStorage();
  saveGoalsToStorage();

  renderAll();
  showToast('Demo data loaded successfully!', 'success');
}

// =============================================================================
// 6. UTILITY FUNCTIONS (Formatters, CSV Export, Toasts)
// =============================================================================

/**
 * Formats a number into Indian Rupee representation (e.g. ₹1,23,456.00).
 * @param {number} amount
 * @returns {string}
 */
function formatINR(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(num);
}

/**
 * Formats YYYY-MM into a friendly string like "November 2026".
 * @param {string} monthStr
 * @returns {string}
 */
function formatMonthTitle(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Formats a date string (YYYY-MM-DD) into readable format (e.g. 14 Nov 2026).
 * @param {string} dateStr
 * @returns {string}
 */
function formatFriendlyDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Shows a toast alert message with an auto-dismiss timer.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/**
 * Exports all transactions as a CSV file for download.
 */
function exportTransactionsCSV() {
  if (state.transactions.length === 0) {
    showToast('No transactions to export', 'error');
    return;
  }

  // CSV Headers
  const headers = ['Transaction ID', 'Date', 'Type', 'Category', 'Account', 'Amount (INR)', 'Note'];

  // Map rows
  const rows = state.transactions.map(t => {
    let cat = t.category;
    if (t.category === 'Other' && t.customName) {
      cat = `${t.customEmoji || ''} ${t.customName}`.trim();
    }

    return [
      t.id,
      t.date,
      t.type,
      `"${cat.replace(/"/g, '""')}"`,
      `"${(t.account || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rupeetrack_transactions_${state.selectedMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Transactions exported as CSV file!', 'success');
}

// =============================================================================
// 7. INITIALIZATION & ATTACH LISTENERS
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load data from storage
  loadFromStorage();

  // 2. Set default date picker to today
  const txDateInput = document.getElementById('tx-date');
  if (txDateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    txDateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // 3. Month Navigation
  const monthInput = document.getElementById('month-input');
  if (monthInput) {
    monthInput.addEventListener('change', (e) => {
      if (e.target.value) {
        state.selectedMonth = e.target.value;
        saveMonthToStorage();
        renderAll();
      }
    });
  }

  document.getElementById('prev-month-btn')?.addEventListener('click', () => changeMonth(-1));
  document.getElementById('next-month-btn')?.addEventListener('click', () => changeMonth(1));

  // 4. Category Switcher for "Other"
  const categorySelect = document.getElementById('tx-category');
  const customCatGroup = document.getElementById('custom-category-group');
  if (categorySelect && customCatGroup) {
    categorySelect.addEventListener('change', (e) => {
      if (e.target.value === 'Other') {
        customCatGroup.classList.remove('hidden');
        document.getElementById('tx-custom-name')?.focus();
      } else {
        customCatGroup.classList.add('hidden');
      }
    });
  }

  // Quick Emoji Chips
  document.querySelectorAll('.emoji-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const emoji = chip.getAttribute('data-emoji');
      const emojiInput = document.getElementById('tx-custom-emoji');
      if (emojiInput) emojiInput.value = emoji;
    });
  });

  // 5. Account Toggle Form
  const addAccountToggleBtn = document.getElementById('add-account-toggle-btn');
  const accountForm = document.getElementById('account-form');
  const cancelAccountBtn = document.getElementById('cancel-account-btn');

  if (addAccountToggleBtn && accountForm) {
    addAccountToggleBtn.addEventListener('click', () => {
      accountForm.classList.toggle('hidden');
      if (!accountForm.classList.contains('hidden')) {
        document.getElementById('acc-name-input')?.focus();
      }
    });
  }

  cancelAccountBtn?.addEventListener('click', () => {
    accountForm.classList.add('hidden');
  });

  // 6. Savings Goal Toggle Form
  const addGoalToggleBtn = document.getElementById('add-goal-toggle-btn');
  const goalForm = document.getElementById('goal-form');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');

  if (addGoalToggleBtn && goalForm) {
    addGoalToggleBtn.addEventListener('click', () => {
      goalForm.classList.toggle('hidden');
      if (!goalForm.classList.contains('hidden')) {
        document.getElementById('goal-name')?.focus();
      }
    });
  }

  cancelGoalBtn?.addEventListener('click', () => {
    goalForm.classList.add('hidden');
  });

  // 7. Form Submissions
  document.getElementById('transaction-form')?.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('account-form')?.addEventListener('submit', handleAccountSubmit);
  document.getElementById('goal-form')?.addEventListener('submit', handleGoalSubmit);
  document.getElementById('deposit-form')?.addEventListener('submit', handleDepositSubmit);

  // 8. Deposit Modal Close Listeners
  document.getElementById('close-deposit-modal')?.addEventListener('click', closeDepositModal);
  document.getElementById('cancel-deposit-btn')?.addEventListener('click', closeDepositModal);
  document.getElementById('deposit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'deposit-modal') closeDepositModal();
  });

  // 9. Search & Filter
  const searchInput = document.getElementById('tx-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchTerm = e.target.value;
      renderTransactionsList();
    });
  }

  const typeFilterSelect = document.getElementById('tx-type-filter');
  if (typeFilterSelect) {
    typeFilterSelect.addEventListener('change', (e) => {
      state.typeFilter = e.target.value;
      renderTransactionsList();
    });
  }

  // 10. Action Buttons: CSV & Demo Data
  document.getElementById('export-csv-btn')?.addEventListener('click', exportTransactionsCSV);
  document.getElementById('load-sample-btn')?.addEventListener('click', loadDemoData);

  // 11. Initial Render
  renderAll();
});
