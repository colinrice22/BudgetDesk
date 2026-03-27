const DEFAULT_DB = {
  monthConfig: {
    "2026-03": {
      incomeCents: 500000,
      incomeType: "net"
    }
  },
  monthPlans: {},
  groups: [
    { id: "grp-fixed", name: "Fixed", sort: 1 },
    { id: "grp-living", name: "Living", sort: 2 },
    { id: "grp-lifestyle", name: "Lifestyle", sort: 3 },
    { id: "grp-future", name: "Future", sort: 4 }
  ],
  categories: [
    {
      id: "cat-groceries",
      groupId: "grp-living",
      name: "Groceries",
      assignedCents: 80000,
      targetCents: 90000,
      notes: "Weekly restock + essentials",
      sort: 1,
      archived: false
    },
    {
      id: "cat-rent",
      groupId: "grp-fixed",
      name: "Rent",
      assignedCents: 180000,
      targetCents: 180000,
      notes: "Due on the 1st",
      sort: 2,
      archived: false
    },
    {
      id: "cat-transport",
      groupId: "grp-living",
      name: "Transport",
      assignedCents: 25000,
      targetCents: 30000,
      notes: "Fuel + transit",
      sort: 3,
      archived: false
    },
    {
      id: "cat-fun",
      groupId: "grp-lifestyle",
      name: "Fun Money",
      assignedCents: 20000,
      targetCents: 25000,
      notes: "Dining and activities",
      sort: 4,
      archived: false
    },
    {
      id: "cat-emergency",
      groupId: "grp-future",
      name: "Emergency Fund",
      assignedCents: 0,
      targetCents: 50000,
      notes: "Buffer build-up",
      sort: 5,
      archived: false
    }
  ],
  transactions: [],
  scheduledTransactions: [
    {
      id: "sch-rent",
      categoryId: "cat-rent",
      note: "Rent autopay",
      amountCents: -180000,
      amountType: "net",
      dayOfMonth: 1,
      active: true,
      lastAppliedMonth: null
    }
  ]
};

const state = {
  month: new Date().toISOString().slice(0, 7),
  budget: null,
  settings: {
    saveId: "",
    currency: "CAD",
    defaultAmountType: "net"
  },
  txFilters: {
    categoryId: "",
    q: ""
  }
};

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const AMOUNT_TYPES = new Set(["net", "gross"]);
const SAVE_EXPORT_VERSION = 1;
const SAVE_EXPORT_FORMAT = "budgetdesk-save";
const LEGACY_SAVE_EXPORT_FORMATS = ["ledgerwave-save", "tideglass-save", "budgetapp-save"];
const SETTINGS_KEY = "budgetapp.settings.v1";
const ACTIVE_SAVE_KEY = "budgetapp.active-save.v1";
const SAVE_STORAGE_PREFIX = "budgetapp.save.";
const SAVE_STORAGE_SUFFIX = ".v1";

const appShell = document.querySelector("#app-shell");
const monthInput = document.querySelector("#month-input");
const importSaveBtn = document.querySelector("#import-save-btn");
const exportSaveBtn = document.querySelector("#export-save-btn");
const refreshBtn = document.querySelector("#refresh-btn");
const incomeValue = document.querySelector("#income-value");
const incomeLabel = document.querySelector("#income-label");
const assignedValue = document.querySelector("#assigned-value");
const tbbValue = document.querySelector("#tbb-value");
const overspentValue = document.querySelector("#overspent-value");
const scheduledDueValue = document.querySelector("#scheduled-due-value");
const incomeForm = document.querySelector("#income-form");
const incomeInput = document.querySelector("#income-input");
const quickAssignForm = document.querySelector("#quick-assign-form");
const quickAssignMode = document.querySelector("#quick-assign-mode");
const applyScheduledBtn = document.querySelector("#apply-scheduled-btn");

const categoryCount = document.querySelector("#category-count");
const groupsList = document.querySelector("#groups-list");
const newGroupForm = document.querySelector("#new-group-form");
const groupNameInput = document.querySelector("#group-name-input");
const groupSortInput = document.querySelector("#group-sort-input");
const newCategoryForm = document.querySelector("#new-category-form");
const categoryNameInput = document.querySelector("#category-name-input");
const categoryGroupInput = document.querySelector("#category-group-input");
const categoryAssignedInput = document.querySelector("#category-assigned-input");
const categoryTargetInput = document.querySelector("#category-target-input");
const categoryNotesInput = document.querySelector("#category-notes-input");

const reallocateForm = document.querySelector("#reallocate-form");
const reallocateFrom = document.querySelector("#reallocate-from");
const reallocateTo = document.querySelector("#reallocate-to");
const reallocateAmount = document.querySelector("#reallocate-amount");

const txFilterForm = document.querySelector("#tx-filter-form");
const txFilterCategory = document.querySelector("#tx-filter-category");
const txSearchInput = document.querySelector("#tx-search-input");
const transactionForm = document.querySelector("#new-transaction-form");
const txCategoryInput = document.querySelector("#tx-category-input");
const txPayeeInput = document.querySelector("#tx-payee-input");
const txDateInput = document.querySelector("#tx-date-input");
const txClearedInput = document.querySelector("#tx-cleared-input");
const txAmountTypeInput = document.querySelector("#tx-amount-type-input");
const txAmountInput = document.querySelector("#tx-amount-input");
const txNoteInput = document.querySelector("#tx-note-input");
const transactionsList = document.querySelector("#transactions-list");

const newScheduledForm = document.querySelector("#new-scheduled-form");
const scheduledCategoryInput = document.querySelector("#scheduled-category-input");
const scheduledNoteInput = document.querySelector("#scheduled-note-input");
const scheduledAmountTypeInput = document.querySelector("#scheduled-amount-type-input");
const scheduledAmountInput = document.querySelector("#scheduled-amount-input");
const scheduledDayInput = document.querySelector("#scheduled-day-input");
const scheduledList = document.querySelector("#scheduled-list");

const setupOverlay = document.querySelector("#setup-overlay");
const setupForm = document.querySelector("#setup-form");
const setupImportBtn = document.querySelector("#setup-import-btn");
const setupSaveInput = document.querySelector("#setup-save-input");
const setupCurrencyInput = document.querySelector("#setup-currency-input");
const setupMonthInput = document.querySelector("#setup-month-input");
const setupIncomeInput = document.querySelector("#setup-income-input");
const setupCategoriesInput = document.querySelector("#setup-categories-input");
const importSaveInput = document.querySelector("#import-save-input");
const deviceLocalInfoBtn = document.querySelector("#device-local-info-btn");
const deviceLocalInfoPanel = document.querySelector("#device-local-info-panel");
const deviceLocalInfoClose = document.querySelector("#device-local-info-close");

