// SPDX-License-Identifier: MPL-2.0
(function () {
  "use strict";

  const Canonical = window.E8Canonical;
  if (!Canonical) throw new Error("E8Canonical must load before canonical-ui.js.");

  const $ = (id) => document.getElementById(id);
  const interpretiveBoundaryText = "The E8 root construction, D4 triality orbit counts, ETQ-101 selector, selected graph fixtures and symbolic codebook are mathematical/model fixtures. Every audible frequency, scale, tempo, waveform, dynamics rule and WAV encoding choice is an authored receiver. H303 contains 303 site×qutrit components; it does not contain 303 E8 roots.";
  let canonicalResult = null;
  let canonicalAudioUrl = null;

  const uffExample = `radius_kpc,velocity_kms
0.5,90
1,125
2,155
4,180
8,195
16,205
`;

  const directExample = `time_s,value
0.000,0
0.125,0.75
0.250,0
0.375,-0.75
0.500,0
`;

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function fileStem() {
    return canonicalResult ? `e8-workbench_${canonicalResult.profile.id}_${canonicalResult.sha256.slice(0, 12)}` : "e8-workbench_canonical";
  }

  function drawWaveform(buffer) {
    const canvas = $("waveformCanvas");
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(129, 151, 143, .25)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, height / 2);
    context.lineTo(width, height / 2);
    context.stroke();
    const values = buffer.left;
    const step = Math.max(1, Math.floor(values.length / width));
    context.strokeStyle = "#e6a94d";
    context.lineWidth = 1.2;
    context.beginPath();
    for (let x = 0; x < width; x += 1) {
      let min = 1;
      let max = -1;
      const start = x * step;
      for (let index = start; index < Math.min(values.length, start + step); index += 1) {
        min = Math.min(min, values[index]);
        max = Math.max(max, values[index]);
      }
      context.moveTo(x, (1 - max) * height * 0.5);
      context.lineTo(x, (1 - min) * height * 0.5);
    }
    context.stroke();
  }

  function clearWaveform() {
    const canvas = $("waveformCanvas");
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  function formatScientific(value) {
    if (!Number.isFinite(value)) return "—";
    if (Math.abs(value) >= 0.01 && Math.abs(value) < 10000) return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return value.toExponential(4);
  }

  function updateEventTable(result) {
    const body = $("eventTable");
    body.textContent = "";
    result.events.slice(0, 24).forEach((event, index) => {
      const row = document.createElement("tr");
      let values;
      if (result.profile.id === "uff-orbital-frequency-v1") {
        values = [
          index + 1,
          `R=${formatScientific(event.radius_kpc)} kpc`,
          `curve row ${event.index}`,
          "orbital frequency",
          `${formatScientific(event.audio_hz)} Hz`,
          `${formatScientific(event.physical_hz)} Hz physical · V=${formatScientific(event.velocity_kms)} km/s`
        ];
      } else {
        values = [
          index + 1,
          `${formatScientific(event.time_s)} s`,
          `sample ${event.index}`,
          "direct amplitude",
          "PCM waveform",
          `value ${formatScientific(event.value)}`
        ];
      }
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.append(cell);
      });
      body.append(row);
    });
  }

  function clearEventTable() {
    $("eventTable").innerHTML = '<tr><td colspan="6" class="empty-row">Render a WAV to populate the event ledger.</td></tr>';
  }

  function updateReceipt(result) {
    $("hashReceipt").textContent = result.sha256;
    $("formatReceipt").textContent = `${result.profile.sampleRate.toLocaleString()} Hz · ${result.profile.bitDepth}-bit PCM · mono · ${(result.wav.bytes / 1024 / 1024).toFixed(2)} MiB`;
    $("eventMetric").textContent = result.events.length.toLocaleString();
    $("levelMetric").textContent = `${result.analysis.peak.toFixed(2)} / ${result.analysis.rms.toFixed(2)}`;
    $("sourceMetric").textContent = result.events.length.toLocaleString();
    $("sourceMetricLabel").textContent = result.profile.id === "uff-orbital-frequency-v1" ? "UFF curve observations" : "time-amplitude observations";

    const controlArticle = $("projectionMetric").closest("article");
    if (result.profile.id === "uff-orbital-frequency-v1") {
      $("projectionMetric").textContent = `2^${result.derived.octaveShift}`;
      controlArticle.querySelector("small").textContent = "single integer-octave translation";
      $("fixtureReceipt").textContent = `f = V/(2πR) · k=${result.derived.octaveShift} · ratio error ${result.derived.frequencyRatioError.toExponential(2)}`;
    } else {
      $("projectionMetric").textContent = "1:1";
      controlArticle.querySelector("small").textContent = "source value → waveform amplitude";
      $("fixtureReceipt").textContent = "time in seconds · amplitude already dimensionless [-1,1] · linear 48 kHz resampling";
    }
  }

  function clearReceiptForInterpretiveMode() {
    $("hashReceipt").textContent = "—";
    $("formatReceipt").textContent = "—";
    $("eventMetric").textContent = "—";
    $("levelMetric").textContent = "—";
    $("projectionMetric").closest("article").querySelector("small").textContent = "unique projection values";
    document.querySelector(".boundary-panel p").textContent = interpretiveBoundaryText;
    clearEventTable();
  }

  function updateClaimBoundary(profileId) {
    if (profileId === "uff-orbital-frequency-v1") {
      $("activeModel").textContent = "CANONICAL / UFF ORBITAL FREQUENCY";
      $("claimBoundary").textContent = "V/(2πR) supplies a physical frequency. One globally applied integer-octave translation makes the field audible while preserving every frequency ratio; radius traversal remains a declared observation convention, not physical time.";
      document.querySelector(".boundary-panel p").textContent = "Canonical mode removes compositional controls from the signal path. For UFF orbital-frequency sonification, the data determine f = V/(2πR); the profile fixes one global power-of-two translation, mono PCM16, 48 kHz, equal radius-interval traversal, and a unit sine receiver. Those observation-profile constants are declared conventions, not intrinsic properties of a galaxy, UFF, E8, or nature.";
    } else {
      $("activeModel").textContent = "CANONICAL / DIRECT AUDIFICATION";
      $("claimBoundary").textContent = "Source time is seconds and source value is already dimensionless [-1,1]. The waveform is deterministic linear resampling only: no pitch map, scale, oscillator, envelope, normalization, seed, effects or mastering.";
      document.querySelector(".boundary-panel p").textContent = "Direct canonical audification accepts only a time coordinate already expressed in seconds and a dimensionless signal already bounded to [-1,1]. It adds no musical interpretation. The fixed 48 kHz PCM16 encoding remains an observation/serialization convention rather than a property of the source phenomenon.";
    }
  }

  function setMode(mode, interpretiveSections, actions, downloadActions, canonicalSection) {
    const canonical = mode === "canonical";
    interpretiveSections.forEach((section) => { section.hidden = canonical; });
    actions.hidden = canonical;
    downloadActions.hidden = canonical;
    canonicalSection.hidden = !canonical;
    if (canonical) {
      updateClaimBoundary($("canonicalProfile").value);
      if (canonicalResult) {
        $("emptyDisplay").hidden = true;
        drawWaveform(canonicalResult.buffer);
        updateReceipt(canonicalResult);
        updateEventTable(canonicalResult);
        $("renderState").textContent = "CANONICAL / HASHED / READY";
      } else {
        $("emptyDisplay").hidden = false;
        $("emptyDisplay").querySelector("p").textContent = "LOAD SOURCE DATA · FREEZE THE PROFILE · RENDER CANONICALLY";
        $("renderState").textContent = "CANONICAL / NOT RENDERED";
      }
    } else {
      $("emptyDisplay").hidden = false;
      $("emptyDisplay").querySelector("p").textContent = "SELECT A PRESET · ADJUST THE RECEIVER · RENDER LOCALLY";
      $("audioPlayer").removeAttribute("src");
      $("audioPlayer").load();
      clearWaveform();
      clearReceiptForInterpretiveMode();
      $("modelMode").dispatchEvent(new Event("input", { bubbles: true }));
      $("projection").dispatchEvent(new Event("input", { bubbles: true }));
      $("renderState").textContent = "INTERPRETIVE / RENDER REQUIRED";
    }
  }

  async function renderCanonical() {
    const button = $("canonicalRenderButton");
    button.disabled = true;
    $("canonicalStatus").textContent = "RENDERING · VALIDATING SOURCE AND FROZEN PROFILE";
    $("renderState").textContent = "CANONICAL / RENDERING";
    $("progressWrap").hidden = false;
    $("progressText").textContent = "Canonical transform in progress";
    $("progressPercent").textContent = "…";
    try {
      const result = await Canonical.render($("canonicalProfile").value, $("canonicalSource").value);
      canonicalResult = result;
      if (canonicalAudioUrl) URL.revokeObjectURL(canonicalAudioUrl);
      canonicalAudioUrl = URL.createObjectURL(result.wav.blob);
      $("audioPlayer").src = canonicalAudioUrl;
      $("audioPlayer").load();
      $("emptyDisplay").hidden = true;
      drawWaveform(result.buffer);
      updateReceipt(result);
      updateEventTable(result);
      updateClaimBoundary(result.profile.id);
      $("canonicalDownloadWav").disabled = false;
      $("canonicalDownloadManifest").disabled = false;
      $("canonicalDownloadSource").disabled = false;
      $("canonicalStatus").textContent = `READY · SOURCE ${result.manifest.identity.source_sha256.slice(0, 12)} · WAV ${result.sha256.slice(0, 12)}`;
      $("renderState").textContent = "CANONICAL / HASHED / READY";
      $("progressText").textContent = "Canonical render complete";
      $("progressPercent").textContent = "100%";
      $("renderProgress").value = 1;
    } catch (error) {
      console.error(error);
      $("canonicalStatus").textContent = `REJECTED · ${error.message}`;
      $("renderState").textContent = "CANONICAL / REJECTED";
      $("progressText").textContent = error.message;
      $("progressPercent").textContent = "ERROR";
    } finally {
      button.disabled = false;
      window.setTimeout(() => { $("progressWrap").hidden = true; }, 900);
    }
  }

  function buildUi() {
    const rack = document.querySelector(".control-rack");
    const actions = $("rackActions");
    const downloadActions = document.querySelector("#transportPanel .download-actions");
    const interpretiveSections = Array.from(rack.querySelectorAll(":scope > .rack-section"));

    const modeSection = document.createElement("section");
    modeSection.className = "rack-section canonical-mode-switch";
    modeSection.innerHTML = `
      <div class="section-label"><span>00</span> Observation contract</div>
      <label>Workbench mode
        <select id="sonificationMode">
          <option value="interpretive">Interpretive / mathematical music</option>
          <option value="canonical">Canonical / source-forced WAV</option>
        </select>
      </label>
      <p class="preset-description">Interpretive mode exposes authored musical controls. Canonical mode removes those controls from the signal path and uses a frozen, versioned observation profile.</p>
    `;
    rack.insertBefore(modeSection, rack.firstChild);

    const canonicalSection = document.createElement("section");
    canonicalSection.className = "rack-section canonical-rack";
    canonicalSection.hidden = true;
    canonicalSection.innerHTML = `
      <div class="section-label"><span>C1</span> Canonical source</div>
      <label>Frozen profile
        <select id="canonicalProfile">
          <option value="uff-orbital-frequency-v1">UFF physical orbital frequency v1</option>
          <option value="direct-unit-signal-v1">Direct unit-signal audification v1</option>
        </select>
      </label>
      <p id="canonicalProfileDescription" class="preset-description"></p>
      <label class="canonical-file-button">LOAD CSV / JSON
        <input id="canonicalFile" type="file" accept=".csv,.json,text/csv,application/json,text/plain">
      </label>
      <label>Source data
        <textarea id="canonicalSource" class="notranslate" translate="no" rows="11" spellcheck="false" aria-label="Canonical sonification source data"></textarea>
      </label>
      <div class="canonical-example-actions">
        <button type="button" id="canonicalUffExample">UFF EXAMPLE</button>
        <button type="button" id="canonicalDirectExample">DIRECT EXAMPLE</button>
      </div>
      <div class="canonical-contract">
        <strong>FROZEN OUTPUT PROFILE</strong>
        <span>48,000 Hz · 16-bit PCM · mono · no seed · no tuning system · no scale · no mastering</span>
      </div>
      <button class="primary canonical-render" id="canonicalRenderButton" type="button"><span>RENDER CANONICAL WAV</span></button>
      <p id="canonicalStatus" class="canonical-status" aria-live="polite">NO SOURCE RENDERED</p>
      <div class="canonical-downloads">
        <button id="canonicalDownloadWav" type="button" disabled>DOWNLOAD .WAV</button>
        <button id="canonicalDownloadManifest" type="button" disabled>MANIFEST .JSON</button>
        <button id="canonicalDownloadSource" type="button" disabled>SOURCE .JSON</button>
      </div>
      <p class="canonical-doc-note">Protocol details: <code>CANONICAL_SONIFICATION.md</code></p>
    `;
    rack.insertBefore(canonicalSection, actions);

    const profileDescription = () => {
      const profile = Canonical.PROFILES[$("canonicalProfile").value];
      $("canonicalProfileDescription").textContent = `${profile.description} ${profile.claim}`;
      if ($("sonificationMode").value === "canonical") updateClaimBoundary(profile.id);
    };

    $("sonificationMode").addEventListener("change", (event) => setMode(event.target.value, interpretiveSections, actions, downloadActions, canonicalSection));
    $("canonicalProfile").addEventListener("change", profileDescription);
    $("canonicalRenderButton").addEventListener("click", renderCanonical);
    $("canonicalUffExample").addEventListener("click", () => { $("canonicalProfile").value = "uff-orbital-frequency-v1"; $("canonicalSource").value = uffExample; profileDescription(); });
    $("canonicalDirectExample").addEventListener("click", () => { $("canonicalProfile").value = "direct-unit-signal-v1"; $("canonicalSource").value = directExample; profileDescription(); });
    $("canonicalFile").addEventListener("change", (event) => {
      const [file] = event.target.files;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { $("canonicalSource").value = String(reader.result || ""); $("canonicalStatus").textContent = `LOADED · ${file.name}`; };
      reader.onerror = () => { $("canonicalStatus").textContent = "FILE READ FAILED"; };
      reader.readAsText(file);
      event.target.value = "";
    });
    $("canonicalDownloadWav").addEventListener("click", () => canonicalResult && downloadBlob(canonicalResult.wav.blob, `${fileStem()}.wav`));
    $("canonicalDownloadManifest").addEventListener("click", () => canonicalResult && downloadBlob(new Blob([Canonical.canonicalJson(canonicalResult.manifest)], { type: "application/json" }), `${fileStem()}.manifest.json`));
    $("canonicalDownloadSource").addEventListener("click", () => canonicalResult && downloadBlob(new Blob([Canonical.canonicalJson(canonicalResult.source)], { type: "application/json" }), `${fileStem()}.source.json`));

    $("canonicalSource").value = uffExample;
    profileDescription();
  }

  buildUi();
})();
