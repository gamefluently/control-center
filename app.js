const STORAGE_KEY = "kyle_control_center_v1";
let currentFilter = "All";
let currentProjectId = null;

const seedState = {
  version: 1,
  lastExport: null,
  projects: []
};

const MASTER_REFRESH_VERSION = 1;
const MASTER_FIELDS = ["status", "objective", "nextAction", "blockers", "working", "notWorking", "completed", "backlog"];

function ensureSyncState() {
  if (!state.sync || typeof state.sync !== "object") {
    state.sync = { lastRefresh: null, projectStates: {}, summary: null };
  }
  if (!state.sync.projectStates || typeof state.sync.projectStates !== "object") {
    state.sync.projectStates = {};
  }
  return state.sync;
}


function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    } catch (err) {
      alert("Browser storage is unavailable. Changes may not persist in this browser.");
    }
    return clone(seedState);
  }

  try {
    const parsed = JSON.parse(saved);
    if (!validateState(parsed)) throw new Error("Invalid state");
    return parsed;
  } catch (err) {
    try {
      const recoveryKey = STORAGE_KEY + "_unreadable_" + Date.now();
      localStorage.setItem(recoveryKey, saved);
    } catch (_) {}

    alert("Saved data could not be read. A recovery copy was preserved when possible. Import your latest JSON backup.");
    return clone(seedState);
  }
}

let state = loadState();


function validateState(candidate) {
  if (!candidate || typeof candidate !== "object") return false;
  if (!Array.isArray(candidate.projects)) return false;

  const validStatuses = new Set(["Active", "Waiting", "Paused", "Done"]);
  const validTypes = new Set(["Business", "Personal", "Project", "Client"]);

  return candidate.projects.every(p =>
    p &&
    typeof p === "object" &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    typeof p.status === "string" &&
    validStatuses.has(p.status) &&
    typeof p.type === "string" &&
    validTypes.has(p.type) &&
    typeof p.objective === "string" &&
    typeof p.nextAction === "string" &&
    typeof p.blockers === "string" &&
    typeof p.working === "string" &&
    typeof p.notWorking === "string" &&
    typeof p.completed === "string" &&
    typeof p.backlog === "string" &&
    typeof p.updated === "string"
  );
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const stamp = new Date().toLocaleString();
    document.getElementById("storageStatus").textContent =
      "Saved locally in this browser • " + stamp;
    const sideStatus = document.getElementById("sidebarStorageStatus");
    if (sideStatus) sideStatus.textContent = "Saved locally • " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    updateBackupNotice();
    return true;
  } catch (err) {
    alert("This browser could not save your changes. Export a JSON backup now and avoid closing the page until you have it.");
    document.getElementById("storageStatus").textContent =
      "WARNING: browser storage failed. Export a backup.";
    return false;
  }
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function statusOrder(status) {
  return { Active: 0, Waiting: 1, Paused: 2, Done: 3 }[status] ?? 9;
}


function projectSubtitle(project) {
  const name = (project.name || "").toLowerCase();

  if (name.includes("lantern") || name === "lnf") return "Digital product business";
  if (name === "fag" || name.includes("field atlas")) return "Autonomous e-commerce";
  if (name.includes("thai bf") || name.includes("gamefluently")) return "Thai learning game";
  if (name.includes("income") || name.includes("upwork") || name.includes("job")) return "Freelance & job search";
  if (name.includes("yfo") || name.includes("yearfortyone")) return "Visual diary";
  if (name.includes("commostudio")) return "Fashion / product brand";
  if (name.includes("thai learning")) return "Language learning";

  return project.type || "Project";
}

function projectMonogram(project) {
  const words = String(project.name || "")
    .replace(/[\/_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "PR";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function excerpt(value, max = 150) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "No summary yet.";
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function hasMeaningfulBlocker(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean || clean === "—" || clean === "none" || clean === "no blocker") return false;
  if (clean.startsWith("no immediate blocker")) return false;
  if (clean.startsWith("no current blocker")) return false;
  if (clean.startsWith("nothing fundamentally broken")) return false;
  return true;
}

function renderSummary() {
  const counts = { Active: 0, Waiting: 0, Paused: 0, Done: 0 };

  state.projects.forEach(project => {
    if (Object.prototype.hasOwnProperty.call(counts, project.status)) {
      counts[project.status] += 1;
    }
  });

  document.getElementById("summaryActive").textContent = counts.Active;
  document.getElementById("summaryWaiting").textContent = counts.Waiting;
  document.getElementById("summaryPaused").textContent = counts.Paused;
  document.getElementById("summaryDone").textContent = counts.Done;
}

function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === filter);
  });

  document.querySelectorAll(".summary-card").forEach(card => {
    card.classList.toggle("active-summary", card.dataset.filterSummary === filter);
  });

  renderDashboard();
}