const toast = document.querySelector("#toast");
const valueCache = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function formatCents(cents) {
  const amount = Number(cents) / 100;
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: state.settings.currency || "CAD"
  });
}

function dollarsToCents(dollars) {
  return Math.round(Number(dollars) * 100);
}

function isoDateForMonth(month) {
  return `${month}-01`;
}

function normalizeAmountType(value, fallback = "net") {
  const normalized = String(value ?? fallback).toLowerCase().trim();
  return AMOUNT_TYPES.has(normalized) ? normalized : fallback;
}

function validMonth(month) {
  return MONTH_REGEX.test(month);
}

function monthFromIso(isoDate) {
  return String(isoDate).slice(0, 7);
}

function isIntegerCents(value) {
  return Number.isInteger(value);
}

function activeSaveId() {
  return String(localStorage.getItem(ACTIVE_SAVE_KEY) ?? "").trim();
}

function saveStorageKey(saveId) {
  return `${SAVE_STORAGE_PREFIX}${saveId}${SAVE_STORAGE_SUFFIX}`;
}

function saveExists(saveId) {
  return Boolean(localStorage.getItem(saveStorageKey(saveId)));
}

function sanitizeSaveId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function uniqueSaveId(baseValue) {
  const base = sanitizeSaveId(baseValue) || `imported-save-${new Date().toISOString().slice(0, 10)}`;
  let candidate = base;
  let suffix = 2;
  while (saveExists(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function inferGroup(name) {
  const normalized = String(name).toLowerCase();
  if (normalized.includes("rent") || normalized.includes("mortgage") || normalized.includes("bill")) {
    return "grp-fixed";
  }
  if (normalized.includes("grocery") || normalized.includes("transport") || normalized.includes("fuel")) {
    return "grp-living";
  }
  if (normalized.includes("fun") || normalized.includes("dining") || normalized.includes("travel")) {
    return "grp-lifestyle";
  }
  return "grp-future";
}

function ensureDbShape(db) {
  let changed = false;

  if (!db.monthConfig || typeof db.monthConfig !== "object") {
    db.monthConfig = {};
    changed = true;
  }

  for (const monthKey of Object.keys(db.monthConfig)) {
    const config = db.monthConfig[monthKey];
    if (!config || typeof config !== "object") {
      db.monthConfig[monthKey] = { incomeCents: 0, incomeType: "net" };
      changed = true;
      continue;
    }
    if (!Number.isInteger(config.incomeCents)) {
      config.incomeCents = Number(config.incomeCents ?? 0) || 0;
      changed = true;
    }
    const incomeType = normalizeAmountType(config.incomeType, "net");
    if (config.incomeType !== incomeType) {
      config.incomeType = incomeType;
      changed = true;
    }
  }

  if (!db.monthPlans || typeof db.monthPlans !== "object") {
    db.monthPlans = {};
    changed = true;
  }

  if (!Array.isArray(db.groups) || db.groups.length === 0) {
    db.groups = clone(DEFAULT_DB.groups);
    changed = true;
  }

  if (!Array.isArray(db.categories)) {
    db.categories = [];
    changed = true;
  }

  if (!Array.isArray(db.transactions)) {
    db.transactions = [];
    changed = true;
  }

  if (!Array.isArray(db.scheduledTransactions)) {
    db.scheduledTransactions = [];
    changed = true;
  }

  const fallbackGroupId = db.groups[0]?.id ?? "grp-ungrouped";
  if (!db.groups[0]) {
    db.groups.push({ id: fallbackGroupId, name: "General", sort: 1 });
    changed = true;
  }

  for (let index = 0; index < db.categories.length; index += 1) {
    const category = db.categories[index];
    if (!category.id) {
      category.id = `cat-${crypto.randomUUID()}`;
      changed = true;
    }
    if (!category.groupId) {
      const preferredGroup = inferGroup(category.name);
      category.groupId = db.groups.some((group) => group.id === preferredGroup)
        ? preferredGroup
        : fallbackGroupId;
      changed = true;
    }
    if (!category.name) {
      category.name = `Category ${index + 1}`;
      changed = true;
    }
    if (!Number.isInteger(category.assignedCents)) {
      category.assignedCents = Number(category.assignedCents ?? 0) || 0;
      changed = true;
    }
    if (!Number.isInteger(category.targetCents)) {
      category.targetCents = Math.max(Number(category.targetCents ?? category.assignedCents ?? 0) || 0, 0);
      changed = true;
    }
    if (typeof category.notes !== "string") {
      category.notes = "";
      changed = true;
    }
    if (!Number.isInteger(category.sort)) {
      category.sort = index + 1;
      changed = true;
    }
    if (typeof category.archived !== "boolean") {
      category.archived = false;
      changed = true;
    }
  }

  for (const tx of db.transactions) {
    if (!tx.id) {
      tx.id = `tx-${crypto.randomUUID()}`;
      changed = true;
    }
    if (typeof tx.note !== "string") {
      tx.note = "";
      changed = true;
    }
    if (typeof tx.payee !== "string") {
      tx.payee = "";
      changed = true;
    }
    if (typeof tx.cleared !== "boolean") {
      tx.cleared = false;
      changed = true;
    }
    const amountType = normalizeAmountType(tx.amountType, "net");
    if (tx.amountType !== amountType) {
      tx.amountType = amountType;
      changed = true;
    }
  }

  for (const scheduled of db.scheduledTransactions) {
    if (!scheduled.id) {
      scheduled.id = `sch-${crypto.randomUUID()}`;
      changed = true;
    }
    if (typeof scheduled.active !== "boolean") {
      scheduled.active = true;
      changed = true;
    }
    if (typeof scheduled.lastAppliedMonth !== "string" && scheduled.lastAppliedMonth !== null) {
      scheduled.lastAppliedMonth = null;
      changed = true;
    }
    const amountType = normalizeAmountType(scheduled.amountType, "net");
    if (scheduled.amountType !== amountType) {
      scheduled.amountType = amountType;
      changed = true;
    }
  }

  if (db.scheduledTransactions.length === 0) {
    const rentCategory = db.categories.find((item) => String(item.name).toLowerCase().includes("rent"));
    if (rentCategory) {
      db.scheduledTransactions.push({
        id: `sch-${crypto.randomUUID()}`,
        categoryId: rentCategory.id,
        note: "Rent autopay",
        amountCents: -Math.max(rentCategory.targetCents || rentCategory.assignedCents || 0, 1),
        amountType: "net",
        dayOfMonth: 1,
        active: true,
        lastAppliedMonth: null
      });
      changed = true;
    }
  }

  return changed;
}

function readLocalDb() {
  const saveId = activeSaveId();
  if (!saveId) {
    throw new Error("Create a device-local save first");
  }
  return readLocalDbForSave(saveId);
}

function readLocalDbForSave(saveId) {
  const key = saveStorageKey(saveId);
  const raw = localStorage.getItem(key);
  const db = raw ? JSON.parse(raw) : clone(DEFAULT_DB);
  const changed = ensureDbShape(db);
  if (!raw || changed) {
    writeLocalDbForSave(saveId, db);
  }
  return db;
}

function writeLocalDb(db) {
  const saveId = activeSaveId();
  if (!saveId) {
    throw new Error("Create a device-local save first");
  }
  writeLocalDbForSave(saveId, db);
}

function writeLocalDbForSave(saveId, db) {
  localStorage.setItem(saveStorageKey(saveId), JSON.stringify(db));
}

function getAssignedCents(db, month, category) {
  const monthPlan = db.monthPlans?.[month];
  if (monthPlan && Number.isInteger(monthPlan[category.id])) {
    return monthPlan[category.id];
  }
  return category.assignedCents;
}

function setAssignedCents(db, month, categoryId, amountCents) {
  if (!db.monthPlans[month]) {
    db.monthPlans[month] = {};
  }
  db.monthPlans[month][categoryId] = amountCents;
}

function sortedGroups(db) {
  return [...db.groups].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

function sortedCategories(db) {
  return [...db.categories]
    .filter((category) => !category.archived)
    .sort((a, b) => {
      if (a.groupId !== b.groupId) {
        const leftGroupSort = db.groups.find((group) => group.id === a.groupId)?.sort ?? 0;
        const rightGroupSort = db.groups.find((group) => group.id === b.groupId)?.sort ?? 0;
        return leftGroupSort - rightGroupSort;
      }
      return (a.sort ?? 0) - (b.sort ?? 0);
    });
}

function buildBudgetSummary(db, month) {
  const monthConfig = db.monthConfig?.[month] ?? {};
  const monthIncomeCents = monthConfig.incomeCents ?? 0;
  const monthIncomeType = normalizeAmountType(monthConfig.incomeType, "net");
  const categoriesForMonth = sortedCategories(db);
  const assignedCents = categoriesForMonth.reduce(
    (total, category) => total + getAssignedCents(db, month, category),
    0
  );

  const categoryActivityMap = new Map();
  for (const category of categoriesForMonth) {
    categoryActivityMap.set(category.id, 0);
  }

  for (const tx of db.transactions) {
    if (monthFromIso(tx.occurredAt) !== month) {
      continue;
    }
    categoryActivityMap.set(tx.categoryId, (categoryActivityMap.get(tx.categoryId) ?? 0) + tx.amountCents);
  }

  const categories = categoriesForMonth.map((category) => {
    const activityCents = categoryActivityMap.get(category.id) ?? 0;
    const assignedForMonth = getAssignedCents(db, month, category);
    const targetCents = category.targetCents ?? 0;
    return {
      ...category,
      assignedCents: assignedForMonth,
      activityCents,
      availableCents: assignedForMonth + activityCents,
      underfundedCents: Math.max(targetCents - assignedForMonth, 0),
      targetProgress: targetCents <= 0 ? 1 : Math.max(Math.min(assignedForMonth / targetCents, 1), 0)
    };
  });

  const groupSummaries = sortedGroups(db).map((group) => {
    const groupCategories = categories.filter((category) => category.groupId === group.id);
    const groupAssigned = groupCategories.reduce((total, category) => total + category.assignedCents, 0);
    const groupActivity = groupCategories.reduce((total, category) => total + category.activityCents, 0);
    return {
      ...group,
      assignedCents: groupAssigned,
      activityCents: groupActivity,
      availableCents: groupAssigned + groupActivity,
      categories: groupCategories
    };
  });

  const overspentCents = categories.reduce((total, category) => total + Math.min(category.availableCents, 0), 0);
  const scheduledDueCount = db.scheduledTransactions.filter(
    (item) => item.active && item.lastAppliedMonth !== month
  ).length;

  return {
    month,
    incomeCents: monthIncomeCents,
    incomeType: monthIncomeType,
    assignedCents,
    toBeBudgetedCents: monthIncomeCents - assignedCents,
    overspentCents,
    scheduledDueCount,
    groups: groupSummaries,
    categories,
    scheduledTransactions: db.scheduledTransactions,
    transactions: db.transactions
      .filter((tx) => monthFromIso(tx.occurredAt) === month)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
  };
}

function categoryById(db, categoryId) {
  return db.categories.find((item) => item.id === categoryId && !item.archived);
}

function runQuickAssign(db, month, mode) {
  const categories = sortedCategories(db);
  const incomeCents = db.monthConfig?.[month]?.incomeCents ?? 0;
  const currentAssigned = categories.reduce((sum, category) => sum + getAssignedCents(db, month, category), 0);
  let remaining = incomeCents - currentAssigned;

  if (remaining <= 0) {
    return { assignedDeltaCents: 0, remainingCents: remaining };
  }

  let assignedDeltaCents = 0;

  if (mode === "underfunded") {
    for (const category of categories) {
      const target = category.targetCents ?? 0;
      const assigned = getAssignedCents(db, month, category);
      const underfunded = Math.max(target - assigned, 0);
      if (underfunded <= 0) {
        continue;
      }
      const add = Math.min(underfunded, remaining);
      setAssignedCents(db, month, category.id, assigned + add);
      remaining -= add;
      assignedDeltaCents += add;
      if (remaining <= 0) {
        break;
      }
    }
  } else if (mode === "even") {
    const base = categories.length ? Math.floor(remaining / categories.length) : 0;
    let remainder = remaining;
    for (const category of categories) {
      const assigned = getAssignedCents(db, month, category);
      const add = Math.min(base, remainder);
      setAssignedCents(db, month, category.id, assigned + add);
      remainder -= add;
      assignedDeltaCents += add;
    }
    let index = 0;
    while (remainder > 0 && categories.length > 0) {
      const category = categories[index % categories.length];
      const assigned = getAssignedCents(db, month, category);
      setAssignedCents(db, month, category.id, assigned + 1);
      remainder -= 1;
      assignedDeltaCents += 1;
      index += 1;
    }
    remaining = 0;
  }

  return { assignedDeltaCents, remainingCents: remaining };
}

function applyScheduledTransactions(db, month) {
  let created = 0;
  for (const schedule of db.scheduledTransactions) {
    if (!schedule.active || schedule.lastAppliedMonth === month) {
      continue;
    }
    if (!categoryById(db, schedule.categoryId)) {
      continue;
    }
    const safeDay = Math.max(Math.min(Number(schedule.dayOfMonth) || 1, 28), 1);
    const occurredAt = `${month}-${String(safeDay).padStart(2, "0")}T12:00:00.000Z`;
    db.transactions.push({
      id: `tx-${crypto.randomUUID()}`,
      categoryId: schedule.categoryId,
      amountCents: schedule.amountCents,
      amountType: normalizeAmountType(schedule.amountType, "net"),
      note: schedule.note,
      payee: "Scheduled",
      cleared: false,
      occurredAt
    });
    schedule.lastAppliedMonth = month;
    created += 1;
  }
  return created;
}

function parseJsonBody(options) {
  if (!options.body) {
    return {};
  }
  return typeof options.body === "string" ? JSON.parse(options.body) : options.body;
}

async function api(path, options = {}) {
  const method = String(options.method ?? "GET").toUpperCase();
  const url = new URL(path, window.location.origin);
  const body = parseJsonBody(options);

  if (url.pathname === "/api/budget" && method === "GET") {
    const month = url.searchParams.get("month") ?? state.month;
    if (!validMonth(month)) {
      throw new Error("month must be YYYY-MM");
    }
    const db = readLocalDb();
    return buildBudgetSummary(db, month);
  }

  if (url.pathname === "/api/month-income" && method === "PUT") {
    const month = String(body.month ?? "");
    const incomeCents = Number(body.incomeCents);
    const incomeType = String(body.incomeType ?? "").toLowerCase().trim();
    if (!validMonth(month)) {
      throw new Error("month must be YYYY-MM");
    }
    if (!isIntegerCents(incomeCents) || incomeCents < 0) {
      throw new Error("incomeCents must be a non-negative integer");
    }
    if (incomeType !== "net") {
      throw new Error("Monthly income must be entered as a net amount");
    }
    const db = readLocalDb();
    db.monthConfig[month] = { incomeCents, incomeType: "net" };
    writeLocalDb(db);
    return { ok: true };
  }

  if (url.pathname === "/api/quick-assign" && method === "POST") {
    const month = String(body.month ?? "");
    const mode = String(body.mode ?? "underfunded");
    if (!validMonth(month)) {
      throw new Error("month must be YYYY-MM");
    }
    if (!["underfunded", "even"].includes(mode)) {
      throw new Error("mode must be underfunded or even");
    }
    const db = readLocalDb();
    const result = runQuickAssign(db, month, mode);
    writeLocalDb(db);
    return result;
  }

  if (url.pathname === "/api/reallocate" && method === "POST") {
    const month = String(body.month ?? "");
    const fromCategoryId = String(body.fromCategoryId ?? "");
    const toCategoryId = String(body.toCategoryId ?? "");
    const amountCents = Number(body.amountCents);
    if (!validMonth(month)) {
      throw new Error("month must be YYYY-MM");
    }
    if (!isIntegerCents(amountCents) || amountCents <= 0) {
      throw new Error("amountCents must be a positive integer");
    }
    if (!fromCategoryId || !toCategoryId || fromCategoryId === toCategoryId) {
      throw new Error("fromCategoryId and toCategoryId must be different");
    }
    const db = readLocalDb();
    const fromCategory = categoryById(db, fromCategoryId);
    const toCategory = categoryById(db, toCategoryId);
    if (!fromCategory || !toCategory) {
      throw new Error("Category not found");
    }
    const fromAssigned = getAssignedCents(db, month, fromCategory);
    if (fromAssigned < amountCents) {
      throw new Error("Not enough assigned funds in source category");
    }
    setAssignedCents(db, month, fromCategory.id, fromAssigned - amountCents);
    setAssignedCents(db, month, toCategory.id, getAssignedCents(db, month, toCategory) + amountCents);
    writeLocalDb(db);
    return { ok: true };
  }

  if (url.pathname === "/api/scheduled-transactions/apply" && method === "POST") {
    const month = String(body.month ?? "");
    if (!validMonth(month)) {
      throw new Error("month must be YYYY-MM");
    }
    const db = readLocalDb();
    const created = applyScheduledTransactions(db, month);
    writeLocalDb(db);
    return { created };
  }

  if (url.pathname === "/api/groups" && method === "GET") {
    const db = readLocalDb();
    return sortedGroups(db);
  }

  if (url.pathname === "/api/groups" && method === "POST") {
    const name = String(body.name ?? "").trim();
    const sort = Number(body.sort ?? Number.MAX_SAFE_INTEGER);
    if (!name) {
      throw new Error("name is required");
    }
    const db = readLocalDb();
    const group = { id: `grp-${crypto.randomUUID()}`, name, sort: Number.isFinite(sort) ? sort : 9999 };
    db.groups.push(group);
    writeLocalDb(db);
    return group;
  }

  const groupMatch = url.pathname.match(/^\/api\/groups\/([^/]+)$/);
  if (groupMatch && method === "PATCH") {
    const groupId = groupMatch[1];
    const nextName = body.name === undefined ? undefined : String(body.name).trim();
    const nextSort = body.sort === undefined ? undefined : Number(body.sort);
    const db = readLocalDb();
    const group = db.groups.find((item) => item.id === groupId);
    if (!group) {
      throw new Error("Group not found");
    }
    if (nextName !== undefined && nextName) {
      group.name = nextName;
    }
    if (nextSort !== undefined && Number.isFinite(nextSort)) {
      group.sort = nextSort;
    }
    writeLocalDb(db);
    return group;
  }

  if (url.pathname === "/api/categories" && method === "GET") {
    const db = readLocalDb();
    return sortedCategories(db);
  }

  if (url.pathname === "/api/categories" && method === "POST") {
    const name = String(body.name ?? "").trim();
    const assignedCents = Number(body.assignedCents ?? 0);
    const targetCents = Number(body.targetCents ?? 0);
    const groupId = String(body.groupId ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    if (!name) {
      throw new Error("name is required");
    }
    if (!isIntegerCents(assignedCents)) {
      throw new Error("assignedCents must be an integer");
    }
    if (!isIntegerCents(targetCents) || targetCents < 0) {
      throw new Error("targetCents must be a non-negative integer");
    }
    const db = readLocalDb();
    const fallbackGroupId = db.groups[0]?.id;
    const resolvedGroupId = db.groups.some((group) => group.id === groupId) ? groupId : fallbackGroupId;
    const category = {
      id: `cat-${crypto.randomUUID()}`,
      groupId: resolvedGroupId,
      name,
      assignedCents,
      targetCents,
      notes,
      sort: db.categories.length + 1,
      archived: false
    };
    db.categories.push(category);
    writeLocalDb(db);
    return category;
  }

  const categoryMatch = url.pathname.match(/^\/api\/categories\/([^/]+)$/);
  if (categoryMatch && method === "PATCH") {
    const categoryId = categoryMatch[1];
    const nextName = body.name === undefined ? undefined : String(body.name).trim();
    const nextAssigned = body.assignedCents === undefined ? undefined : Number(body.assignedCents);
    const nextTarget = body.targetCents === undefined ? undefined : Number(body.targetCents);
    const nextGroupId = body.groupId === undefined ? undefined : String(body.groupId);
    const nextNotes = body.notes === undefined ? undefined : String(body.notes).trim();
    const nextMonth = body.month === undefined ? undefined : String(body.month);
    const nextArchived = body.archived === undefined ? undefined : Boolean(body.archived);
    if (nextAssigned !== undefined && !isIntegerCents(nextAssigned)) {
      throw new Error("assignedCents must be an integer");
    }
    if (nextTarget !== undefined && (!isIntegerCents(nextTarget) || nextTarget < 0)) {
      throw new Error("targetCents must be a non-negative integer");
    }
    if (nextMonth !== undefined && !validMonth(nextMonth)) {
      throw new Error("month must be YYYY-MM when provided");
    }
    const db = readLocalDb();
    const category = db.categories.find((item) => item.id === categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    if (nextName !== undefined) {
      category.name = nextName || category.name;
    }
    if (nextAssigned !== undefined) {
      if (nextMonth) {
        setAssignedCents(db, nextMonth, category.id, nextAssigned);
      } else {
        category.assignedCents = nextAssigned;
      }
    }
    if (nextTarget !== undefined) {
      category.targetCents = nextTarget;
    }
    if (nextGroupId !== undefined && db.groups.some((group) => group.id === nextGroupId)) {
      category.groupId = nextGroupId;
    }
    if (nextNotes !== undefined) {
      category.notes = nextNotes;
    }
    if (nextArchived !== undefined) {
      category.archived = nextArchived;
    }
    writeLocalDb(db);
    return category;
  }

  if (url.pathname === "/api/transactions" && method === "GET") {
    const month = url.searchParams.get("month") ?? state.month;
    const categoryId = url.searchParams.get("categoryId") ?? "";
    const q = String(url.searchParams.get("q") ?? "").toLowerCase().trim();
    if (!validMonth(month)) {
      throw new Error("month must be YYYY-MM");
    }
    const db = readLocalDb();
    return db.transactions
      .filter((tx) => monthFromIso(tx.occurredAt) === month)
      .filter((tx) => (categoryId ? tx.categoryId === categoryId : true))
      .filter((tx) => {
        if (!q) {
          return true;
        }
        return `${tx.note} ${tx.payee}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }

  if (url.pathname === "/api/transactions" && method === "POST") {
    const categoryId = String(body.categoryId ?? "");
    const amountCents = Number(body.amountCents);
    const amountType = String(body.amountType ?? "").toLowerCase().trim();
    const note = String(body.note ?? "").trim();
    const payee = String(body.payee ?? "").trim();
    const cleared = Boolean(body.cleared ?? false);
    const occurredAt = String(body.occurredAt ?? new Date().toISOString());
    if (!categoryId) {
      throw new Error("categoryId is required");
    }
    if (!isIntegerCents(amountCents) || amountCents === 0) {
      throw new Error("amountCents must be a non-zero integer");
    }
    if (!AMOUNT_TYPES.has(amountType)) {
      throw new Error("amountType must be net or gross");
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(occurredAt)) {
      throw new Error("occurredAt must be an ISO date string");
    }
    const db = readLocalDb();
    if (!db.categories.some((item) => item.id === categoryId && !item.archived)) {
      throw new Error("Category not found");
    }
    const transaction = {
      id: `tx-${crypto.randomUUID()}`,
      categoryId,
      amountCents,
      amountType,
      note,
      payee,
      cleared,
      occurredAt
    };
    db.transactions.push(transaction);
    writeLocalDb(db);
    return transaction;
  }

  const transactionMatch = url.pathname.match(/^\/api\/transactions\/([^/]+)$/);
  if (transactionMatch && method === "PATCH") {
    const transactionId = transactionMatch[1];
    const db = readLocalDb();
    const transaction = db.transactions.find((item) => item.id === transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    if (body.note !== undefined) {
      transaction.note = String(body.note).trim();
    }
    if (body.payee !== undefined) {
      transaction.payee = String(body.payee).trim();
    }
    if (body.cleared !== undefined) {
      transaction.cleared = Boolean(body.cleared);
    }
    writeLocalDb(db);
    return transaction;
  }

  if (url.pathname === "/api/scheduled-transactions" && method === "GET") {
    const db = readLocalDb();
    return db.scheduledTransactions;
  }

  if (url.pathname === "/api/scheduled-transactions" && method === "POST") {
    const categoryId = String(body.categoryId ?? "");
    const note = String(body.note ?? "").trim();
    const amountCents = Number(body.amountCents);
    const amountType = String(body.amountType ?? "").toLowerCase().trim();
    const dayOfMonth = Number(body.dayOfMonth);
    if (!categoryId || !note) {
      throw new Error("categoryId and note are required");
    }
    if (!isIntegerCents(amountCents) || amountCents === 0) {
      throw new Error("amountCents must be a non-zero integer");
    }
    if (!AMOUNT_TYPES.has(amountType)) {
      throw new Error("amountType must be net or gross");
    }
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
      throw new Error("dayOfMonth must be an integer from 1 to 28");
    }
    const db = readLocalDb();
    if (!categoryById(db, categoryId)) {
      throw new Error("Category not found");
    }
    const scheduled = {
      id: `sch-${crypto.randomUUID()}`,
      categoryId,
      note,
      amountCents,
      amountType,
      dayOfMonth,
      active: true,
      lastAppliedMonth: null
    };
    db.scheduledTransactions.push(scheduled);
    writeLocalDb(db);
    return scheduled;
  }

  const scheduledMatch = url.pathname.match(/^\/api\/scheduled-transactions\/([^/]+)$/);
  if (scheduledMatch && method === "PATCH") {
    const scheduledId = scheduledMatch[1];
    const db = readLocalDb();
    const scheduled = db.scheduledTransactions.find((item) => item.id === scheduledId);
    if (!scheduled) {
      throw new Error("Scheduled transaction not found");
    }
    if (body.active !== undefined) {
      scheduled.active = Boolean(body.active);
    }
    if (body.note !== undefined) {
      scheduled.note = String(body.note).trim();
    }
    writeLocalDb(db);
    return scheduled;
  }

  throw new Error("Local route not found");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1600);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed.saveId === "string") {
      state.settings.saveId = parsed.saveId;
    }
    if (typeof parsed.currency === "string") {
      state.settings.currency = parsed.currency;
    }
    if (typeof parsed.defaultAmountType === "string") {
      state.settings.defaultAmountType = normalizeAmountType(parsed.defaultAmountType, "net");
    }
  } catch {
    // ignore invalid local settings
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function hasActiveSave() {
  return Boolean(activeSaveId());
}

function setActiveSave(saveId) {
  localStorage.setItem(ACTIVE_SAVE_KEY, saveId);
  state.settings.saveId = saveId;
  saveSettings();
}

function lockApp() {
  appShell.classList.add("app-locked");
}

function openSetupOverlay() {
  lockApp();
  setupOverlay.classList.remove("hidden");
  setupMonthInput.value = state.month;
  setupCurrencyInput.value = state.settings.currency;
  setupSaveInput.value = state.settings.saveId;
}

function closeSetupOverlay() {
  setupOverlay.classList.add("hidden");
  appShell.classList.remove("app-locked");
}

function toggleDeviceLocalInfo() {
  const isHidden = deviceLocalInfoPanel.classList.toggle("hidden");
  deviceLocalInfoBtn.setAttribute("aria-expanded", String(!isHidden));
}

function closeDeviceLocalInfo() {
  deviceLocalInfoPanel.classList.add("hidden");
  deviceLocalInfoBtn.setAttribute("aria-expanded", "false");
}

function buildExportPayload() {
  const saveId = activeSaveId();
  if (!saveId) {
    throw new Error("Create or import a save before exporting");
  }
  return {
    format: SAVE_EXPORT_FORMAT,
    version: SAVE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    saveId,
    month: state.month,
    settings: {
      currency: state.settings.currency,
      defaultAmountType: state.settings.defaultAmountType
    },
    data: readLocalDbForSave(saveId)
  };
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function openImportPicker() {
  importSaveInput.value = "";
  importSaveInput.click();
}

function parseImportedSave(rawText) {
  const parsed = JSON.parse(rawText);
  const recognizedFormat =
    parsed && (parsed.format === SAVE_EXPORT_FORMAT || LEGACY_SAVE_EXPORT_FORMATS.includes(parsed.format));
  if (recognizedFormat && parsed.data && typeof parsed.data === "object") {
    return {
      importedDb: clone(parsed.data),
      saveId: uniqueSaveId(parsed.saveId || setupSaveInput.value || "imported-save"),
      month: validMonth(parsed.month) ? parsed.month : state.month,
      currency: typeof parsed.settings?.currency === "string" ? parsed.settings.currency : state.settings.currency,
      defaultAmountType:
        typeof parsed.settings?.defaultAmountType === "string"
          ? normalizeAmountType(parsed.settings.defaultAmountType, "net")
          : state.settings.defaultAmountType
    };
  }

  if (parsed && typeof parsed === "object") {
    return {
      importedDb: clone(parsed),
      saveId: uniqueSaveId(setupSaveInput.value || "imported-save"),
      month: state.month,
      currency: state.settings.currency,
      defaultAmountType: state.settings.defaultAmountType
    };
  }

  throw new Error("That file does not look like a BudgetDesk save");
}

async function importSaveFromFile(file) {
  if (!file) {
    return;
  }
  const rawText = await file.text();
  const imported = parseImportedSave(rawText);
  ensureDbShape(imported.importedDb);
  writeLocalDbForSave(imported.saveId, imported.importedDb);
  setActiveSave(imported.saveId);
  state.settings.currency = imported.currency || "CAD";
  state.settings.defaultAmountType = imported.defaultAmountType || "net";
  state.month = imported.month;
  monthInput.value = imported.month;
  txDateInput.value = isoDateForMonth(imported.month);
  saveSettings();
  closeSetupOverlay();
  await loadBudget();
  showToast(`Imported save: ${imported.saveId}`);
}

async function runFirstTimeSetup() {
  const saveId = setupSaveInput.value.trim();
  const month = setupMonthInput.value || state.month;
  const incomeCents = dollarsToCents(setupIncomeInput.value || 0);
  const starterText = setupCategoriesInput.value.trim();

  if (saveId.length < 3) {
    throw new Error("Save name must be at least 3 characters");
  }
  if (!month) {
    throw new Error("Please choose a setup month");
  }
  if (!Number.isInteger(incomeCents) || incomeCents < 0) {
    throw new Error("Please enter a valid monthly net income");
  }

  setActiveSave(saveId);
  state.settings.currency = setupCurrencyInput.value;
  saveSettings();

  state.month = month;
  monthInput.value = month;
  txDateInput.value = isoDateForMonth(month);

  const db = readLocalDb();
  db.monthConfig[month] = { incomeCents, incomeType: "net" };
  writeLocalDb(db);

  if (starterText) {
    const currentDb = readLocalDb();
    const livingGroupId =
      currentDb.groups.find((group) => /living|daily|spend/i.test(group.name))?.id || currentDb.groups[0]?.id;
    const lines = starterText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const [namePart, amountPart] = line.split(":");
      const name = String(namePart || "").trim();
      const amountCents = dollarsToCents(String(amountPart || "0").trim());
      if (!name) {
        continue;
      }
      await api("/api/categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          groupId: livingGroupId,
          assignedCents: Number.isInteger(amountCents) ? Math.max(amountCents, 0) : 0,
          targetCents: Number.isInteger(amountCents) ? Math.max(amountCents, 0) : 0,
          notes: "Created from setup"
        })
      });
    }
  }

  closeSetupOverlay();
  await loadBudget();
  showToast("Save created only in this browser");
}

function setMetricValue(element, valueText) {
  const key = element.id;
  const previous = valueCache.get(key);
  if (previous !== valueText) {
    element.textContent = valueText;
    element.classList.remove("value-pop");
    void element.offsetWidth;
    element.classList.add("value-pop");
    valueCache.set(key, valueText);
    return;
  }
  element.textContent = valueText;
}

function syncCategorySelects(categories) {
  const selects = [
    txCategoryInput,
    categoryGroupInput,
    reallocateFrom,
    reallocateTo,
    txFilterCategory,
    scheduledCategoryInput
  ];

  for (const select of selects) {
    select.innerHTML = "";
  }

  txFilterCategory.append(createElement("option", "", "All categories")).value = "";

  for (const group of state.budget.groups) {
    const option = createElement("option", "", group.name);
    option.value = group.id;
    categoryGroupInput.append(option);
  }

  for (const category of categories) {
    const optionA = createElement("option", "", category.name);
    optionA.value = category.id;
    txCategoryInput.append(optionA);

    const optionB = createElement("option", "", category.name);
    optionB.value = category.id;
    reallocateFrom.append(optionB);

    const optionC = createElement("option", "", category.name);
    optionC.value = category.id;
    reallocateTo.append(optionC);

    const optionD = createElement("option", "", category.name);
    optionD.value = category.id;
    txFilterCategory.append(optionD);

    const optionE = createElement("option", "", category.name);
    optionE.value = category.id;
    scheduledCategoryInput.append(optionE);
  }

  txFilterCategory.value = state.txFilters.categoryId;
}

function renderGroups(groups) {
  groupsList.innerHTML = "";

  for (const [groupIndex, group] of groups.entries()) {
    const block = createElement("section", "group-block");
    block.style.animationDelay = `${groupIndex * 28}ms`;

    const head = createElement("div", "group-head");
    const titleWrap = createElement("div");
    titleWrap.append(createElement("strong", "", group.name));
    titleWrap.append(
      createElement(
        "p",
        "",
        `Assigned ${formatCents(group.assignedCents)} • Available ${formatCents(group.availableCents)}`
      )
    );

    const groupRenameInput = createElement("input");
    groupRenameInput.value = group.name;
    const groupSaveBtn = createElement("button", "ghost-btn", "Save");
    groupSaveBtn.type = "button";
    groupSaveBtn.addEventListener("click", async () => {
      try {
        await api(`/api/groups/${group.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: groupRenameInput.value })
        });
        await loadBudget();
        showToast("Group updated");
      } catch (error) {
        showToast(error.message);
      }
    });

    const headControls = createElement("div", "category-edit");
    headControls.append(groupRenameInput, groupSaveBtn);
    head.append(titleWrap, headControls);
    block.append(head);

    for (const category of group.categories) {
      const row = createElement("article", "category-row");
      const info = createElement("div");
      const title = createElement("strong", "", category.name);
      const meta = createElement("div", "category-meta");
      meta.append(
        createElement("span", "", `Assigned: ${formatCents(category.assignedCents)}`),
        createElement("span", "", `Activity: ${formatCents(category.activityCents)}`),
        createElement("span", "", `Available: ${formatCents(category.availableCents)}`),
        createElement("span", "", `Target: ${formatCents(category.targetCents)}`)
      );

      const targetWrap = createElement("div", "target-wrap");
      const targetText = createElement(
        "small",
        "",
        `Progress ${(category.targetProgress * 100).toFixed(0)}% • Underfunded ${formatCents(category.underfundedCents)}`
      );
      const targetBar = createElement("div", "target-bar");
      const targetBarFill = createElement("span");
      targetBarFill.style.width = `${Math.max(Math.min(category.targetProgress * 100, 100), 0)}%`;
      targetBar.append(targetBarFill);
      targetWrap.append(targetText, targetBar);

      const note = createElement("p", "", category.notes || "No notes");
      note.style.margin = "0.35rem 0 0";
      note.style.fontSize = "0.82rem";
      note.style.color = "#4c5e70";

      info.append(title, meta, targetWrap, note);

      const controls = createElement("div", "category-edit");
      const assignInput = createElement("input");
      assignInput.type = "number";
      assignInput.step = "0.01";
      assignInput.value = (category.assignedCents / 100).toFixed(2);

      const targetInput = createElement("input");
      targetInput.type = "number";
      targetInput.step = "0.01";
      targetInput.value = (category.targetCents / 100).toFixed(2);

      const saveBtn = createElement("button", "", "Save");
      saveBtn.type = "button";
      saveBtn.addEventListener("click", async () => {
        try {
          await api(`/api/categories/${category.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              month: state.month,
              assignedCents: dollarsToCents(assignInput.value),
              targetCents: dollarsToCents(targetInput.value)
            })
          });
          await loadBudget();
          showToast("Category saved");
        } catch (error) {
          showToast(error.message);
        }
      });

      controls.append(assignInput, targetInput, saveBtn);
      row.append(info, controls);
      block.append(row);
    }

    groupsList.append(block);
  }
}

function renderTransactions() {
  transactionsList.innerHTML = "";
  const transactions = state.budget.transactions
    .filter((tx) => (state.txFilters.categoryId ? tx.categoryId === state.txFilters.categoryId : true))
    .filter((tx) => {
      if (!state.txFilters.q) {
        return true;
      }
      return `${tx.note ?? ""} ${tx.payee ?? ""}`.toLowerCase().includes(state.txFilters.q);
    });

  if (transactions.length === 0) {
    transactionsList.append(createElement("p", "", "No transactions for current filter."));
    return;
  }

  for (const tx of transactions) {
    const category = state.budget.categories.find((item) => item.id === tx.categoryId);
    const row = createElement("article", "tx-row");
    const left = createElement("div");
    left.append(
      createElement("strong", "", tx.note || "Transaction"),
      createElement(
        "p",
        "",
        `${tx.payee || "No payee"} • ${category ? category.name : "Unknown"} • ${new Date(tx.occurredAt).toLocaleDateString()} • ${tx.cleared ? "Cleared" : "Uncleared"} • ${normalizeAmountType(tx.amountType, "net").toUpperCase()}`
      )
    );

    const amount = createElement(
      "strong",
      tx.amountCents < 0 ? "tx-amount-negative" : "tx-amount-positive",
      formatCents(tx.amountCents)
    );
    const toggleClear = createElement("button", "ghost-btn", tx.cleared ? "Unclear" : "Clear");
    toggleClear.type = "button";
    toggleClear.addEventListener("click", async () => {
      try {
        await api(`/api/transactions/${tx.id}`, {
          method: "PATCH",
          body: JSON.stringify({ cleared: !tx.cleared })
        });
        await loadBudget();
        showToast("Transaction updated");
      } catch (error) {
        showToast(error.message);
      }
    });

    const right = createElement("div", "category-edit");
    right.append(amount, toggleClear);
    row.append(left, right);
    transactionsList.append(row);
  }
}

function renderScheduled() {
  scheduledList.innerHTML = "";

  if (!state.budget.scheduledTransactions.length) {
    scheduledList.append(createElement("p", "", "No scheduled transactions."));
    return;
  }

  for (const item of state.budget.scheduledTransactions) {
    const category = state.budget.categories.find((entry) => entry.id === item.categoryId);
    const row = createElement("article", "scheduled-row");
    const left = createElement("div");
    left.append(
      createElement("strong", "", item.note),
      createElement(
        "p",
        "",
        `${category ? category.name : "Unknown"} • Day ${item.dayOfMonth} • ${formatCents(item.amountCents)} • ${normalizeAmountType(item.amountType, "net").toUpperCase()}`
      )
    );

    const toggle = createElement("button", "ghost-btn", item.active ? "Disable" : "Enable");
    toggle.type = "button";
    toggle.addEventListener("click", async () => {
      try {
        await api(`/api/scheduled-transactions/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: !item.active })
        });
        await loadBudget();
        showToast("Scheduled updated");
      } catch (error) {
        showToast(error.message);
      }
    });

    row.append(left, toggle);
    scheduledList.append(row);
  }
}

