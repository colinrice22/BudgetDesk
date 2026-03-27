import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = join(process.cwd(), "apps", "api", "data");
const DATA_FILE = join(DATA_DIR, "budget-db.json");
const PUBLIC_DIR = join(process.cwd(), "apps", "web", "public");

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

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const AMOUNT_TYPES = new Set(["net", "gross"]);

function normalizeAmountType(value, fallback = "net") {
  const normalized = String(value ?? fallback).toLowerCase().trim();
  return AMOUNT_TYPES.has(normalized) ? normalized : fallback;
}

function initDataFile() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
}

function readDb() {
  initDataFile();
  const raw = readFileSync(DATA_FILE, "utf8");
  const db = JSON.parse(raw);
  const changed = ensureDbShape(db);
  if (changed) {
    writeDb(db);
  }
  return db;
}

function writeDb(db) {
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

function ensureDbShape(db) {
  let changed = false;
  const inferGroup = (name) => {
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
  };

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
    const normalizedIncomeType = normalizeAmountType(config.incomeType, "net");
    if (config.incomeType !== normalizedIncomeType) {
      config.incomeType = normalizedIncomeType;
      changed = true;
    }
  }

  if (!db.monthPlans || typeof db.monthPlans !== "object") {
    db.monthPlans = {};
    changed = true;
  }

  if (!Array.isArray(db.groups) || db.groups.length === 0) {
    db.groups = DEFAULT_DB.groups;
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
      category.id = `cat-${randomUUID()}`;
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
      category.targetCents = Math.max(Number(category.assignedCents ?? 0) || 0, 0);
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
    const normalizedAmountType = normalizeAmountType(tx.amountType, "net");
    if (tx.amountType !== normalizedAmountType) {
      tx.amountType = normalizedAmountType;
      changed = true;
    }
  }

  for (const scheduled of db.scheduledTransactions) {
    if (typeof scheduled.active !== "boolean") {
      scheduled.active = true;
      changed = true;
    }
    if (typeof scheduled.lastAppliedMonth !== "string" && scheduled.lastAppliedMonth !== null) {
      scheduled.lastAppliedMonth = null;
      changed = true;
    }
    const normalizedAmountType = normalizeAmountType(scheduled.amountType, "net");
    if (scheduled.amountType !== normalizedAmountType) {
      scheduled.amountType = normalizedAmountType;
      changed = true;
    }
  }

  if (db.scheduledTransactions.length === 0) {
    const rentCategory = db.categories.find((item) => String(item.name).toLowerCase().includes("rent"));
    if (rentCategory) {
      db.scheduledTransactions.push({
        id: `sch-${randomUUID()}`,
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

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function isIntegerCents(value) {
  return Number.isInteger(value);
}

function monthFromIso(isoDate) {
  return String(isoDate).slice(0, 7);
}

function validMonth(month) {
  return MONTH_REGEX.test(month);
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
      targetProgress:
        targetCents <= 0 ? 1 : Math.max(Math.min(assignedForMonth / targetCents, 1), 0)
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

  const overspentCents = categories.reduce(
    (total, category) => total + Math.min(category.availableCents, 0),
    0
  );

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
  const currentAssigned = categories.reduce(
    (sum, category) => sum + getAssignedCents(db, month, category),
    0
  );
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
    const base = Math.floor(remaining / categories.length);
    let remainder = remaining;
    for (const category of categories) {
      const assigned = getAssignedCents(db, month, category);
      const add = Math.min(base, remainder);
      setAssignedCents(db, month, category.id, assigned + add);
      remainder -= add;
      assignedDeltaCents += add;
    }
    let i = 0;
    while (remainder > 0 && categories.length > 0) {
      const category = categories[i % categories.length];
      const assigned = getAssignedCents(db, month, category);
      setAssignedCents(db, month, category.id, assigned + 1);
      remainder -= 1;
      assignedDeltaCents += 1;
      i += 1;
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
      id: `tx-${randomUUID()}`,
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

function contentTypeFor(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  return "text/plain; charset=utf-8";
}

function serveStatic(req, res, url) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(pathname).replace(/^([.][.][/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safePath);

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    sendText(res, 404, "Not Found");
    return;
  }

  const body = readFileSync(filePath);
  res.writeHead(200, { "content-type": contentTypeFor(filePath) });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/api/health" && method === "GET") {
      sendJson(res, 200, {
        status: "ok",
        storageMode: "browser-local-only",
        note: "This server only serves app files. Budget data is kept in browser storage."
      });
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(res, 410, {
        error: "Budget API disabled. Budget data is stored only in browser local storage now."
      });
      return;
    }

    if (url.pathname === "/api/month-income" && method === "PUT") {
      const body = await parseBody(req);
      const month = String(body.month ?? "");
      const incomeCents = Number(body.incomeCents);
      const incomeType = String(body.incomeType ?? "").toLowerCase().trim();

      if (!validMonth(month)) {
        sendJson(res, 400, { error: "month must be YYYY-MM" });
        return;
      }

      if (!isIntegerCents(incomeCents) || incomeCents < 0) {
        sendJson(res, 400, { error: "incomeCents must be a non-negative integer" });
        return;
      }

      if (!AMOUNT_TYPES.has(incomeType)) {
        sendJson(res, 400, { error: "incomeType must be net or gross" });
        return;
      }

      const db = readDb();
      db.monthConfig[month] = { incomeCents, incomeType };
      writeDb(db);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/quick-assign" && method === "POST") {
      const body = await parseBody(req);
      const month = String(body.month ?? "");
      const mode = String(body.mode ?? "underfunded");

      if (!validMonth(month)) {
        sendJson(res, 400, { error: "month must be YYYY-MM" });
        return;
      }
      if (!["underfunded", "even"].includes(mode)) {
        sendJson(res, 400, { error: "mode must be underfunded or even" });
        return;
      }

      const db = readDb();
      const result = runQuickAssign(db, month, mode);
      writeDb(db);
      sendJson(res, 200, result);
      return;
    }

    if (url.pathname === "/api/reallocate" && method === "POST") {
      const body = await parseBody(req);
      const month = String(body.month ?? "");
      const fromCategoryId = String(body.fromCategoryId ?? "");
      const toCategoryId = String(body.toCategoryId ?? "");
      const amountCents = Number(body.amountCents);

      if (!validMonth(month)) {
        sendJson(res, 400, { error: "month must be YYYY-MM" });
        return;
      }
      if (!isIntegerCents(amountCents) || amountCents <= 0) {
        sendJson(res, 400, { error: "amountCents must be a positive integer" });
        return;
      }
      if (!fromCategoryId || !toCategoryId || fromCategoryId === toCategoryId) {
        sendJson(res, 400, { error: "fromCategoryId and toCategoryId must be different" });
        return;
      }

      const db = readDb();
      const fromCategory = categoryById(db, fromCategoryId);
      const toCategory = categoryById(db, toCategoryId);

      if (!fromCategory || !toCategory) {
        sendJson(res, 404, { error: "Category not found" });
        return;
      }

      const fromAssigned = getAssignedCents(db, month, fromCategory);
      if (fromAssigned < amountCents) {
        sendJson(res, 400, { error: "Not enough assigned funds in source category" });
        return;
      }

      setAssignedCents(db, month, fromCategory.id, fromAssigned - amountCents);
      setAssignedCents(db, month, toCategory.id, getAssignedCents(db, month, toCategory) + amountCents);
      writeDb(db);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/scheduled-transactions/apply" && method === "POST") {
      const body = await parseBody(req);
      const month = String(body.month ?? "");
      if (!validMonth(month)) {
        sendJson(res, 400, { error: "month must be YYYY-MM" });
        return;
      }
      const db = readDb();
      const created = applyScheduledTransactions(db, month);
      writeDb(db);
      sendJson(res, 200, { created });
      return;
    }

    if (url.pathname === "/api/groups" && method === "GET") {
      const db = readDb();
      sendJson(res, 200, sortedGroups(db));
      return;
    }

    if (url.pathname === "/api/groups" && method === "POST") {
      const body = await parseBody(req);
      const name = String(body.name ?? "").trim();
      const sort = Number(body.sort ?? Number.MAX_SAFE_INTEGER);
      if (!name) {
        sendJson(res, 400, { error: "name is required" });
        return;
      }
      const db = readDb();
      const group = { id: `grp-${randomUUID()}`, name, sort: Number.isFinite(sort) ? sort : 9999 };
      db.groups.push(group);
      writeDb(db);
      sendJson(res, 201, group);
      return;
    }

    const groupMatch = url.pathname.match(/^\/api\/groups\/([^/]+)$/);
    if (groupMatch && method === "PATCH") {
      const groupId = groupMatch[1];
      const body = await parseBody(req);
      const nextName = body.name === undefined ? undefined : String(body.name).trim();
      const nextSort = body.sort === undefined ? undefined : Number(body.sort);
      const db = readDb();
      const group = db.groups.find((item) => item.id === groupId);

      if (!group) {
        sendJson(res, 404, { error: "Group not found" });
        return;
      }
      if (nextName !== undefined && nextName) {
        group.name = nextName;
      }
      if (nextSort !== undefined && Number.isFinite(nextSort)) {
        group.sort = nextSort;
      }
      writeDb(db);
      sendJson(res, 200, group);
      return;
    }

    if (url.pathname === "/api/categories" && method === "GET") {
      const db = readDb();
      sendJson(res, 200, sortedCategories(db));
      return;
    }

    if (url.pathname === "/api/categories" && method === "POST") {
      const body = await parseBody(req);
      const name = String(body.name ?? "").trim();
      const assignedCents = Number(body.assignedCents ?? 0);
      const targetCents = Number(body.targetCents ?? 0);
      const groupId = String(body.groupId ?? "").trim();
      const notes = String(body.notes ?? "").trim();

      if (!name) {
        sendJson(res, 400, { error: "name is required" });
        return;
      }

      if (!isIntegerCents(assignedCents)) {
        sendJson(res, 400, { error: "assignedCents must be an integer" });
        return;
      }

      if (!isIntegerCents(targetCents) || targetCents < 0) {
        sendJson(res, 400, { error: "targetCents must be a non-negative integer" });
        return;
      }

      const db = readDb();
      const fallbackGroupId = db.groups[0]?.id;
      const resolvedGroupId = db.groups.some((group) => group.id === groupId) ? groupId : fallbackGroupId;
      const category = {
        id: `cat-${randomUUID()}`,
        groupId: resolvedGroupId,
        name,
        assignedCents,
        targetCents,
        notes,
        sort: db.categories.length + 1,
        archived: false
      };
      db.categories.push(category);
      writeDb(db);
      sendJson(res, 201, category);
      return;
    }

    const categoryMatch = url.pathname.match(/^\/api\/categories\/([^/]+)$/);
    if (categoryMatch && method === "PATCH") {
      const categoryId = categoryMatch[1];
      const body = await parseBody(req);
      const nextName = body.name === undefined ? undefined : String(body.name).trim();
      const nextAssigned = body.assignedCents === undefined ? undefined : Number(body.assignedCents);
      const nextTarget = body.targetCents === undefined ? undefined : Number(body.targetCents);
      const nextGroupId = body.groupId === undefined ? undefined : String(body.groupId);
      const nextNotes = body.notes === undefined ? undefined : String(body.notes).trim();
      const nextMonth = body.month === undefined ? undefined : String(body.month);
      const nextArchived = body.archived === undefined ? undefined : Boolean(body.archived);

      if (nextAssigned !== undefined && !isIntegerCents(nextAssigned)) {
        sendJson(res, 400, { error: "assignedCents must be an integer" });
        return;
      }
      if (nextTarget !== undefined && (!isIntegerCents(nextTarget) || nextTarget < 0)) {
        sendJson(res, 400, { error: "targetCents must be a non-negative integer" });
        return;
      }
      if (nextMonth !== undefined && !validMonth(nextMonth)) {
        sendJson(res, 400, { error: "month must be YYYY-MM when provided" });
        return;
      }

      const db = readDb();
      const category = db.categories.find((item) => item.id === categoryId);
      if (!category) {
        sendJson(res, 404, { error: "Category not found" });
        return;
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

      writeDb(db);
      sendJson(res, 200, category);
      return;
    }

    if (url.pathname === "/api/transactions" && method === "GET") {
      const month = url.searchParams.get("month") ?? "2026-03";
      const categoryId = url.searchParams.get("categoryId") ?? "";
      const q = String(url.searchParams.get("q") ?? "").toLowerCase().trim();

      if (!validMonth(month)) {
        sendJson(res, 400, { error: "month must be YYYY-MM" });
        return;
      }

      const db = readDb();
      const transactions = db.transactions
        .filter((tx) => monthFromIso(tx.occurredAt) === month)
        .filter((tx) => (categoryId ? tx.categoryId === categoryId : true))
        .filter((tx) => {
          if (!q) {
            return true;
          }
          const search = `${tx.note} ${tx.payee}`.toLowerCase();
          return search.includes(q);
        })
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
      sendJson(res, 200, transactions);
      return;
    }

    if (url.pathname === "/api/transactions" && method === "POST") {
      const body = await parseBody(req);
      const categoryId = String(body.categoryId ?? "");
      const amountCents = Number(body.amountCents);
      const amountType = String(body.amountType ?? "").toLowerCase().trim();
      const note = String(body.note ?? "").trim();
      const payee = String(body.payee ?? "").trim();
      const cleared = Boolean(body.cleared ?? false);
      const occurredAt = String(body.occurredAt ?? new Date().toISOString());

      if (!categoryId) {
        sendJson(res, 400, { error: "categoryId is required" });
        return;
      }

      if (!isIntegerCents(amountCents) || amountCents === 0) {
        sendJson(res, 400, { error: "amountCents must be a non-zero integer" });
        return;
      }

      if (!AMOUNT_TYPES.has(amountType)) {
        sendJson(res, 400, { error: "amountType must be net or gross" });
        return;
      }

      if (!/^\d{4}-\d{2}-\d{2}/.test(occurredAt)) {
        sendJson(res, 400, { error: "occurredAt must be an ISO date string" });
        return;
      }

      const db = readDb();
      const categoryExists = db.categories.some((item) => item.id === categoryId && !item.archived);
      if (!categoryExists) {
        sendJson(res, 404, { error: "Category not found" });
        return;
      }

      const transaction = {
        id: `tx-${randomUUID()}`,
        categoryId,
        amountCents,
        amountType,
        note,
        payee,
        cleared,
        occurredAt
      };

      db.transactions.push(transaction);
      writeDb(db);
      sendJson(res, 201, transaction);
      return;
    }

    const transactionMatch = url.pathname.match(/^\/api\/transactions\/([^/]+)$/);
    if (transactionMatch && method === "PATCH") {
      const transactionId = transactionMatch[1];
      const body = await parseBody(req);
      const db = readDb();
      const transaction = db.transactions.find((item) => item.id === transactionId);
      if (!transaction) {
        sendJson(res, 404, { error: "Transaction not found" });
        return;
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
      writeDb(db);
      sendJson(res, 200, transaction);
      return;
    }

    if (url.pathname === "/api/scheduled-transactions" && method === "GET") {
      const db = readDb();
      sendJson(res, 200, db.scheduledTransactions);
      return;
    }

    if (url.pathname === "/api/scheduled-transactions" && method === "POST") {
      const body = await parseBody(req);
      const categoryId = String(body.categoryId ?? "");
      const note = String(body.note ?? "").trim();
      const amountCents = Number(body.amountCents);
      const amountType = String(body.amountType ?? "").toLowerCase().trim();
      const dayOfMonth = Number(body.dayOfMonth);

      if (!categoryId || !note) {
        sendJson(res, 400, { error: "categoryId and note are required" });
        return;
      }
      if (!isIntegerCents(amountCents) || amountCents === 0) {
        sendJson(res, 400, { error: "amountCents must be a non-zero integer" });
        return;
      }
      if (!AMOUNT_TYPES.has(amountType)) {
        sendJson(res, 400, { error: "amountType must be net or gross" });
        return;
      }
      if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 28) {
        sendJson(res, 400, { error: "dayOfMonth must be an integer from 1 to 28" });
        return;
      }

      const db = readDb();
      if (!categoryById(db, categoryId)) {
        sendJson(res, 404, { error: "Category not found" });
        return;
      }

      const scheduled = {
        id: `sch-${randomUUID()}`,
        categoryId,
        note,
        amountCents,
        amountType,
        dayOfMonth,
        active: true,
        lastAppliedMonth: null
      };
      db.scheduledTransactions.push(scheduled);
      writeDb(db);
      sendJson(res, 201, scheduled);
      return;
    }

    const scheduledMatch = url.pathname.match(/^\/api\/scheduled-transactions\/([^/]+)$/);
    if (scheduledMatch && method === "PATCH") {
      const scheduledId = scheduledMatch[1];
      const body = await parseBody(req);
      const db = readDb();
      const scheduled = db.scheduledTransactions.find((item) => item.id === scheduledId);
      if (!scheduled) {
        sendJson(res, 404, { error: "Scheduled transaction not found" });
        return;
      }

      if (body.active !== undefined) {
        scheduled.active = Boolean(body.active);
      }
      if (body.note !== undefined) {
        scheduled.note = String(body.note).trim();
      }
      writeDb(db);
      sendJson(res, 200, scheduled);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "API route not found" });
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unknown server error"
    });
  }
});

const port = Number(process.env.API_PORT ?? 4000);
server.listen(port, () => {
  console.log(`Budget API + Web running at http://localhost:${port}`);
});