function normalizeProjectName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function projectMatchScore(project, incoming) {
  const candidates = new Set([
    project.name,
    projectSubtitle(project),
    ...(Array.isArray(incoming.match) ? incoming.match : []),
    incoming.name || ""
  ].map(normalizeProjectName).filter(Boolean));

  const projectNames = [
    normalizeProjectName(project.name),
    normalizeProjectName(project.id)
  ].filter(Boolean);

  let best = 0;
  for (const p of projectNames) {
    for (const c of candidates) {
      if (!p || !c) continue;
      if (p === c) best = Math.max(best, 100);
      else if (p.includes(c) || c.includes(p)) best = Math.max(best, 80);
      else {
        const a = new Set(p.split(" "));
        const b = new Set(c.split(" "));
        const overlap = [...a].filter(x => b.has(x)).length;
        const denom = Math.max(a.size, b.size, 1);
        best = Math.max(best, Math.round((overlap / denom) * 60));
      }
    }
  }
  return best;
}

function findMatchingProject(incoming) {
  const scored = state.projects
    .map(project => ({ project, score: projectMatchScore(project, incoming) }))
    .sort((a, b) => b.score - a.score);

  return scored.length && scored[0].score >= 45 ? scored[0].project : null;
}

function getProjectSyncState(projectId) {
  const sync = ensureSyncState();
  return sync.projectStates[projectId] || null;
}

function renderRefreshStatus() {
  const el = document.getElementById("refreshStatus");
  const sync = ensureSyncState();

  if (!sync.lastRefresh || !sync.summary) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  const changed = Number(sync.summary.changedProjects || 0);
  const stale = Number(sync.summary.staleProjects || 0);
  const unmatched = Number(sync.summary.unmatchedProjects || 0);

  el.innerHTML = `
    <div class="refresh-status-copy">
      <div class="eyebrow">LAST AI REFRESH</div>
      <div class="refresh-status-line">
        <span class="refresh-chip fresh">${changed} changed</span>
        <span class="refresh-chip stale">${stale} unchanged</span>
        ${unmatched ? `<span class="refresh-chip unmatched">${unmatched} unmatched</span>` : ""}
      </div>
    </div>
    <div class="refresh-status-date">${esc(sync.lastRefresh)}</div>
  `;
}

function validateMasterRefresh(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (Number(payload.controlCenterUpdate) !== MASTER_REFRESH_VERSION) return false;
  if (!Array.isArray(payload.projects)) return false;
  return payload.projects.every(item =>
    item &&
    typeof item === "object" &&
    (typeof item.name === "string" || Array.isArray(item.match))
  );
}

function compareMasterRefresh(payload) {
  const results = [];
  const claimed = new Set();

  for (const incoming of payload.projects) {
    const project = findMatchingProject(incoming);

    if (!project || claimed.has(project.id)) {
      results.push({
        incoming,
        project: null,
        changedFields: [],
        unchangedFields: [],
        unmatched: true
      });
      continue;
    }

    claimed.add(project.id);
    const changedFields = [];
    const unchangedFields = [];

    for (const key of MASTER_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(incoming, key)) continue;
      const value = incoming[key];
      if (value === null || value === undefined || String(value).trim() === "") continue;

      if (valuesDiffer(project[key] || "", value)) changedFields.push(key);
      else unchangedFields.push(key);
    }

    results.push({
      incoming,
      project,
      changedFields,
      unchangedFields,
      unmatched: false
    });
  }

  return results;
}

let pendingMasterRefresh = null;

