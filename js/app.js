// ==============================================
// Truck Center Hilfe – App-Logik
// ==============================================

let data = [];
let currentCategory = null;
let currentTopic = null;

const appEl = document.getElementById("app");
const searchInputEl = document.getElementById("searchInput");
const searchResultsEl = document.getElementById("searchResults");

const STORAGE_KEY = "truckcenter-hilfe-steps-done";
let doneState = {};

// Icons pro Kategorie
const categoryIconMap = {
  "handbuch-einfuehrung": "📘",
  "wartung-pflege": "🔧",
  "problem-loesung-reparaturen": "🧰",
  "reise-unterwegs": "🚐",
  "saisonales": "🌦️",
  "service-kontakt": "📞",
  "schnelle-hilfe": "⚡"
};

// ----------------------------------------------
// Initialisierung
// ----------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  loadDoneState();
  loadData();
});

// ----------------------------------------------
// Daten laden
// ----------------------------------------------
function loadData() {
  fetch("data/hilfecenter.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) {
        throw new Error("Fehler beim Laden der Daten");
      }
      return res.json();
    })
    .then(function (json) {
      data = json || [];
      renderCategories();
      setupSearch();
    })
    .catch(function (err) {
      console.error(err);
      appEl.innerHTML = "<p>Die Inhalte konnten nicht geladen werden. Bitte später erneut versuchen.</p>";
    });
}

// ----------------------------------------------
// LocalStorage für erledigte Schritte
// ----------------------------------------------
function loadDoneState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      doneState = JSON.parse(raw) || {};
    }
  } catch (e) {
    doneState = {};
  }
}

function saveDoneState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doneState));
  } catch (e) {
    // ignorieren, wenn z. B. Speicher voll
  }
}

function stepKey(categorySlug, topicSlug, index) {
  return categorySlug + "__" + topicSlug + "__" + index;
}

// ----------------------------------------------
// Hilfsfunktionen zum Finden von Datenobjekten
// ----------------------------------------------
function findCategory(slug) {
  return data.find(function (c) { return c.slug === slug; });
}

function findTopic(category, topicSlug) {
  if (!category) return null;
  return (category.topics || []).find(function (t) { return t.slug === topicSlug; });
}

// ----------------------------------------------
// Startansicht: Kategorien anzeigen
// ----------------------------------------------
function renderCategories() {
  currentCategory = null;
  currentTopic = null;

  const html =
    '<h2 class="section-title">Bereiche</h2>' +
    '<div class="grid">' +
    data.map(function (cat) {
      const icon = categoryIconMap[cat.slug] || "📚";
      const subtitle = cat.subtitle || (cat.topics ? cat.topics.length + " Themen" : "");
      const cta = cat.cta || "Anzeigen";

      return (
        '<article class="card js-category" data-slug="' + cat.slug + '">' +
        '<div class="card-header">' +
        '<div class="card-icon">' + icon + "</div>" +
        "<div>" +
        "<h3>" + escapeHtml(cat.category) + "</h3>" +
        "<p>" + escapeHtml(subtitle) + "</p>" +
        "</div>" +
        "</div>" +
        '<div class="card-cta">' + escapeHtml(cta) + "</div>" +
        "</article>"
      );
    }).join("") +
    "</div>";

  appEl.innerHTML = html;

  Array.prototype.forEach.call(
    document.querySelectorAll(".js-category"),
    function (el) {
      el.addEventListener("click", function () {
        var slug = el.getAttribute("data-slug");
        openCategory(slug);
      });
    }
  );
}

// ----------------------------------------------
// Kategorie öffnen → Topics anzeigen
// ----------------------------------------------
function openCategory(slug) {
  const category = findCategory(slug);
  if (!category) return;

  currentCategory = category;
  currentTopic = null;

  const topics = category.topics || [];

  const icon = categoryIconMap[category.slug] || "📚";

  const html =
    '<button class="back-btn js-back-home" type="button">‹ Zur Übersicht</button>' +
    '<div class="topic-header">' +
    "<h2>" + escapeHtml(category.category) + "</h2>" +
    "</div>" +
    (category.subtitle
      ? '<p class="topic-intro">' + escapeHtml(category.subtitle) + "</p>"
      : "") +
    '<div class="grid">' +
    topics.map(function (topic) {
      const subtitle = topic.intro ? shortenText(topic.intro, 110) : "Details öffnen";
      return (
        '<article class="card js-topic" data-cat="' + category.slug + '" data-slug="' + topic.slug + '">' +
        '<div class="card-header">' +
        '<div class="card-icon">' + icon + "</div>" +
        "<div>" +
        "<h3>" + escapeHtml(topic.title) + "</h3>" +
        "<p>" + escapeHtml(subtitle) + "</p>" +
        "</div>" +
        "</div>" +
        '<div class="card-cta">Details anzeigen</div>' +
        "</article>"
      );
    }).join("") +
    "</div>";

  appEl.innerHTML = html;

  const backBtn = document.querySelector(".js-back-home");
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      renderCategories();
    });
  }

  Array.prototype.forEach.call(
    document.querySelectorAll(".js-topic"),
    function (el) {
      el.addEventListener("click", function () {
        const tSlug = el.getAttribute("data-slug");
        openTopic(category.slug, tSlug);
      });
    }
  );
}