function render() {
  if (!state.budget) {
    return;
  }

  setMetricValue(incomeValue, formatCents(state.budget.incomeCents));
  incomeLabel.textContent = "Net Income";
  setMetricValue(assignedValue, formatCents(state.budget.assignedCents));
  setMetricValue(tbbValue, formatCents(state.budget.toBeBudgetedCents));
  setMetricValue(overspentValue, formatCents(state.budget.overspentCents));
  setMetricValue(scheduledDueValue, String(state.budget.scheduledDueCount));
  tbbValue.classList.toggle("negative", state.budget.toBeBudgetedCents < 0);

  incomeInput.value = (state.budget.incomeCents / 100).toFixed(2);
  txAmountTypeInput.value = normalizeAmountType(state.settings.defaultAmountType, "net");
  scheduledAmountTypeInput.value = normalizeAmountType(state.settings.defaultAmountType, "net");
  categoryCount.textContent = String(state.budget.categories.length);

  syncCategorySelects(state.budget.categories);
  if (!txDateInput.value) {
    txDateInput.value = isoDateForMonth(state.month);
  }

  renderGroups(state.budget.groups);
  renderTransactions();
  renderScheduled();
}

async function loadBudget() {
  state.budget = await api(`/api/budget?month=${state.month}`);
  render();
}