function showMasterRefreshPreview(fileName, payload) {
  const panel = document.getElementById("masterRefreshPanel");
  const results = compareMasterRefresh(payload);
  pendingMasterRefresh = { fileName, payload, results };

  const matched = results.filter(r => !r.unmatched);
  const changed = matched.filter(r => r.changedFields.length > 0);
  const stale = matched.filter(r => r.changedFields.length === 0);
  const unmatched = results.filter(r => r.unmatched);

  panel.hidden = false;
  panel.innerHTML = `
    <div class="master-refresh-head">
      <div>
        <div class="eyebrow">AI REFRESH PREVIEW</div>
        <h3 class="master-refresh-title">${esc(fileName)}</h3>
        <p class="master-refresh-note">
          ${changed.length} project${changed.length === 1 ? "" : "s"} changed •
          ${stale.length} unchanged •
          ${unmatched.length} unmatched
        </p>
      </div>
      <div class="master-refresh-actions">
        <button id="cancelMasterRefreshBtn" class="button ghost" type="button">Cancel</button>
        <button id="applyMasterRefreshBtn" class="button primary" type="button" ${matched.length ? "" : "disabled"}>
          Apply Refresh
        </button>
      </div>
    </div>

    <div class="master-refresh-legend">
      <span class="master-legend fresh"><span></span>Green = new / changed</span>
      <span class="master-legend stale"><span></span>Brown = stale / unchanged</span>
    </div>

    <div class="master-project-list">
      ${results.map(result => {
        if (result.unmatched) {
          return `
            <div class="master-project-row unmatched">
              <div>
                <div class="master-project-name">${esc(result.incoming.name || (result.incoming.match || []).join(" / ") || "Unknown project")}</div>
                <div class="master-project-sub">No existing Control Center project matched this update.</div>
              </div>
              <div class="master-state-badge unmatched">UNMATCHED</div>
            </div>
          `;
        }

        const changedState = result.changedFields.length > 0;
        const fieldNames = result.changedFields.map(k => MD_FIELD_LABELS[k] || k).join(", ");
        return `
          <div class="master-project-row ${changedState ? "changed" : "stale"}">
            <div>
              <div class="master-project-name">${esc(result.project.name)}</div>
              <div class="master-project-sub">
                ${changedState
                  ? `${result.changedFields.length} changed field${result.changedFields.length === 1 ? "" : "s"}: ${esc(fieldNames)}`
                  : `Recognized, but nothing is newer than the current Control Center state.`}
              </div>
            </div>
            <div class="master-state-badge ${changedState ? "fresh" : "stale"}">
              ${changedState ? "CHANGED" : "UNCHANGED"}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  document.getElementById("cancelMasterRefreshBtn").onclick = cancelMasterRefresh;
  document.getElementById("applyMasterRefreshBtn").onclick = applyMasterRefresh;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelMasterRefresh() {
  pendingMasterRefresh = null;
  const panel = document.getElementById("masterRefreshPanel");
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = "";
  }
  const input = document.getElementById("masterRefreshInput");
  if (input) input.value = "";
}

function applyMasterRefresh() {
  if (!pendingMasterRefresh) return;

  const { payload, results } = pendingMasterRefresh;
  const sync = ensureSyncState();
  const nowLabel = payload.generatedAt || todayISO();

  let changedProjects = 0;
  let staleProjects = 0;
  let unmatchedProjects = 0;

  for (const result of results) {
    if (result.unmatched || !result.project) {
      unmatchedProjects += 1;
      continue;
    }

    const idx = state.projects.findIndex(p => p.id === result.project.id);
    if (idx < 0) continue;

    if (result.changedFields.length) {
      const next = { ...state.projects[idx] };

      for (const key of result.changedFields) {
        next[key] = result.incoming[key];
      }

      next.updated = payload.generatedAt || todayISO();
      state.projects[idx] = next;
      sync.projectStates[next.id] = {
        state: "changed",
        fields: result.changedFields,
        refreshedAt: nowLabel
      };
      changedProjects += 1;
    } else {
      sync.projectStates[result.project.id] = {
        state: "stale",
        fields: [],
        refreshedAt: nowLabel
      };
      staleProjects += 1;
    }
  }

  sync.lastRefresh = nowLabel;
  sync.summary = { changedProjects, staleProjects, unmatchedProjects };

  if (!saveState()) return;

  pendingMasterRefresh = null;
  cancelMasterRefresh();
  renderDashboard();
  renderRefreshStatus();

  const panel = document.getElementById("masterRefreshPanel");
  panel.hidden = false;
  panel.innerHTML = `
    <div class="master-refresh-result">
      <div>
        <div class="eyebrow">AI REFRESH APPLIED</div>
        <h3 class="master-refresh-title">${changedProjects} project${changedProjects === 1 ? "" : "s"} updated</h3>
        <p class="master-refresh-note">The dashboard is now marked green for changed projects and brown for unchanged projects.</p>
      </div>
      <button id="closeMasterRefreshResultBtn" class="button ghost" type="button">Close</button>
    </div>
  `;
  document.getElementById("closeMasterRefreshResultBtn").onclick = cancelMasterRefresh;
}

function importMasterRefresh(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (!validateMasterRefresh(payload)) {
        throw new Error("Invalid Control Center AI refresh file.");
      }
      showMasterRefreshPreview(file.name, payload);
    } catch (err) {
      alert("That file is not a valid Control Center AI refresh file. Nothing was changed.");
      const input = document.getElementById("masterRefreshInput");
      if (input) input.value = "";
    }
  };

  reader.readAsText(file);
}