// ----------------------------------------------
// Topic öffnen → Steps anzeigen
// ----------------------------------------------
function openTopic(categorySlug, topicSlug) {
  const category = findCategory(categorySlug);
  if (!category) return;
  const topic = findTopic(category, topicSlug);
  if (!topic) return;

  currentCategory = category;
  currentTopic = topic;

  const steps = topic.steps || [];

  const htmlParts = [];

  htmlParts.push(
    '<button class="back-btn js-back-category" type="button">‹ ' +
    escapeHtml(category.category) +
    "</button>"
  );

  htmlParts.push(
    '<div class="topic-header">' +
    "<h2>" + escapeHtml(topic.title) + "</h2>" +
    "</div>"
  );

  if (topic.intro) {
    htmlParts.push('<p class="topic-intro">' + escapeHtml(topic.intro) + "</p>");
  }

  if (!steps.length) {
    htmlParts.push("<p>Für dieses Thema sind noch keine Schritte hinterlegt.</p>");
  } else {
    htmlParts.push('<ul class="steps">');

    steps.forEach(function (step, index) {
      const key = stepKey(category.slug, topic.slug, index);
      const isDone = !!doneState[key];
      const isCritical = !!step.isCritical;
      const actionType = step.actionType || "checklist";

      htmlParts.push(
        '<li class="step" id="step-' +
        category.slug +
        "-" +
        topic.slug +
        "-" +
        index +
        '">'
      );

      // Header
      htmlParts.push('<div class="step-header">');
      htmlParts.push('<div class="step-title">' + escapeHtml(step.title) + "</div>");

      htmlParts.push('<div class="step-badges">');
      htmlParts.push(
        '<span class="badge">' +
        (actionTypeLabel(actionType)) +
        "</span>"
      );
      if (isCritical) {
        htmlParts.push('<span class="badge badge-critical">Wichtig</span>');
      }
      htmlParts.push("</div>"); // step-badges
      htmlParts.push("</div>"); // step-header

      // Beschreibung
      if (step.description) {
        htmlParts.push(
          '<div class="step-body">' +
          escapeHtml(step.description) +
          "</div>"
        );
      }

      // Aktionen
      htmlParts.push('<div class="step-actions">');

      // checklist / diagnosis → „erledigt“-Button
      if (actionType === "checklist" || actionType === "diagnosis") {
        const label = isDone ? "Erledigt" : "Als erledigt markieren";
        const btnClass = isDone ? "btn btn-done btn-small" : "btn btn-primary btn-small";
        htmlParts.push(
          '<button class="' +
          btnClass +
          ' js-step-done" type="button" ' +
          'data-cat="' +
          category.slug +
          '" data-topic="' +
          topic.slug +
          '" data-index="' +
          index +
          '">' +
          escapeHtml(label) +
          "</button>"
        );
      }

      // contact → Telefon / E-Mail
      if (actionType === "contact" && step.contact) {
        const c = step.contact;
        if (c.phone) {
          htmlParts.push(
            '<a class="btn btn-outline btn-small" href="tel:' +
            encodeURIComponent(c.phone) +
            '">Anrufen</a>'
          );
        }
        if (c.email) {
          const mailHref = buildMailto(c.email, c.subject, c.presetMessage);
          htmlParts.push(
            '<a class="btn btn-primary btn-small" href="' +
            mailHref +
            '">E-Mail schreiben</a>'
          );
        }
      }

      // link → externer oder interner Link
      if (actionType === "link" && step.link && step.link.href) {
        htmlParts.push(
          '<a class="btn btn-outline btn-small" href="' +
          escapeHtml(step.link.href) +
          '" target="_blank" rel="noreferrer">' +
          escapeHtml(step.link.label || "Öffnen") +
          "</a>"
        );
      }

      htmlParts.push("</div>"); // step-actions
      htmlParts.push("</li>"); // step
    });

    htmlParts.push("</ul>");
  }

  appEl.innerHTML = htmlParts.join("");

  const backBtn = document.querySelector(".js-back-category");
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      openCategory(category.slug);
    });
  }

  // Event-Listener für "Erledigt"-Buttons
  Array.prototype.forEach.call(
    document.querySelectorAll(".js-step-done"),
    function (btn) {
      btn.addEventListener("click", onToggleStepDone);
    }
  );
}

// ----------------------------------------------
// Schritt als erledigt markieren / umschalten
// ----------------------------------------------
function onToggleStepDone(event) {
  const btn = event.currentTarget;
  const catSlug = btn.getAttribute("data-cat");
  const topicSlug = btn.getAttribute("data-topic");
  const index = parseInt(btn.getAttribute("data-index"), 10);

  const key = stepKey(catSlug, topicSlug, index);
  const isDone = !!doneState[key];

  if (isDone) {
    delete doneState[key];
  } else {
    doneState[key] = true;
  }
  saveDoneState();

  // Label & Farbe aktualisieren
  const nowDone = !!doneState[key];
  btn.textContent = nowDone ? "Erledigt" : "Als erledigt markieren";
  btn.className = nowDone ? "btn btn-done btn-small js-step-done" : "btn btn-primary btn-small js-step-done";
}