monthInput.value = state.month;

importSaveBtn?.addEventListener("click", openImportPicker);
setupImportBtn?.addEventListener("click", openImportPicker);
exportSaveBtn?.addEventListener("click", () => {
  try {
    const payload = buildExportPayload();
    const filename = `${payload.saveId || "budgetdesk-save"}-${payload.month}.json`;
    downloadTextFile(filename, JSON.stringify(payload, null, 2));
    showToast("Save exported");
  } catch (error) {
    showToast(error.message);
  }
});
importSaveInput?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  try {
    await importSaveFromFile(file);
  } catch (error) {
    showToast(error.message);
  } finally {
    event.target.value = "";
  }
});

refreshBtn.addEventListener("click", () => {
  loadBudget().catch((error) => showToast(error.message));
});

setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await runFirstTimeSetup();
  } catch (error) {
    showToast(error.message);
  }
});

deviceLocalInfoBtn?.addEventListener("click", toggleDeviceLocalInfo);
deviceLocalInfoClose?.addEventListener("click", closeDeviceLocalInfo);
deviceLocalInfoPanel?.addEventListener("click", (event) => {
  if (event.target === deviceLocalInfoPanel) {
    closeDeviceLocalInfo();
  }
});

monthInput.addEventListener("change", async () => {
  state.month = monthInput.value;
  txDateInput.value = isoDateForMonth(state.month);
  await loadBudget();
});

incomeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/month-income", {
      method: "PUT",
      body: JSON.stringify({
        month: state.month,
        incomeCents: dollarsToCents(incomeInput.value),
        incomeType: "net"
      })
    });
    await loadBudget();
    showToast("Net income saved locally");
  } catch (error) {
    showToast(error.message);
  }
});

quickAssignForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await api("/api/quick-assign", {
      method: "POST",
      body: JSON.stringify({ month: state.month, mode: quickAssignMode.value })
    });
    await loadBudget();
    showToast(`Assigned ${formatCents(result.assignedDeltaCents)}`);
  } catch (error) {
    showToast(error.message);
  }
});

applyScheduledBtn.addEventListener("click", async () => {
  try {
    const result = await api("/api/scheduled-transactions/apply", {
      method: "POST",
      body: JSON.stringify({ month: state.month })
    });
    await loadBudget();
    showToast(`Applied ${result.created} scheduled`);
  } catch (error) {
    showToast(error.message);
  }
});

newGroupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/groups", {
      method: "POST",
      body: JSON.stringify({
        name: groupNameInput.value,
        sort: groupSortInput.value ? Number(groupSortInput.value) : undefined
      })
    });
    groupNameInput.value = "";
    groupSortInput.value = "";
    await loadBudget();
    showToast("Group added");
  } catch (error) {
    showToast(error.message);
  }
});

newCategoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: categoryNameInput.value,
        groupId: categoryGroupInput.value,
        assignedCents: dollarsToCents(categoryAssignedInput.value),
        targetCents: dollarsToCents(categoryTargetInput.value || 0),
        notes: categoryNotesInput.value
      })
    });
    categoryNameInput.value = "";
    categoryAssignedInput.value = "";
    categoryTargetInput.value = "0";
    categoryNotesInput.value = "";
    await loadBudget();
    showToast("Category added");
  } catch (error) {
    showToast(error.message);
  }
});

reallocateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/reallocate", {
      method: "POST",
      body: JSON.stringify({
        month: state.month,
        fromCategoryId: reallocateFrom.value,
        toCategoryId: reallocateTo.value,
        amountCents: dollarsToCents(reallocateAmount.value)
      })
    });
    reallocateAmount.value = "";
    await loadBudget();
    showToast("Funds moved");
  } catch (error) {
    showToast(error.message);
  }
});

txFilterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.txFilters.categoryId = txFilterCategory.value;
  state.txFilters.q = txSearchInput.value.toLowerCase().trim();
  renderTransactions();
});

transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const amountType = normalizeAmountType(txAmountTypeInput.value, state.settings.defaultAmountType);
    await api("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        categoryId: txCategoryInput.value,
        amountCents: dollarsToCents(txAmountInput.value),
        amountType,
        note: txNoteInput.value,
        payee: txPayeeInput.value,
        cleared: txClearedInput.value === "true",
        occurredAt: `${txDateInput.value}T12:00:00.000Z`
      })
    });
    state.settings.defaultAmountType = amountType;
    saveSettings();
    txAmountInput.value = "";
    txNoteInput.value = "";
    txPayeeInput.value = "";
    await loadBudget();
    showToast("Transaction added");
  } catch (error) {
    showToast(error.message);
  }
});

newScheduledForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const amountType = normalizeAmountType(scheduledAmountTypeInput.value, state.settings.defaultAmountType);
    await api("/api/scheduled-transactions", {
      method: "POST",
      body: JSON.stringify({
        categoryId: scheduledCategoryInput.value,
        note: scheduledNoteInput.value,
        amountCents: dollarsToCents(scheduledAmountInput.value),
        amountType,
        dayOfMonth: Number(scheduledDayInput.value)
      })
    });
    state.settings.defaultAmountType = amountType;
    saveSettings();
    scheduledNoteInput.value = "";
    scheduledAmountInput.value = "";
    scheduledDayInput.value = "1";
    await loadBudget();
    showToast("Scheduled transaction added");
  } catch (error) {
    showToast(error.message);
  }
});

loadSettings();

if (!hasActiveSave()) {
  openSetupOverlay();
} else {
  loadBudget().catch((error) => showToast(error.message));
}