function renderDashboard() {
  renderSummary();
  renderRefreshStatus();

  const list = document.getElementById("projectList");
  const projects = [...state.projects]
    .filter(p => currentFilter === "All" || p.status === currentFilter)
    .sort((a, b) => statusOrder(a.status) - statusOrder(b.status) || a.name.localeCompare(b.name));

  document.getElementById("projectCount").textContent =
    `${projects.length} project${projects.length === 1 ? "" : "s"}`;

  if (!projects.length) {
    list.innerHTML = `<div class="empty-state">No projects in this view.</div>`;
    return;
  }

  list.innerHTML = projects.map(project => {
    const blocker = hasMeaningfulBlocker(project.blockers);
    const syncInfo = getProjectSyncState(project.id);
    const refreshClass = syncInfo?.state === "changed" ? "refresh-changed" : syncInfo?.state === "stale" ? "refresh-stale" : "";
    const refreshBadge = syncInfo?.state === "changed"
      ? `<span class="card-refresh-badge fresh">NEW</span>`
      : syncInfo?.state === "stale"
        ? `<span class="card-refresh-badge stale">STALE</span>`
        : "";

    return `
      <article class="project-card ${refreshClass}" data-id="${esc(project.id)}" data-type="${esc(project.type || "Project")}" tabindex="0" role="button" aria-label="Open ${esc(project.name)}">
        <div class="card-top">
          <div class="project-identity">
            <div class="project-monogram">${esc(projectMonogram(project))}</div>
            <div>
              <div class="project-name">${esc(project.name)}</div>
              <div class="project-subtitle">${esc(projectSubtitle(project))}</div>
            </div>
          </div>
          <div class="card-status-stack">
            ${refreshBadge}
            <span class="badge ${esc(project.status)}">${esc(project.status)}</span>
          </div>
        </div>

        <div class="project-summary">${esc(excerpt(project.objective, 165))}</div>

        <div class="card-divider"></div>

        <div class="meta-label">Next</div>
        <div class="next-action">${esc(excerpt(project.nextAction || "None", 175))}</div>

        <div class="card-footer">
          ${
            blocker
              ? `<div class="blocker-chip"><span class="blocker-dot"></span><span>Blocker</span></div>`
              : `<div class="no-blocker">No active blocker</div>`
          }
          <div class="updated">Updated ${esc(project.updated || "—")}</div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".project-card").forEach(card => {
    const open = () => openProject(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function openProject(id) {
  currentProjectId = id;
  document.getElementById("dashboardView").hidden = true;
  document.getElementById("detailView").hidden = false;
  document.getElementById("overviewNavBtn").classList.remove("active");
  document.getElementById("projectsNavBtn").classList.add("active");
  renderDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeProject() {
  currentProjectId = null;
  document.getElementById("detailView").hidden = true;
  document.getElementById("dashboardView").hidden = false;
  document.getElementById("editPanel").hidden = true;
  document.getElementById("projectsNavBtn").classList.remove("active");
  document.getElementById("overviewNavBtn").classList.add("active");
  renderDashboard();
}

function renderDetail() {
  const p = state.projects.find(x => x.id === currentProjectId);
  if (!p) return closeProject();

  document.getElementById("detailType").textContent = `${p.type || ""} • ${p.status}`;
  document.getElementById("detailName").textContent = p.name;
  document.getElementById("detailContent").innerHTML = `
    ${card("Objective", p.objective)}
    ${card("Next Action", p.nextAction)}
    ${card("Blockers", p.blockers)}
    ${card("Working", p.working)}
    ${card("Not Working", p.notWorking)}
    ${card("Recently Completed", p.completed, true)}
    ${card("Backlog", p.backlog, true)}
    ${card("Last Updated", p.updated || "—")}
  `;
}

function card(title, body, full = false) {
  return `<div class="info-card ${full ? "full" : ""}">
    <h3>${esc(title)}</h3>
    <p>${esc(body || "—")}</p>
  </div>`;
}

function showEditor(newProject = false) {
  let p;
  if (newProject) {
    p = {
      id: "project-" + Date.now(),
      name: "",
      type: "Project",
      status: "Active",
      objective: "",
      nextAction: "",
      blockers: "",
      working: "",
      notWorking: "",
      completed: "",
      backlog: "",
      updated: todayISO()
    };
  } else {
    p = clone(state.projects.find(x => x.id === currentProjectId));
  }

  const panel = document.getElementById("editPanel");
  panel.hidden = false;
  panel.dataset.newProject = newProject ? "true" : "false";
  panel.innerHTML = `
    <div class="form-grid">
      ${field("Name", "name", p.name)}
      ${selectField("Status", "status", p.status, ["Active", "Waiting", "Paused", "Done"])}
      ${selectField("Type", "type", p.type, ["Business", "Personal", "Project", "Client"])}
      ${field("Objective", "objective", p.objective, true, true)}
      ${field("Next Action", "nextAction", p.nextAction, true, true)}
      ${field("Blockers", "blockers", p.blockers, true, true)}
      ${field("Working", "working", p.working, true, true)}
      ${field("Not Working", "notWorking", p.notWorking, true, true)}
      ${field("Recently Completed", "completed", p.completed, true, true)}
      ${field("Backlog", "backlog", p.backlog, true, true)}
    </div>
    <div class="edit-actions">
      <div>${newProject ? "" : '<button id="deleteProjectBtn" class="danger">Delete Project</button>'}</div>
      <div class="edit-actions-right">
        <button id="cancelEditBtn" class="secondary">Cancel</button>
        <button id="saveEditBtn" class="primary">Save</button>
      </div>
    </div>
  `;

  document.getElementById("cancelEditBtn").onclick = () => {
    panel.hidden = true;
    if (newProject) closeProject();
  };

  document.getElementById("saveEditBtn").onclick = () => saveEditor(p.id, newProject);

  const del = document.getElementById("deleteProjectBtn");
  if (del) del.onclick = deleteCurrentProject;

  if (newProject) {
    currentProjectId = p.id;
    document.getElementById("dashboardView").hidden = true;
    document.getElementById("detailView").hidden = false;
    document.getElementById("detailType").textContent = "New project";
    document.getElementById("detailName").textContent = "Add Project";
    document.getElementById("detailContent").innerHTML = "";
  }
}

function field(label, key, value, full = false, textarea = false) {
  return `<div class="field ${full ? "full" : ""}">
    <label for="edit-${key}">${esc(label)}</label>
    ${textarea
      ? `<textarea id="edit-${key}">${esc(value || "")}</textarea>`
      : `<input id="edit-${key}" value="${esc(value || "")}" />`}
  </div>`;
}

function selectField(label, key, value, options) {
  return `<div class="field">
    <label for="edit-${key}">${esc(label)}</label>
    <select id="edit-${key}">
      ${options.map(o => `<option value="${esc(o)}" ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}
    </select>
  </div>`;
}

function saveEditor(id, isNew) {
  const values = {};
  ["name","status","type","objective","nextAction","blockers","working","notWorking","completed","backlog"]
    .forEach(key => values[key] = document.getElementById("edit-" + key).value.trim());

  if (!values.name) {
    alert("Project name is required.");
    return;
  }

  values.id = id;
  values.updated = todayISO();

  if (isNew) state.projects.push(values);
  else {
    const idx = state.projects.findIndex(p => p.id === id);
    state.projects[idx] = values;
  }

  saveState();
  currentProjectId = id;
  document.getElementById("editPanel").hidden = true;
  renderDetail();
}

function deleteCurrentProject() {
  const p = state.projects.find(x => x.id === currentProjectId);
  if (!p) return;
  if (!confirm(`Delete "${p.name}"? This cannot be undone unless you have a JSON backup.`)) return;
  state.projects = state.projects.filter(x => x.id !== currentProjectId);
  saveState();
  closeProject();
}


const MD_FIELD_LABELS = {
  status: "Status",
  objective: "Objective",
  nextAction: "Next Action",
  blockers: "Blockers",
  working: "Working",
  notWorking: "Not Working",
  completed: "Recently Completed",
  backlog: "Backlog"
};

function normalizeHeading(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^\d+\s+/, "")
    .trim();
}

function headingToField(heading) {
  const h = normalizeHeading(heading);

  if (["objective", "current objective", "current direction"].includes(h)) return "objective";

  if (
    ["next action", "immediate priority", "next operating instruction", "next milestone", "next tinyfish milestone"].includes(h) ||
    h.endsWith(" next milestone")
  ) return "nextAction";

  if (
    h === "blockers" ||
    h.startsWith("current issue") ||
    h === "reason paused" ||
    h === "current blocker"
  ) return "blockers";

  if (
    ["working", "current state", "current status", "current work state snapshot"].includes(h)
  ) return "working";

  if (
    h === "not working" ||
    h.startsWith("not working not yet verified") ||
    h === "not yet verified"
  ) return "notWorking";

  if (["recently completed", "completed", "completed work"].includes(h)) return "completed";

  if (
    ["backlog", "deferred work", "next project catalog candidate"].includes(h)
  ) return "backlog";

  if (h === "status") return "status";

  return null;
}

function cleanMarkdownValue(value) {
  return String(value || "")
    .replace(/\\\s*$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeImportedStatus(value) {
  const v = normalizeHeading(value);
  if (!v) return null;
  if (/\b(active|live|operating|in progress)\b/.test(v)) return "Active";
  if (/\b(waiting|blocked|pending|on hold)\b/.test(v)) return "Waiting";
  if (/\b(paused|parked|inactive)\b/.test(v)) return "Paused";
  if (/\b(done|complete|completed|closed|finished)\b/.test(v)) return "Done";
  return null;
}


function normalizeForComparison(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function valuesDiffer(currentValue, incomingValue) {
  return normalizeForComparison(currentValue) !== normalizeForComparison(incomingValue);
}

function parseProjectUpdateMarkdown(markdown) {
  const text = String(markdown || "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(/^#{1,4}\s+(.+?)\s*$/);
    if (match) {
      if (current) sections.push(current);
      current = { heading: match[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  const changes = {};
  const recognizedHeadings = [];

  for (const section of sections) {
    const field = headingToField(section.heading);
    if (!field || Object.prototype.hasOwnProperty.call(changes, field)) continue;
    const value = cleanMarkdownValue(section.lines.join("\n"));
    if (!value) continue;
    changes[field] = field === "status" ? normalizeImportedStatus(value) : value;
    if (changes[field]) recognizedHeadings.push(section.heading);
  }

  // Also accept common bold metadata near the top, e.g. **Status:** ACTIVE --- ...
  if (!changes.status) {
    const statusMatch = text.match(/^\s*\*\*Status:\*\*\s*(.+)$/mi) || text.match(/^\s*Status:\s*(.+)$/mi);
    if (statusMatch) {
      const status = normalizeImportedStatus(statusMatch[1]);
      if (status) changes.status = status;
    }
  }

  // These aliases are useful for existing Control Center update files that use a broader heading.
  if (!changes.working) {
    const currentStatus = sections.find(s => normalizeHeading(s.heading) === "current status");
    if (currentStatus) {
      const value = cleanMarkdownValue(currentStatus.lines.join("\n"));
      if (value) changes.working = value;
    }
  }

  return {
    changes,
    recognizedCount: Object.keys(changes).length,
    recognizedHeadings
  };
}

let pendingMdUpdate = null;

function showMdImportPreview(fileName, parsed) {
  const panel = document.getElementById("mdImportPanel");
  const project = state.projects.find(p => p.id === currentProjectId);
  if (!project) return;

  pendingMdUpdate = parsed.changes;
  panel.hidden = false;

  const keys = ["status", "objective", "nextAction", "blockers", "working", "notWorking", "completed", "backlog"]
    .filter(key => Object.prototype.hasOwnProperty.call(parsed.changes, key));

  if (!keys.length) {
    panel.innerHTML = `
      <div class="md-import-head">
        <div>
          <div class="eyebrow">MD UPDATE</div>
          <h3 class="md-import-title">Nothing recognized</h3>
          <p class="md-import-note">${esc(fileName)} does not contain headings I can safely map to this project.</p>
        </div>
      </div>
      <div class="md-import-empty">
        Nothing has been changed. Future update files work best with headings such as Objective, Next Action, Blockers, Working, Not Working, Recently Completed, Backlog, and Status.
      </div>
      <div class="md-import-actions">
        <button id="cancelMdImportBtn" class="button ghost" type="button">Close</button>
      </div>
    `;
    document.getElementById("cancelMdImportBtn").onclick = cancelMdImport;
    return;
  }

  const diff = keys.map(key => ({
    key,
    incoming: parsed.changes[key],
    current: project[key] || "",
    changed: valuesDiffer(project[key] || "", parsed.changes[key])
  }));

  const changedItems = diff.filter(item => item.changed);
  const unchangedItems = diff.filter(item => !item.changed);

  pendingMdUpdate = Object.fromEntries(changedItems.map(item => [item.key, item.incoming]));

  panel.innerHTML = `
    <div class="md-import-head">
      <div>
        <div class="eyebrow">MD UPDATE PREVIEW</div>
        <h3 class="md-import-title">What actually changed?</h3>
        <p class="md-import-note">${esc(fileName)} • ${keys.length} field${keys.length === 1 ? "" : "s"} recognized.</p>
      </div>
      <div class="md-diff-totals">
        <span class="md-diff-count fresh">${changedItems.length} changed</span>
        <span class="md-diff-count stale">${unchangedItems.length} unchanged</span>
      </div>
    </div>

    <div class="md-diff-legend">
      <span class="md-legend-item fresh"><span class="md-legend-dot"></span>Green = new / changed</span>
      <span class="md-legend-item stale"><span class="md-legend-dot"></span>Brown = stale / no change</span>
    </div>

    <div class="md-preview-grid">
      ${diff.map(item => {
        const full = ["objective","nextAction","blockers","working","notWorking","completed","backlog"].includes(item.key);
        return `
          <div class="md-preview-card ${item.changed ? "changed" : "unchanged"} ${full ? "full" : ""}">
            <div class="md-preview-topline">
              <div class="md-preview-label">${esc(MD_FIELD_LABELS[item.key])}</div>
              <div class="md-change-state ${item.changed ? "fresh" : "stale"}">${item.changed ? "CHANGED" : "UNCHANGED"}</div>
            </div>
            <div class="md-preview-new">${esc(item.incoming)}</div>
            <div class="md-preview-old">Current: ${esc(excerpt(item.current || "—", 220))}</div>
          </div>
        `;
      }).join("")}
    </div>

    <div class="md-import-summary">
      ${changedItems.length
        ? `Applying this file will update ${changedItems.length} field${changedItems.length === 1 ? "" : "s"}. Unchanged fields will not be rewritten.`
        : `Everything recognized in this file already matches the Control Center. There is nothing new to apply.`}
    </div>

    <div class="md-import-actions">
      <button id="cancelMdImportBtn" class="button ghost" type="button">${changedItems.length ? "Cancel" : "Close"}</button>
      ${changedItems.length
        ? `<button id="applyMdImportBtn" class="button primary" type="button">Apply ${changedItems.length} Change${changedItems.length === 1 ? "" : "s"}</button>`
        : ""}
    </div>
  `;

  document.getElementById("cancelMdImportBtn").onclick = cancelMdImport;
  const applyButton = document.getElementById("applyMdImportBtn");
  if (applyButton) applyButton.onclick = () => applyPendingMdUpdate({
    fileName,
    changedKeys: changedItems.map(item => item.key),
    unchangedKeys: unchangedItems.map(item => item.key)
  });

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelMdImport() {
  pendingMdUpdate = null;
  const panel = document.getElementById("mdImportPanel");
  panel.hidden = true;
  panel.innerHTML = "";
}

function applyPendingMdUpdate(resultMeta = null) {
  if (!pendingMdUpdate || !currentProjectId) return;
  const idx = state.projects.findIndex(p => p.id === currentProjectId);
  if (idx < 0) return;

  const next = { ...state.projects[idx] };
  const changedKeys = [];

  for (const [key, value] of Object.entries(pendingMdUpdate)) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== "" &&
      valuesDiffer(next[key] || "", value)
    ) {
      next[key] = value;
      changedKeys.push(key);
    }
  }

  if (!changedKeys.length) {
    pendingMdUpdate = null;
    return;
  }

  next.updated = todayISO();
  state.projects[idx] = next;

  if (!saveState()) return;

  pendingMdUpdate = null;
  renderDetail();

  const panel = document.getElementById("mdImportPanel");
  panel.hidden = false;

  const staleKeys = resultMeta?.unchangedKeys || [];
  panel.innerHTML = `
    <div class="md-import-result">
      <div>
        <div class="eyebrow">UPDATE APPLIED</div>
        <h3 class="md-import-title">${changedKeys.length} field${changedKeys.length === 1 ? "" : "s"} updated</h3>
        <p class="md-import-note">${esc(resultMeta?.fileName || "Markdown update")} has been applied to ${esc(state.projects[idx].name)}.</p>
      </div>
      <div class="md-diff-totals">
        <span class="md-diff-count fresh">${changedKeys.length} new</span>
        <span class="md-diff-count stale">${staleKeys.length} stale</span>
      </div>
    </div>
    <div class="md-applied-fields">
      ${changedKeys.map(key => `<span class="md-field-chip fresh">${esc(MD_FIELD_LABELS[key])}</span>`).join("")}
      ${staleKeys.map(key => `<span class="md-field-chip stale">${esc(MD_FIELD_LABELS[key])}</span>`).join("")}
    </div>
    <div class="md-import-actions">
      <button id="closeMdResultBtn" class="button ghost" type="button">Close</button>
    </div>
  `;

  document.getElementById("closeMdResultBtn").onclick = cancelMdImport;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function importProjectMarkdown(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = parseProjectUpdateMarkdown(reader.result);
      showMdImportPreview(file.name, parsed);
    } catch (err) {
      alert("That Markdown file could not be read. Nothing was changed.");
    }
  };
  reader.onerror = () => alert("That Markdown file could not be read. Nothing was changed.");
  reader.readAsText(file);
}

function projectMarkdown(p) {
  return `# ${p.name}
Updated: ${p.updated || "Unknown"}

Status: ${p.status}
Type: ${p.type || "Project"}

## Objective
${p.objective || "—"}

## Next Action
${p.nextAction || "—"}

## Blockers
${p.blockers || "—"}

## Working
${p.working || "—"}

## Not Working
${p.notWorking || "—"}

## Recently Completed
${p.completed || "—"}

## Backlog
${p.backlog || "—"}
`;
}

function allProjectsMarkdown() {
  const ordered = [...state.projects].sort((a,b) => statusOrder(a.status)-statusOrder(b.status) || a.name.localeCompare(b.name));
  return `# KYLE CONTROL CENTER
Updated: ${todayISO()}

${ordered.map(p => `## ${p.name}
Status: ${p.status}
Type: ${p.type || "Project"}
Next action: ${p.nextAction || "—"}
Blockers: ${p.blockers || "—"}
Last updated: ${p.updated || "—"}
`).join("\n")}
`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard.");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    alert("Copied to clipboard.");
  }
}

function downloadText(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportBackup() {
  state.lastExport = new Date().toISOString();
  saveState();
  downloadText(
    `control-center-backup-${todayISO()}.json`,
    JSON.stringify(state, null, 2),
    "application/json"
  );
  updateBackupNotice();
}

function importBackup(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!validateState(parsed)) throw new Error("Invalid backup");

      const okay = confirm(
        "Import this backup? This will replace the current Control Center data in this browser."
      );
      if (!okay) return;

      state = parsed;
      if (!saveState()) return;

      currentProjectId = null;
      document.getElementById("detailView").hidden = true;
      document.getElementById("dashboardView").hidden = false;
      renderDashboard();
      alert("Backup imported.");
    } catch {
      alert("That file is not a valid Control Center backup.");
    }
  };

  reader.readAsText(file);
}

function updateBackupNotice() {
  const el = document.getElementById("backupNotice");
  if (!state.lastExport) {
    el.hidden = false;
    el.textContent = "No JSON backup has been exported yet. Export one after you make meaningful changes.";
    return;
  }

  const ageDays = Math.floor((Date.now() - new Date(state.lastExport).getTime()) / 86400000);
  if (ageDays >= 7) {
    el.hidden = false;
    el.textContent = `Your last JSON backup was ${ageDays} days ago. Export a fresh backup.`;
  } else {
    el.hidden = true;
  }
}

document.getElementById("backBtn").onclick = closeProject;
document.getElementById("editBtn").onclick = () => showEditor(false);
document.getElementById("addProjectBtn").onclick = () => showEditor(true);

document.getElementById("copyProjectMdBtn").onclick = () => {
  const p = state.projects.find(x => x.id === currentProjectId);
  if (p) copyText(projectMarkdown(p));
};

document.getElementById("downloadProjectMdBtn").onclick = () => {
  const p = state.projects.find(x => x.id === currentProjectId);
  if (p) downloadText(`${p.id}-CURRENT_STATE.md`, projectMarkdown(p), "text/markdown");
};



document.getElementById("exportAllMdBtn").onclick = () => copyText(allProjectsMarkdown());
document.getElementById("backupBtn").onclick = exportBackup;
document.getElementById("masterRefreshInput").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (file) importMasterRefresh(file);
});

document.getElementById("importInput").addEventListener("change", e => {
  if (e.target.files?.[0]) importBackup(e.target.files[0]);
  e.target.value = "";
});

document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

document.querySelectorAll(".summary-card").forEach(card => {
  card.addEventListener("click", () => {
    const filter = card.dataset.filterSummary;
    setFilter(filter);
    document.getElementById("projectsSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.getElementById("overviewNavBtn").addEventListener("click", () => {
  closeProject();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("projectsNavBtn").addEventListener("click", () => {
  if (currentProjectId) closeProject();
  document.getElementById("projectsSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("backupNavBtn").addEventListener("click", exportBackup);

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");

mobileMenuBtn.addEventListener("click", () => {
  const open = mobileMenu.hidden;
  mobileMenu.hidden = !open;
  mobileMenuBtn.setAttribute("aria-expanded", String(open));
});

document.querySelectorAll(".mobile-nav").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    if (action === "backup") {
      exportBackup();
    } else if (action === "projects") {
      if (currentProjectId) closeProject();
      document.getElementById("projectsSection").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      closeProject();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    mobileMenu.hidden = true;
    mobileMenuBtn.setAttribute("aria-expanded", "false");
  });
});

updateBackupNotice();
renderDashboard();