// ----------------------------------------------
// Suche einrichten
// ----------------------------------------------
function setupSearch() {
  if (!searchInputEl) return;

  searchInputEl.addEventListener("input", function () {
    const term = searchInputEl.value.trim().toLowerCase();
    if (!term) {
      hideSearchResults();
      return;
    }
    const results = searchAll(term);
    renderSearchResults(results);
  });

  // einfache Variante: bei Blur mit kleinem Delay schließen,
  // damit Klick auf Ergebnis noch funktioniert
  searchInputEl.addEventListener("blur", function () {
    setTimeout(hideSearchResults, 200);
  });
}

function searchAll(term) {
  const results = [];

  data.forEach(function (cat) {
    const catName = cat.category || "";
    const topics = cat.topics || [];

    // Treffer auf Kategorie-Ebene
    if (catName.toLowerCase().indexOf(term) !== -1) {
      results.push({
        type: "category",
        categorySlug: cat.slug,
        title: cat.category,
        subtitle: "Kategorie"
      });
    }

    topics.forEach(function (topic) {
      const tTitle = topic.title || "";
      const tIntro = topic.intro || "";
      const inTitle = tTitle.toLowerCase().indexOf(term) !== -1;
      const inIntro = tIntro.toLowerCase().indexOf(term) !== -1;

      if (inTitle || inIntro) {
        results.push({
          type: "topic",
          categorySlug: cat.slug,
          topicSlug: topic.slug,
          title: topic.title,
          subtitle: cat.category
        });
      }

      (topic.steps || []).forEach(function (step, index) {
        const sTitle = step.title || "";
        const sDesc = step.description || "";
        if (
          sTitle.toLowerCase().indexOf(term) !== -1 ||
          sDesc.toLowerCase().indexOf(term) !== -1
        ) {
          results.push({
            type: "step",
            categorySlug: cat.slug,
            topicSlug: topic.slug,
            stepIndex: index,
            title: step.title,
            subtitle: topic.title + " · " + cat.category
          });
        }
      });
    });
  });

  // etwas begrenzen
  return results.slice(0, 25);
}

function renderSearchResults(results) {
  if (!searchResultsEl) return;

  if (!results.length) {
    searchResultsEl.innerHTML = "<li>Keine Treffer</li>";
    searchResultsEl.style.display = "block";
    return;
  }

  const html = results.map(function (r, idx) {
    return (
      '<li class="js-search-result" data-index="' + idx + '">' +
      "<strong>" + escapeHtml(r.title) + "</strong>" +
      "<small>" + escapeHtml(r.subtitle || "") + "</small>" +
      "</li>"
    );
  }).join("");

  searchResultsEl.innerHTML = html;
  searchResultsEl.style.display = "block";

  const items = searchResultsEl.querySelectorAll(".js-search-result");
  Array.prototype.forEach.call(items, function (el) {
    el.addEventListener("mousedown", function (evt) {
      // mousedown statt click, damit blur von input uns nicht zuvor kommt
      evt.preventDefault();
      const idx = parseInt(el.getAttribute("data-index"), 10);
      const item = results[idx];
      handleSearchSelection(item);
    });
  });
}

function hideSearchResults() {
  if (!searchResultsEl) return;
  searchResultsEl.style.display = "none";
}

function handleSearchSelection(item) {
  if (!item) return;
  hideSearchResults();

  if (item.type === "category") {
    openCategory(item.categorySlug);
    return;
  }

  if (item.type === "topic") {
    openCategory(item.categorySlug);
    // kleines Delay, damit DOM aufgebaut ist
    setTimeout(function () {
      openTopic(item.categorySlug, item.topicSlug);
    }, 0);
    return;
  }

  if (item.type === "step") {
    openCategory(item.categorySlug);
    setTimeout(function () {
      openTopic(item.categorySlug, item.topicSlug);
      setTimeout(function () {
        const stepId =
          "step-" +
          item.categorySlug +
          "-" +
          item.topicSlug +
          "-" +
          item.stepIndex;
        const el = document.getElementById(stepId);
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    }, 0);
  }
}

// ----------------------------------------------
// Hilfsfunktionen
// ----------------------------------------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortenText(str, maxLen) {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

function actionTypeLabel(type) {
  switch (type) {
    case "diagnosis":
      return "Diagnose";
    case "contact":
      return "Kontakt";
    case "link":
      return "Link";
    case "checklist":
    default:
      return "Checkliste";
  }
}

function buildMailto(email, subject, body) {
  var params = [];
  if (subject) {
    params.push("subject=" + encodeURIComponent(subject));
  }
  if (body) {
    params.push("body=" + encodeURIComponent(body));
  }
  var paramStr = params.length ? "?" + params.join("&") : "";
  return "mailto:" + encodeURIComponent(email) + paramStr;
}
