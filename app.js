const STORAGE_KEY = "kyle_control_center_v1";
let currentFilter = "All";
let currentProjectId = null;

const seedState = {
  version: 1,
  lastExport: null,
  projects: []
};

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

function renderDashboard() {
  renderSummary();

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

    return `
      <article class="project-card" data-id="${esc(project.id)}" data-type="${esc(project.type || "Project")}" tabindex="0" role="button" aria-label="Open ${esc(project.name)}">
        <div class="card-top">
          <div class="project-identity">
            <div class="project-monogram">${esc(projectMonogram(project))}</div>
            <div>
              <div class="project-name">${esc(project.name)}</div>
              <div class="project-subtitle">${esc(projectSubtitle(project))}</div>
            </div>
          </div>
          <span class="badge ${esc(project.status)}">${esc(project.status)}</span>
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
