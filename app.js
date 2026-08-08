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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resourceCard(resource) {
  const article = document.createElement("a");
  article.className = "resource-card";
  article.href = resource.url;
  article.target = "_blank";
  article.rel = "noreferrer";
  article.innerHTML = `
    <div class="resource-top">
      <span class="resource-id">${escapeHtml(resource.id)}</span>
      <span class="resource-time">${escapeHtml(resource.estimated_time)}</span>
    </div>
    <span class="resource-track">${escapeHtml(resource.track)}</span>
    <h3>${escapeHtml(resource.resource)}</h3>
    <span class="resource-provider">${escapeHtml(resource.provider_or_authors)}</span>
    <p class="resource-reason">${escapeHtml(resource.why_it_is_in_the_path)}</p>
    <div class="resource-footer">
      <span class="resource-format">${escapeHtml(resource.format)}</span>
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

const companyGrid = document.querySelector("#company-grid");
const companyCount = document.querySelector("#company-count");
const companyEmptyState = document.querySelector("#company-empty-state");
const companySearch = document.querySelector("#company-search");
const companyFilters = document.querySelectorAll(".company-filter");
let companies = [];
let activeCountry = "all";

function readableValue(value, fallback = "Not disclosed") {
  if (!value || ["UNKNOWN", "UNDISCLOSED", "NOT_DISCLOSED"].includes(value)) return fallback;
  return value;
}

function companyRegion(company) {
  return company.company_id.startsWith("US") ? "US" : "India";
}

function companyCard(company) {
  const article = document.createElement("article");
  const region = companyRegion(company);
  const valuationType = readableValue(company.valuation_type, "No valuation disclosed").replaceAll("_", " ").toLowerCase();
  article.className = "company-card";
  article.innerHTML = `
    <div class="company-card-top">
      <span class="company-country">${region === "US" ? "United States" : "India"}</span>
      <span class="company-confidence">${escapeHtml(company.confidence)} confidence</span>
    </div>
    <h3>${escapeHtml(company.company)}</h3>
    <span class="company-category">${escapeHtml(company.category)}</span>
    <p class="company-location">${escapeHtml(company.headquarters_or_origin)}</p>
    <p class="company-product">${escapeHtml(company.product)}</p>
    <p class="company-market"><strong>Markets:</strong> ${escapeHtml(company.markets_served)}</p>
    <div class="company-financials">
      <div>
        <span>Latest financing</span>
        <strong>${escapeHtml(readableValue(company.latest_disclosed_financing))}</strong>
        <small>${escapeHtml(readableValue(company.latest_financing_date, "Date not disclosed"))}</small>
      </div>
      <div>
        <span>Latest valuation</span>
        <strong>${escapeHtml(readableValue(company.latest_disclosed_valuation))}</strong>
        <small>${escapeHtml(valuationType)}</small>
      </div>
      <div>
        <span>Disclosed funding</span>
        <strong>${escapeHtml(readableValue(company.cumulative_disclosed_funding))}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>${escapeHtml(company.company_status.replaceAll("_", " ").toLowerCase())}</strong>
      </div>
    </div>
  `;

  const links = document.createElement("div");
  links.className = "company-links";
  [
    ["Product ↗", company.product_source],
    ["Financing ↗", company.funding_source],
    ["Context ↗", company.secondary_source],
  ].forEach(([label, url]) => {
    if (!url || !/^https?:\/\//.test(url)) return;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    links.append(link);
  });
  article.append(links);
  return article;
}

function renderCompanies() {
  const query = companySearch.value.trim().toLowerCase();
  const matches = companies.filter((company) => {
    const countryMatches = activeCountry === "all" || companyRegion(company) === activeCountry;
    const searchable = [
      company.company,
      company.category,
      company.product,
      company.markets_served,
      company.headquarters_or_origin,
      company.buyer_or_business_model,
    ].join(" ").toLowerCase();
    return countryMatches && searchable.includes(query);
  });

  companyGrid.replaceChildren(...matches.map(companyCard));
  companyCount.textContent = `${matches.length} of ${companies.length} companies`;
  companyEmptyState.hidden = matches.length !== 0;
}

companyFilters.forEach((filter) => {
  filter.addEventListener("click", () => {
    activeCountry = filter.dataset.country;
    companyFilters.forEach((item) => item.classList.toggle("active", item === filter));
    renderCompanies();
  });
});
companySearch.addEventListener("input", renderCompanies);

const localCompanyPaths = window.location.pathname.includes("/site/")
  ? ["../ecosystem/us-physical-ai-companies.csv", "../ecosystem/india-physical-ai-companies.csv"]
  : ["us-physical-ai-companies.csv", "india-physical-ai-companies.csv"];

Promise.all(localCompanyPaths.map((companyPath) => fetch(companyPath).then((response) => {
  if (!response.ok) throw new Error(`Company index returned ${response.status}`);
  return response.text();
})))
  .then((texts) => {
    companies = texts.flatMap(parseCsv);
    renderCompanies();
  })
  .catch(() => {
    companyCount.textContent = "Company index unavailable";
    companyEmptyState.hidden = false;
    companyEmptyState.querySelector("strong").textContent = "The company index could not be loaded";
    companyEmptyState.querySelector("p").textContent = "Open the repository version or try again shortly.";
  });
