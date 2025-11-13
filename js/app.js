let data = [];
let currentCategory = null;
let currentTopic = null;

const appEl = document.getElementById("app");
const searchInput = document.getElementById("searchInput");

// Jahr im Footer setzen
document.getElementById("year").textContent = new Date().getFullYear();

// LocalStorage-Helfer für „erledigt“-Status
function doneKey(topicSlug) {
  return `truckshop_hilfecenter_done_${topicSlug}`;
}

function loadDoneSteps(topicSlug) {
  try {
    const raw = localStorage.getItem(doneKey(topicSlug));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDoneSteps(topicSlug, arr) {
  try {
    localStorage.setItem(doneKey(topicSlug), JSON.stringify(arr));
  } catch {
    // ignorieren – z. B. wenn Storage deaktiviert ist
  }
}

// Daten laden
async function loadData() {
  try {
    const res = await fetch("data/hilfecenter.json");
    data = await res.json();
    renderCategories();
    setupSearch();
  } catch (e) {
    console.error(e);
    appEl.innerHTML = "<p>Fehler beim Laden der Inhalte. Bitte später erneut versuchen.</p>";
  }
}

// Suche einrichten
function setupSearch() {
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      // Nur auf Kategorien zurückfallen, wenn wir nicht mitten in einem Thema sind
      if (!currentCategory && !currentTopic) {
        renderCategories();
      }
      return;
    }
    renderSearchResults(term);
  });
}

// Kategorien anzeigen
function renderCategories() {
  currentCategory = null;
  currentTopic = null;

  const html = `
    <h2 class="section-title">Bereiche</h2>
    <div class="grid">
      ${data
        .map(
          (cat) => `
        <article class="card js-category" data-slug="${cat.slug}">
          <h3>${cat.category}</h3>
          <p>${cat.topics.length} Themen</p>
        </article>
      `
        )
        .join("")}
    </div>
  `;

  appEl.innerHTML = html;

  document.querySelectorAll(".js-category").forEach((el) => {
    el.addEventListener("click", () => {
      const slug = el.getAttribute("data-slug");
      openCategory(slug);
    });
  });
}

// Themen in einer Kategorie anzeigen
function openCategory(slug) {
  currentCategory = data.find((c) => c.slug === slug) || null;
  currentTopic = null;
  if (!currentCategory) return;

  const html = `
    <button class="back-btn js-back-root">← Zur Übersicht</button>
    <h2 class="section-title">${currentCategory.category}</h2>
    <div class="grid">
      ${currentCategory.topics
        .map(
          (topic) => `
        <article class="card js-topic" data-slug="${topic.slug}">
          <h3>${topic.title}</h3>
          <p>${topic.steps.length} Schritte</p>
        </article>
      `
        )
        .join("")}
    </div>
  `;

  appEl.innerHTML = html;

  document.querySelector(".js-back-root").addEventListener("click", () => {
    renderCategories();
  });

  document.querySelectorAll(".js-topic").forEach((el) => {
    el.addEventListener("click", () => {
      const topicSlug = el.getAttribute("data-slug");
      openTopic(topicSlug);
    });
  });
}

// Schritte eines Themas anzeigen
function openTopic(slug) {
  if (!currentCategory) return;
  currentTopic = currentCategory.topics.find((t) => t.slug === slug) || null;
  if (!currentTopic) return;

  const doneSteps = loadDoneSteps(currentTopic.slug);

  const html = `
    <button class="back-btn js-back-category">← ${currentCategory.category}</button>
    <div class="topic-header">
      <h2>${currentTopic.title}</h2>
      ${currentTopic.intro ? `<p class="topic-intro">${currentTopic.intro}</p>` : ""}
    </div>
    <ol class="steps">
      ${currentTopic.steps
        .map((step, index) => renderStep(step, index, doneSteps.includes(index)))
        .join("")}
    </ol>
  `;

  appEl.innerHTML = html;

  document.querySelector(".js-back-category").addEventListener("click", () => {
    openCategory(currentCategory.slug);
  });

  attachStepListeners();
}

