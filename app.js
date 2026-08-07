const weekTabs = document.querySelectorAll(".week-tab");
const weekPanels = document.querySelectorAll(".week-panel");

weekTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const selectedWeek = tab.dataset.week;
    weekTabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    weekPanels.forEach((panel) => {
      const active = panel.id === `week-${selectedWeek}`;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  });
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] || ""])));
}

const grid = document.querySelector("#resource-grid");
const count = document.querySelector("#resource-count");
const emptyState = document.querySelector("#empty-state");
const search = document.querySelector("#resource-search");
const filters = document.querySelectorAll(".filter");
let resources = [];
let activeTrack = "all";

function resourceCard(resource) {
  const article = document.createElement("a");
  article.className = "resource-card";
  article.href = resource.url;
  article.target = "_blank";
  article.rel = "noreferrer";
  article.innerHTML = `
    <div class="resource-top">
      <span class="resource-id">${resource.id}</span>
      <span class="resource-time">${resource.estimated_time}</span>
    </div>
    <span class="resource-track">${resource.track}</span>
    <h3>${resource.resource}</h3>
    <span class="resource-provider">${resource.provider_or_authors}</span>
    <p class="resource-reason">${resource.why_it_is_in_the_path}</p>
    <div class="resource-footer">
      <span class="resource-format">${resource.format}</span>
      <span class="resource-arrow" aria-hidden="true">↗</span>
    </div>
  `;
  return article;
}

function renderResources() {
  const query = search.value.trim().toLowerCase();
  const matches = resources.filter((resource) => {
    const trackMatches = activeTrack === "all" || resource.track === activeTrack;
    const searchable = [resource.resource, resource.topic, resource.track, resource.provider_or_authors, resource.why_it_is_in_the_path]
      .join(" ")
      .toLowerCase();
    return trackMatches && searchable.includes(query);
  });

  grid.replaceChildren(...matches.map(resourceCard));
  count.textContent = `${matches.length} of ${resources.length} resources`;
  emptyState.hidden = matches.length !== 0;
}

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    activeTrack = filter.dataset.track;
    filters.forEach((item) => item.classList.toggle("active", item === filter));
    renderResources();
  });
});
search.addEventListener("input", renderResources);

const localResourcePath = window.location.pathname.includes("/site/")
  ? "../learning/technical-learning-index.csv"
  : "technical-learning-index.csv";

fetch(localResourcePath)
  .then((response) => {
    if (!response.ok) throw new Error(`Resource index returned ${response.status}`);
    return response.text();
  })
  .then((text) => {
    resources = parseCsv(text).filter((resource) => resource.status === "ACTIVE" || resource.status === "MAINTENANCE_MODE");
    renderResources();
  })
  .catch(() => {
    count.textContent = "Resource index unavailable";
    emptyState.hidden = false;
    emptyState.querySelector("strong").textContent = "The resource index could not be loaded";
    emptyState.querySelector("p").textContent = "Open the repository version or try again shortly.";
  });
