// Sande Kokuyo – Berichtsheft
// Published entries come from eintraege.js. Entries written in "Schreibmodus" live in this
// browser (localStorage) until they are exported and committed to GitHub.

(function () {
  "use strict";

  const KATEGORIEN = {
    mission:   { name: "Mission",   kanji: "任", farbe: "#e0ad4a" },
    akademie:  { name: "Akademie",  kanji: "学", farbe: "#5fc4d0" },
    training:  { name: "Training",  kanji: "修", farbe: "#5fb38a" },
    kampf:     { name: "Kampf",     kanji: "戦", farbe: "#e2453c" },
    dienst:    { name: "Dienst",    kanji: "務", farbe: "#6f9fe0" },
    alltag:    { name: "Alltag",    kanji: "日", farbe: "#c58be0" },
    sonstiges: { name: "Sonstiges", kanji: "他", farbe: "#a49786" }
  };
  const RAENGE = ["S", "A", "B", "C", "D"];
  const SPEICHER = { lokal: "sk-berichtsheft-lokal", thema: "sk-berichtsheft-thema", schreiben: "sk-berichtsheft-schreibmodus" };

  const profil = window.PROFIL || {};
  const veroeffentlicht = Array.isArray(window.EINTRAEGE) ? window.EINTRAEGE : [];
  let lokal = lesen(SPEICHER.lokal, []);
  const filter = { suche: "", kategorie: "alle", tag: "alle" };
  const $ = (sel) => document.querySelector(sel);

  // ---------- storage (may be blocked: private mode, cleared site data) ----------

  function lesen(schluessel, ersatz) {
    try {
      const wert = localStorage.getItem(schluessel);
      return wert === null ? ersatz : JSON.parse(wert);
    } catch (e) { return ersatz; }
  }
  function schreiben(schluessel, wert) {
    try { localStorage.setItem(schluessel, JSON.stringify(wert)); return true; } catch (e) { return false; }
  }

  // drop local drafts that have since been published
  const veroeffentlichteIds = new Set(veroeffentlicht.map((e) => e.id));
  if (lokal.some((e) => veroeffentlichteIds.has(e.id))) {
    lokal = lokal.filter((e) => !veroeffentlichteIds.has(e.id));
    schreiben(SPEICHER.lokal, lokal);
  }

  const alle = () => veroeffentlicht.concat(lokal.map((e) => Object.assign({}, e, { lokal: true })));

  // ---------- date helpers ----------

  function zuDatum(iso) { const [j, m, t] = iso.split("-").map(Number); return new Date(j, m - 1, t); }
  function isoVon(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function minuten(e) {
    if (!e.von || !e.bis) return 0;
    const teil = (z) => { const [h, m] = (z || "0:0").split(":").map(Number); return h * 60 + m; };
    let dauer = teil(e.bis) - teil(e.von);
    if (dauer < 0) dauer += 1440; // over midnight
    return dauer;
  }
  function dauerText(min) { const h = Math.floor(min / 60), m = min % 60; return h ? h + " h" + (m ? " " + m + " min" : "") : m + " min"; }
  const anzahlText = (n) => n + (n === 1 ? " Eintrag" : " Einträge");

  // ---------- small DOM helper ----------

  function el(tag, attrs, ...kinder) {
    const knoten = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") knoten.className = v;
      else if (k === "style") knoten.style.cssText = v;
      else if (k.startsWith("on")) knoten.addEventListener(k.slice(2), v);
      else knoten.setAttribute(k, v === true ? "" : v);
    }
    for (const kind of kinder.flat()) if (kind !== null && kind !== undefined && kind !== false) knoten.append(kind);
    return knoten;
  }

  // ---------- profile ----------

  function profilZeichnen() {
    const name = profil.name || "Sande Kokuyo";
    $("#profil-name").textContent = name;
    $("#fuss-name").textContent = name;
    const felder = [["Dorf", profil.dorf], ["Rang", profil.rang], ["Clan", profil.clan], ["Team", profil.team], ["Element", profil.element], ["Kekkei Genkai", profil.kekkeiGenkai], ["Sensei", profil.sensei]];
    const akte = $("#akte");
    akte.replaceChildren(...felder.map(([n, w]) => el("div", null, el("dt", null, n), el("dd", null, w || "–"))));
    if (profil.motto) akte.append(el("div", { class: "zitat" }, el("dt", null, "Leitspruch"), el("dd", null, "„" + profil.motto + "“")));

    const herkunft = profil.herkunft || [], ziele = profil.ziele || [];
    $("#geschichte").hidden = !herkunft.length && !ziele.length;
    $("#herkunft").replaceChildren(...herkunft.map((absatz) => el("p", null, absatz)));
    $("#herkunft-knopf").hidden = herkunft.length < 2;
    $("#herkunft-knopf").onclick = (ev) => {
      const zu = $("#herkunft").classList.toggle("gekuerzt");
      ev.currentTarget.textContent = zu ? "Ganze Geschichte lesen …" : "Weniger";
    };
    const ziffern = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    $("#ziele").replaceChildren(...ziele.map((z, i) => el("li", null,
      el("span", { class: "ziel-zahl", "aria-hidden": "true" }, ziffern[i] || String(i + 1)),
      el("div", null, el("b", null, z.titel), el("p", null, z.text)))));
  }

  // ---------- stats ----------

  function hochzaehlen(knoten, ziel) {
    const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (ruhig) { knoten.textContent = ziel; return; }
    const start = performance.now(), dauer = 1100;
    (function schritt(jetzt) {
      const p = Math.min(1, (jetzt - start) / dauer);
      knoten.textContent = Math.round(ziel * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(schritt);
    })(start);
  }

  function werteZeichnen(liste) {
    const zahlen = {
      eintraege: liste.length,
      tage: new Set(liste.map((e) => e.datum)).size,
      missionen: liste.filter((e) => e.kategorie === "mission").length
    };
    document.querySelectorAll("[data-zaehler]").forEach((k) => hochzaehlen(k, zahlen[k.dataset.zaehler]));
  }

  function raengeZeichnen(liste) {
    const missionen = liste.filter((e) => e.rang);
    const max = Math.max(1, ...RAENGE.map((r) => missionen.filter((e) => e.rang === r).length));
    const zeilen = RAENGE.map((r) => {
      const n = missionen.filter((e) => e.rang === r).length;
      const balken = el("span");
      requestAnimationFrame(() => requestAnimationFrame(() => { balken.style.width = (n / max * 100) + "%"; }));
      return el("div", { class: "rang-zeile" }, el("span", { class: "rang-siegel" }, r), el("div", { class: "rang-balken" }, balken), el("span", { class: "rang-zahl" }, String(n)));
    });
    $("#raenge").replaceChildren(...zeilen);
  }

  // ---------- timeline ----------

  function chipsZeichnen() {
    const chips = [["alle", "Alle"]].concat(Object.entries(KATEGORIEN).map(([k, v]) => [k, v.kanji + " " + v.name]));
    $("#filter-chips").replaceChildren(...chips.map(([wert, text]) => el("button", {
      class: "chip", type: "button", "aria-pressed": String(filter.kategorie === wert),
      onclick: () => { filter.kategorie = wert; chipsZeichnen(); zeitleisteZeichnen(); }
    }, text)));
  }

  // Every RP evening counts as one month in the story, so the site shows "Monat 1, 2 …" and no real dates.
  // Month picker: "Alle Monate" plus one button per RP evening; the choice is mirrored in the URL (#monat-2)
  function rpTage() { return [...new Set(alle().map((e) => e.datum))].sort(); }

  function tagWahlZeichnen() {
    const tage = rpTage();
    if (filter.tag !== "alle" && !tage.includes(filter.tag)) filter.tag = "alle";
    const knopf = (wert, oben, unten) => el("button", {
      class: "tag-knopf", type: "button", "aria-pressed": String(filter.tag === wert),
      onclick: () => {
        filter.tag = wert;
        const nr = tage.indexOf(wert) + 1;
        try { history.replaceState(null, "", wert === "alle" ? location.pathname + location.search : "#monat-" + nr); } catch (e) { /* file:// */ }
        tagWahlZeichnen(); zeitleisteZeichnen();
      }
    }, el("b", null, oben), el("small", null, unten));
    $("#tag-wahl").replaceChildren(
      knopf("alle", "Alle Monate", tage.length + (tage.length === 1 ? " Monat" : " Monate")),
      ...tage.map((d, i) => knopf(d, "Monat " + (i + 1), anzahlText(alle().filter((e) => e.datum === d).length))));
    // keep the chosen month visible in the horizontally scrolling bar (without moving the page)
    const leiste = $("#tag-wahl"), aktiv = leiste.querySelector('[aria-pressed="true"]');
    if (aktiv.offsetLeft + aktiv.offsetWidth > leiste.scrollLeft + leiste.clientWidth || aktiv.offsetLeft < leiste.scrollLeft)
      leiste.scrollLeft = aktiv.offsetLeft - 8;
  }

  function passt(e) {
    if (filter.tag !== "alle" && e.datum !== filter.tag) return false;
    if (filter.kategorie !== "alle" && e.kategorie !== filter.kategorie) return false;
    if (!filter.suche) return true;
    const heu = [e.titel, e.ort, e.text, (e.tags || []).join(" "), e.rang ? "rang " + e.rang : ""].join(" ").toLowerCase();
    return filter.suche.toLowerCase().split(/\s+/).every((w) => heu.includes(w));
  }

  function eintragKarte(e) {
    const kat = KATEGORIEN[e.kategorie] || KATEGORIEN.sonstiges;
    // "Weiterlesen" only appears when the text really overflows (see kuerzungPruefen)
    const text = el("p", { class: "eintrag-text" }, e.text);
    const mehr = el("button", {
      class: "mehr-knopf", type: "button", hidden: true,
      onclick: (ev) => {
        const zu = text.classList.toggle("gekuerzt");
        text.dataset.offen = String(!zu);
        ev.currentTarget.textContent = zu ? "Weiterlesen …" : "Weniger";
      }
    }, "Weiterlesen …");

    return el("article", { class: "eintrag verborgen" + (e.meilenstein ? " meilenstein" : ""), style: "--kat:" + kat.farbe },
      el("div", { class: "eintrag-kopf" },
        el("span", { class: "kat-kanji", title: kat.name, "aria-hidden": "true" }, kat.kanji),
        el("div", { class: "eintrag-titelblock" },
          el("h5", null, e.titel),
          el("div", { class: "eintrag-meta" },
            el("span", null, kat.name),
            e.von && e.bis ? el("span", null, e.von + "–" + e.bis + " · " + dauerText(minuten(e))) : null,
            e.ort ? el("span", null, "📍 " + e.ort) : null)),
        e.rang ? el("span", { class: "rang-stempel", title: "Rang " + e.rang + "-Mission" }, e.rang) : null),
      e.bild ? el("button", { class: "eintrag-bild", type: "button", "aria-label": "Bild vergrößern", onclick: () => bildZeigen(e.bild, e.bildText || e.titel) },
        el("img", { src: e.bild, alt: e.bildText || e.titel, loading: "lazy", decoding: "async" })) : null,
      text, mehr,
      el("div", { class: "eintrag-fuss" },
        (e.tags || []).map((t) => el("span", { class: "tag" }, "#" + t)),
        e.meilenstein ? el("span", { class: "etikett etikett-gold" }, "★ Meilenstein") : null,
        e.beispiel ? el("span", { class: "etikett" }, "Beispiel") : null,
        e.lokal ? el("span", { class: "etikett" }, "nur lokal") : null,
        e.lokal ? el("button", { class: "bearbeiten-knopf", type: "button", onclick: () => dialogOeffnen(e) }, "✎ bearbeiten") : null));
  }

  function bildZeigen(src, text) {
    const d = $("#bild-dialog");
    $("#bild-gross").src = src;
    $("#bild-gross").alt = text;
    $("#bild-unterschrift").textContent = text;
    d.showModal();
  }

  // ink painting above a day, only when one of its milestones brings one (field "tusche")
  function tuscheBild(tagesEintraege, nummer) {
    const m = tagesEintraege.find((e) => e.meilenstein && e.tusche);
    if (!m) return null;
    const text = m.tuscheText || m.titel;
    return el("figure", { class: "tusche verborgen" },
      el("button", { class: "tusche-bild", type: "button", "aria-label": "Tuschebild vergrößern: " + text, onclick: () => bildZeigen(m.tusche, text) },
        el("img", { src: m.tusche, alt: text, width: "1800", height: "900", loading: "lazy", decoding: "async" })),
      el("figcaption", null, el("span", { class: "tusche-marke", lang: "ja", "aria-hidden": "true" }, "墨"), "Monat " + nummer + " · " + text));
  }
  $("#bild-dialog").addEventListener("click", () => $("#bild-dialog").close());

  function kuerzungPruefen() {
    document.querySelectorAll(".eintrag-text").forEach((text) => {
      const knopf = text.nextElementSibling;
      if (text.dataset.offen === "true") return;
      text.classList.add("gekuerzt");
      const ueber = text.scrollHeight > text.clientHeight + 2;
      text.classList.toggle("gekuerzt", ueber);
      knopf.hidden = !ueber;
    });
  }
  // re-check when the column width changes (window resize, phone rotation)
  let kuerzTimer, letzteBreite = 0;
  new ResizeObserver(([t]) => {
    const breite = Math.round(t.contentRect.width);
    if (breite === letzteBreite) return;
    letzteBreite = breite;
    clearTimeout(kuerzTimer); kuerzTimer = setTimeout(kuerzungPruefen, 150);
  }).observe($("#zeitleiste"));
  if (document.fonts) document.fonts.ready.then(kuerzungPruefen);

  let beobachter = null;
  function zeitleisteZeichnen() {
    // months newest first, entries within a month in the order they happened
    const gesamt = alle();
    const rpTag = new Map([...new Set(gesamt.map((e) => e.datum))].sort().map((d, i) => [d, i + 1]));
    const liste = gesamt
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => passt(e))
      .sort((a, b) => b.e.datum.localeCompare(a.e.datum) || a.i - b.i)
      .map(({ e }) => e);
    const ziel = $("#zeitleiste");

    if (!liste.length) {
      ziel.replaceChildren(el("div", { class: "leer" }, el("b", null, "無"),
        alle().length ? "Nichts gefunden. Probier einen anderen Suchbegriff." : "Noch keine Berichte. Schalte unten den Schreibmodus ein und leg los."));
    } else {
      const monate = new Map();
      for (const e of liste) {
        if (!monate.has(e.datum)) monate.set(e.datum, []);
        monate.get(e.datum).push(e);
      }
      ziel.replaceChildren(...[...monate.entries()].map(([datum, liste]) => el("div", { class: "tag-block" },
        el("h4", { class: "tag-kopf" }, el("span", { class: "tag-nummer" }, "Monat " + rpTag.get(datum)), anzahlText(liste.length)),
        // the picture belongs to the month, so it stays even when a filter hides the milestone entry itself
        tuscheBild(gesamt.filter((e) => e.datum === datum), rpTag.get(datum)),
        el("div", { class: "eintraege" }, liste.map(eintragKarte)))));
    }

    kuerzungPruefen();

    // unfurl entries as they scroll into view
    if (beobachter) beobachter.disconnect();
    const karten = ziel.querySelectorAll(".eintrag, .tusche");
    if (!("IntersectionObserver" in window)) { karten.forEach((k) => k.classList.replace("verborgen", "sichtbar")); return; }
    beobachter = new IntersectionObserver((treffer) => {
      for (const t of treffer) if (t.isIntersecting) { t.target.classList.replace("verborgen", "sichtbar"); beobachter.unobserve(t.target); }
    }, { rootMargin: "0px 0px -40px 0px" });
    karten.forEach((k) => beobachter.observe(k));

    const anzahlLokal = lokal.length;
    const hinweis = $("#lokal-hinweis");
    hinweis.hidden = !anzahlLokal;
    hinweis.textContent = anzahlLokal
      ? anzahlLokal + (anzahlLokal === 1 ? " Eintrag ist" : " Einträge sind") + " nur in diesem Browser gespeichert. Mit „Für GitHub exportieren“ kommen sie ins öffentliche Berichtsheft."
      : "";
  }

  function allesZeichnen() {
    const liste = alle();
    werteZeichnen(liste);
    raengeZeichnen(liste);
    tagWahlZeichnen();
    zeitleisteZeichnen();
  }

  // ---------- write mode, dialog, export ----------

  const dialog = $("#eintrag-dialog"), form = $("#eintrag-form");
  let bearbeitet = null;

  $("#kategorie-auswahl").replaceChildren(...Object.entries(KATEGORIEN).map(([k, v]) => el("option", { value: k }, v.kanji + " " + v.name)));

  function dialogOeffnen(eintrag) {
    bearbeitet = eintrag || null;
    form.reset();
    $("#dialog-titel").textContent = eintrag ? "Eintrag bearbeiten" : "Neuer Eintrag";
    $("#loeschen-knopf").hidden = !eintrag;
    const jetzt = new Date();
    const werte = eintrag || { datum: isoVon(jetzt), kategorie: "alltag" };
    for (const [k, v] of Object.entries(werte)) {
      const feld = form.elements[k];
      if (!feld) continue;
      if (feld.type === "checkbox") feld.checked = !!v;
      else feld.value = Array.isArray(v) ? v.join(", ") : v;
    }
    $("#hanko").classList.remove("stempeln");
    dialog.showModal();
  }

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = form.elements;
    const eintrag = {
      id: bearbeitet ? bearbeitet.id : "e-" + Date.now().toString(36),
      datum: f.datum.value, von: f.von.value, bis: f.bis.value,
      titel: f.titel.value.trim(), kategorie: f.kategorie.value, rang: f.rang.value,
      ort: f.ort.value.trim(), text: f.text.value.trim(),
      tags: f.tags.value.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean)
    };
    if (f.meilenstein.checked) eintrag.meilenstein = true;
    lokal = lokal.filter((e) => e.id !== eintrag.id).concat(eintrag);
    const gespeichert = schreiben(SPEICHER.lokal, lokal);

    const hanko = $("#hanko");
    hanko.classList.remove("stempeln"); void hanko.offsetWidth; hanko.classList.add("stempeln");
    setTimeout(() => {
      dialog.close();
      allesZeichnen();
      meldung(gespeichert ? "Abgestempelt! 承認" : "Gespeichert – aber dieser Browser erlaubt keinen dauerhaften Speicher. Exportiere bald!");
      funken(innerWidth / 2, innerHeight / 2, 40);
    }, 900);
  });

  $("#abbrechen-knopf").addEventListener("click", () => dialog.close());
  $("#loeschen-knopf").addEventListener("click", () => {
    if (!bearbeitet || !confirm("Diesen Entwurf aus dem Browser entfernen?")) return;
    lokal = lokal.filter((e) => e.id !== bearbeitet.id);
    schreiben(SPEICHER.lokal, lokal);
    dialog.close();
    allesZeichnen();
  });

  $("#neu-knopf").addEventListener("click", () => dialogOeffnen(null));

  $("#export-knopf").addEventListener("click", () => {
    const eintraege = veroeffentlicht.concat(lokal).sort((a, b) => a.datum.localeCompare(b.datum));
    const datei = "// Sande Kokuyo – Berichtsheft: Daten\n" +
      "// Diese Datei ersetzt du durch den Export aus dem Schreibmodus (\"Für GitHub exportieren\").\n" +
      "// von/bis sind optional. meilenstein: true hebt einen Eintrag golden hervor.\n\n" +
      "window.PROFIL = " + JSON.stringify(profil, null, 2) + ";\n\n" +
      "window.EINTRAEGE = " + JSON.stringify(eintraege, null, 2) + ";\n";
    const link = el("a", { href: URL.createObjectURL(new Blob([datei], { type: "text/javascript" })), download: "eintraege.js" });
    document.body.append(link); link.click(); link.remove();
    meldung("eintraege.js heruntergeladen – jetzt auf GitHub ersetzen.");
  });

  function schreibmodusSetzen(an) {
    $("#schreib-leiste").hidden = !an;
    $("#schreibmodus-knopf").setAttribute("aria-pressed", String(an));
    schreiben(SPEICHER.schreiben, an);
  }
  $("#schreibmodus-knopf").addEventListener("click", () => schreibmodusSetzen($("#schreib-leiste").hidden));
  schreibmodusSetzen(lesen(SPEICHER.schreiben, false) || location.hash === "#schreiben");

  $("#druck-knopf").addEventListener("click", () => {
    document.querySelectorAll(".eintrag.verborgen").forEach((k) => k.classList.replace("verborgen", "sichtbar"));
    print();
  });

  let suchTimer;
  $("#suche").addEventListener("input", (ev) => {
    clearTimeout(suchTimer);
    suchTimer = setTimeout(() => { filter.suche = ev.target.value.trim(); zeitleisteZeichnen(); }, 150);
  });

  // ---------- theme ----------

  function themaSetzen(t) {
    if (t === "washi") document.documentElement.dataset.thema = "washi";
    else delete document.documentElement.dataset.thema;
    document.querySelector('meta[name="theme-color"]').content = t === "washi" ? "#f1e9dc" : "#0d0b0e";
  }
  themaSetzen(lesen(SPEICHER.thema, matchMedia("(prefers-color-scheme: light)").matches ? "washi" : "obsidian"));
  $("#thema-knopf").addEventListener("click", () => {
    const neu = document.documentElement.dataset.thema === "washi" ? "obsidian" : "washi";
    themaSetzen(neu);
    schreiben(SPEICHER.thema, neu);
  });

  // ---------- toast ----------

  let toastTimer;
  function meldung(text) {
    let t = $(".toast");
    if (!t) { t = el("div", { class: "toast", role: "status" }); document.body.append(t); }
    t.textContent = text;
    requestAnimationFrame(() => t.classList.add("zeigen"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("zeigen"), 3200);
  }

  // ---------- embers in the hero ----------

  const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const leinwand = $("#glut"), ctx = leinwand.getContext("2d");
  let partikel = [], laeuft = false, sichtbar = true;

  function groesse() {
    const r = leinwand.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    leinwand.width = r.width * dpr; leinwand.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function neuerFunke(x, y, schub) {
    const r = leinwand.getBoundingClientRect();
    return {
      x: x !== undefined ? x : Math.random() * r.width,
      y: y !== undefined ? y : r.height + 10,
      vx: (Math.random() - .5) * (schub ? 6 : .4),
      vy: schub ? -(Math.random() * 6 + 2) : -(Math.random() * .7 + .3),
      r: Math.random() * 2 + .6,
      leben: 1,
      zerfall: schub ? .015 + Math.random() * .02 : .002 + Math.random() * .003,
      farbe: Math.random() < .55 ? "255,106,43" : Math.random() < .5 ? "246,215,139" : "200,48,44"
    };
  }
  function schleife() {
    if (!sichtbar || document.hidden) { laeuft = false; return; }
    laeuft = true;
    const r = leinwand.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    if (partikel.length < 46 && Math.random() < .35) partikel.push(neuerFunke());
    partikel = partikel.filter((p) => p.leben > 0 && p.y > -20);
    for (const p of partikel) {
      p.x += p.vx + Math.sin(p.y / 40) * .25;
      p.y += p.vy;
      p.leben -= p.zerfall;
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + p.farbe + "," + Math.max(0, p.leben) + ")";
      ctx.shadowColor = "rgba(" + p.farbe + ",.9)";
      ctx.shadowBlur = 8;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(schleife);
  }
  function starten() { if (!ruhig && !laeuft) requestAnimationFrame(schleife); }

  // burst of sparks anywhere on screen (stamping, the "katon" easter egg)
  function funken(x, y, anzahl) {
    if (ruhig) return;
    const c = el("canvas", { style: "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:20" });
    document.body.append(c);
    const k = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight;
    let teile = Array.from({ length: anzahl }, () => Object.assign(neuerFunke(x, y, true), { r: Math.random() * 3 + 1 }));
    (function tick() {
      k.clearRect(0, 0, c.width, c.height);
      teile = teile.filter((p) => p.leben > 0);
      for (const p of teile) {
        p.x += p.vx; p.y += p.vy; p.vy += .12; p.leben -= p.zerfall;
        k.fillStyle = "rgba(" + p.farbe + "," + p.leben + ")";
        k.beginPath(); k.arc(p.x, p.y, p.r, 0, Math.PI * 2); k.fill();
      }
      teile.length ? requestAnimationFrame(tick) : c.remove();
    })();
  }

  if (!ruhig) {
    groesse();
    addEventListener("resize", groesse);
    new IntersectionObserver(([t]) => { sichtbar = t.isIntersecting; starten(); }).observe(leinwand);
    document.addEventListener("visibilitychange", starten);
  }

  // type "katon" anywhere (outside inputs) for a fire burst
  let getippt = "";
  addEventListener("keydown", (ev) => {
    if (ev.target.closest("input, textarea, select")) return;
    getippt = (getippt + ev.key.toLowerCase()).slice(-5);
    if (getippt === "katon") {
      meldung("火遁 · Katon!");
      for (let i = 0; i < 5; i++) setTimeout(() => funken(innerWidth * (.2 + i * .15), innerHeight * .8, 35), i * 120);
    }
  });

  // #tag-N is the old form of these links and keeps working
  const tagAusLink = /^#(?:monat|tag)-(\d+)$/.exec(location.hash);
  if (tagAusLink) filter.tag = rpTage()[Number(tagAusLink[1]) - 1] || "alle";

  profilZeichnen();
  chipsZeichnen();
  allesZeichnen();
  if (tagAusLink) $("#bericht-titel").scrollIntoView();
})();