// Einzelnen Schritt rendern
function renderStep(step, index, isDone) {
  const isChecklist = step.actionType === "checklist";
  const isContact = step.actionType === "contact";
  const isDiagnosis = step.actionType === "diagnosis";

  let actionsHtml = "";

  if (isChecklist) {
    actionsHtml += `
      <button class="btn btn-small btn-done js-toggle-step ${isDone ? "outline" : ""}" data-index="${index}">
        ${isDone ? "Erledigt" : "Als erledigt markieren"}
      </button>
    `;
  }

  if (isContact && step.contact) {
    const mailto = `mailto:${encodeURIComponent(step.contact.email)}?subject=${encodeURIComponent(
      step.contact.subject || ""
    )}&body=${encodeURIComponent(step.contact.presetMessage || "")}`;
    const tel = step.contact.phone
      ? `<a class="btn btn-small btn-outline" href="tel:${step.contact.phone}">Anrufen</a>`
      : "";
    actionsHtml += `
      ${tel}
      <a class="btn btn-small btn-primary" href="${mailto}">E-Mail schreiben</a>
    `;
  }

  if (isDiagnosis) {
    actionsHtml += `<span class="badge">Diagnoseschritt</span>`;
  }

  return `
    <li class="step" data-index="${index}">
      <div class="step-header">
        <div class="step-title">
          ${step.title}
          ${step.isCritical ? '<span class="badge badge-critical">Wichtig</span>' : ""}
        </div>
        ${step.estimatedTimeMinutes ? `<span class="badge">${step.estimatedTimeMinutes} Min</span>` : ""}
      </div>
      <div class="step-body">
        ${step.description || ""}
      </div>
      ${
        actionsHtml
          ? `<div class="step-actions">
          ${actionsHtml}
        </div>`
          : ""
      }
    </li>
  `;
}

// Klick-Logik für „erledigt“-Buttons
function attachStepListeners() {
  if (!currentTopic) return;
  const doneSteps = loadDoneSteps(currentTopic.slug);

  document.querySelectorAll(".js-toggle-step").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.getAttribute("data-index"), 10);
      const idx = doneSteps.indexOf(index);
      if (idx === -1) {
        doneSteps.push(index);
      } else {
        doneSteps.splice(idx, 1);
      }
      saveDoneSteps(currentTopic.slug, doneSteps);
      // Thema neu rendern, damit Status aktualisiert wird
      openTopic(currentTopic.slug);
    });
  });
}

// Suche über alle Inhalte
function renderSearchResults(term) {
  const results = [];

  data.forEach((cat) => {
    cat.topics.forEach((topic) => {
      topic.steps.forEach((step) => {
        const haystack =
          (cat.category || "") +
          " " +
          (topic.title || "") +
          " " +
          (step.title || "") +
          " " +
          (step.description || "");
        if (haystack.toLowerCase().includes(term)) {
          results.push({
            categorySlug: cat.slug,
            categoryTitle: cat.category,
            topicSlug: topic.slug,
            topicTitle: topic.title,
            stepTitle: step.title
          });
        }
      });
    });
  });

  if (!results.length) {
    appEl.innerHTML = `<p>Keine Treffer für <strong>${term}</strong>.</p>`;
    return;
  }

  const html = `
    <h2 class="section-title">Suchergebnisse</h2>
    <ul class="search-results">
      ${results
        .map(
          (r) => `
        <li class="js-search-result"
            data-category="${r.categorySlug}"
            data-topic="${r.topicSlug}">
          <strong>${r.stepTitle}</strong>
          <small>${r.categoryTitle} → ${r.topicTitle}</small>
        </li>
      `
        )
        .join("")}
    </ul>
  `;

  appEl.innerHTML = html;

  document.querySelectorAll(".js-search-result").forEach((el) => {
    el.addEventListener("click", () => {
      const catSlug = el.getAttribute("data-category");
      const topicSlug = el.getAttribute("data-topic");

      currentCategory = data.find((c) => c.slug === catSlug) || null;
      if (!currentCategory) return;
      currentTopic = currentCategory.topics.find((t) => t.slug === topicSlug) || null;
      if (!currentTopic) return;
      openTopic(topicSlug);
    });
  });
}

window.addEventListener("DOMContentLoaded", loadData);
