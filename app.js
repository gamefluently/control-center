
(() => {
  const state = window.CONTROL_CENTER_STATE;
  const list = document.getElementById("projectList");

  if (!state || !Array.isArray(state.projects)) {
    list.innerHTML = '<div class="empty-state">Control Center state file is missing or invalid.</div>';
    return;
  }

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  document.getElementById("projectCount").textContent = `${state.projects.length} projects`;
  document.getElementById("lastUpdated").textContent = state.updated ? `Updated ${state.updated}` : "";

  list.innerHTML = state.projects.map(project => {
    const image = String(project.image || "").trim();
    const isVisa = project.id === "visa";

    const detail = isVisa
      ? `<div class="visa-grid">
          <div><span class="meta-label">Next Date</span><strong>${esc(project.nextDate || "—")}</strong></div>
          <div><span class="meta-label">What</span><span>${esc(project.what || "—")}</span></div>
          <div><span class="meta-label">Where</span><span>${esc(project.where || "—")}</span></div>
          <div><span class="meta-label">Notes</span><span>${esc(project.notes || "—")}</span></div>
        </div>`
      : `<div class="board-block current-block">
          <div class="meta-label">Current</div>
          <div class="board-current">${esc(project.current || "—")}</div>
        </div>`;

    return `<article class="project-card board-card">
      <div class="board-card-image ${image ? "has-image" : "empty-image"}">
        ${image ? `<img src="${esc(image)}" alt="${esc(project.name)}" loading="lazy" />`
                : `<div class="image-placeholder"><span>Optional image</span></div>`}
      </div>
      <div class="board-card-top">
        <div class="project-name">${esc(project.name)}</div>
        <span class="badge ${esc(project.status)}">${esc(project.status)}</span>
      </div>
      <div class="board-card-body">
        ${detail}
        <div class="board-block next-block">
          <div class="meta-label">Next Action</div>
          <div class="board-next">${esc(project.nextAction || "—")}</div>
        </div>
      </div>
    </article>`;
  }).join("");
})();
