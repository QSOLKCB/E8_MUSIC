(function () {
  "use strict";
  const Core = window.E8Core;
  const AudioEngine = window.E8Audio;
  const $ = (id) => document.getElementById(id);
  const controlIds = ["modelMode", "renderMode", "projection", "traversal", "etqExperiment", "duration", "bpm", "tuning", "scale", "baseMidi", "pitchSpan", "density", "seed", "waveform", "cutoff", "drive", "grit", "width", "space", "sampleRate", "bitDepth", "channels"];
  let lastRender = null;
  let audioUrl = null;

  function buildPresetMenu() {
    const groups = new Map();
    Object.entries(AudioEngine.PRESETS).forEach(([id, preset]) => {
      if (!groups.has(preset.family)) groups.set(preset.family, []);
      groups.get(preset.family).push([id, preset]);
    });
    groups.forEach((presets, family) => {
      const group = document.createElement("optgroup");
      group.label = family;
      presets.forEach(([id, preset]) => {
        const option = document.createElement("option");
        option.value = id; option.textContent = preset.label; group.append(option);
      });
      $("preset").append(group);
    });
  }

  function setValue(id, value) {
    const element = $(id);
    if (element && value !== undefined) element.value = String(value);
  }

  function applyPreset(id) {
    const recipe = AudioEngine.presetRecipe(id);
    $("preset").value = recipe.presetId;
    controlIds.forEach((controlId) => setValue(controlId, recipe[controlId]));
    $("presetDescription").textContent = recipe.description;
    updateOutputs();
    updateModelUI();
    updateLiveFixtures();
  }

  function updateOutputs() {
    $("durationOut").textContent = `${Number($("duration").value).toFixed(1)} s`;
    $("bpmOut").textContent = `${$("bpm").value} BPM`;
    $("baseMidiOut").textContent = $("baseMidi").value;
    $("pitchSpanOut").textContent = `${$("pitchSpan").value} st`;
    $("densityOut").textContent = `${Math.round(Number($("density").value) * 100)}%`;
    $("cutoffOut").textContent = `${Number($("cutoff").value).toLocaleString()} Hz`;
    $("driveOut").textContent = `${Number($("drive").value).toFixed(2)}×`;
    $("gritOut").textContent = `${Math.round(Number($("grit").value) * 100)}%`;
    $("widthOut").textContent = `${Math.round(Number($("width").value) * 100)}%`;
    $("spaceOut").textContent = `${Math.round(Number($("space").value) * 100)}%`;
  }

  function updateModelUI() {
    const model = $("modelMode").value;
    $("etqExperimentWrap").hidden = model === "e8";
    const content = {
      e8: {
        title: "E8 / 240 ROOTS",
        text: "Exact root coordinates drive authored musical mappings. Projection, tuning, timing and synthesis are receiver choices."
      },
      etq101: {
        title: "ETQ-101 / 2 + 33×3 STATES",
        text: "Exact D4-triality selection and graph fixtures drive a declared WAV receiver. This audio layer extends the symbolic MIDI contract; it is not part of the root ETQ-101 v2 profile."
      },
      etq303: {
        title: "H303 / 101×3 COMPONENTS",
        text: "The optional full-qutrit extension provides 303 site×qutrit components and an order-303 cycle. These are not 303 E8 roots."
      }
    }[model];
    $("activeModel").textContent = content.title;
    $("claimBoundary").textContent = content.text;
    if (model === "etq303") $("etqExperiment").value = "full303";
  }

  function updateLiveFixtures() {
    const roots = Core.generateE8Roots();
    const projection = Core.projectRoots(roots, $("projection").value);
    const model = $("modelMode").value;
    $("projectionMetric").textContent = Core.uniqueProjectionValues(projection.values).length;
    if (model === "e8") {
      $("sourceMetric").textContent = "240";
      $("sourceMetricLabel").textContent = "E8 roots";
      $("fixtureReceipt").textContent = "240 = 112 + 128 · ‖r‖² = 2";
    } else if (model === "etq101") {
      $("sourceMetric").textContent = "101";
      $("sourceMetricLabel").textContent = "selected graph states";
      $("fixtureReceipt").textContent = "12 + 76(3) ambient triality · selected 2 + 33(3) · 1,687 graph edges";
    } else {
      $("sourceMetric").textContent = "303";
      $("sourceMetricLabel").textContent = "site × qutrit states";
      $("fixtureReceipt").textContent = "H303 = H101 ⊗ C³ · δ = 2π/303 · ambient root set remains 240";
    }
  }

  function collectRecipe() {
    const numeric = new Set(["duration", "bpm", "tuning", "baseMidi", "pitchSpan", "density", "cutoff", "drive", "grit", "width", "space", "sampleRate", "bitDepth", "channels"]);
    const recipe = { presetId: $("preset").value };
    controlIds.forEach((id) => { recipe[id] = numeric.has(id) ? Number($(id).value) : $(id).value; });
    return recipe;
  }

  async function render() {
    const button = $("renderButton");
    button.disabled = true;
    $("progressWrap").hidden = false;
    $("emptyDisplay").hidden = true;
    $("renderState").textContent = "RENDERING";
    $("downloadWav").disabled = true;
    $("downloadRecipe").disabled = true;
    const recipe = collectRecipe();
    try {
      const result = await AudioEngine.render(recipe, (fraction, message) => {
        $("renderProgress").value = fraction;
        $("progressPercent").textContent = `${Math.round(fraction * 100)}%`;
        if (message) $("progressText").textContent = message;
      });
      lastRender = result;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = URL.createObjectURL(result.wav.blob);
      $("audioPlayer").src = audioUrl;
      $("audioPlayer").load();
      drawWaveform(result.buffer);
      updateReceipt(result);
      updateEventTable(result.events);
      $("downloadWav").disabled = false;
      $("downloadRecipe").disabled = false;
      $("renderState").textContent = "HASHED / READY";
    } catch (error) {
      console.error(error);
      $("renderState").textContent = "RENDER FAILED";
      $("progressText").textContent = error.message;
      $("progressPercent").textContent = "ERROR";
    } finally {
      button.disabled = false;
      window.setTimeout(() => { if (lastRender) $("progressWrap").hidden = true; }, 900);
    }
  }

  function drawWaveform(buffer) {
    const canvas = $("waveformCanvas");
    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(129, 151, 143, .25)";
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();
    const step = Math.max(1, Math.floor(buffer.length / width));
    context.strokeStyle = "#e6a94d";
    context.lineWidth = 1.2;
    context.beginPath();
    for (let x = 0; x < width; x += 1) {
      let min = 1; let max = -1;
      const start = x * step;
      for (let index = start; index < Math.min(buffer.length, start + step); index += 1) {
        const value = (buffer.left[index] + buffer.right[index]) * 0.5;
        if (value < min) min = value;
        if (value > max) max = value;
      }
      context.moveTo(x, (1 - max) * height * 0.5);
      context.lineTo(x, (1 - min) * height * 0.5);
    }
    context.stroke();
  }

  function updateReceipt(result) {
    $("hashReceipt").textContent = result.sha256;
    $("formatReceipt").textContent = `${result.recipe.sampleRate.toLocaleString()} Hz · ${result.recipe.bitDepth}-bit PCM · ${result.recipe.channels === 1 ? "mono" : "stereo"} · ${(result.wav.bytes / 1024 / 1024).toFixed(2)} MiB`;
    $("eventMetric").textContent = result.events.length.toLocaleString();
    $("levelMetric").textContent = `${result.analysis.peak.toFixed(2)} / ${result.analysis.rms.toFixed(2)}`;
    const fixtures = result.fixtures.etq;
    if (fixtures) {
      $("fixtureReceipt").textContent = fixtures.fullQutritStates
        ? `12 + 76(3) triality · 1,687 edges · degree sum 3,374 · ${fixtures.fullQutritStates} H303 components`
        : "12 + 76(3) triality · selected 2 + 33(3) · 1,687 edges · degree sum 3,374";
    } else {
      $("fixtureReceipt").textContent = `240 = 112 + 128 · ‖r‖² = 2 · ${result.fixtures.uniqueProjectionValues} unique projected values`;
    }
  }

  function updateEventTable(events) {
    const body = $("eventTable");
    body.textContent = "";
    events.slice(0, 24).forEach((event, index) => {
      const row = document.createElement("tr");
      const values = [
        index + 1,
        `${Number(event.time || 0).toFixed(3)} s`,
        event.source || event.role || "continuous",
        event.voice || event.role || "control",
        event.voice || (event.midi !== undefined ? `MIDI ${event.midi} / ${event.frequency.toFixed(1)} Hz` : `${event.lowHz?.toFixed(1) || "—"}–${event.highHz?.toFixed(1) || "—"} Hz`),
        event.degree !== undefined ? `degree ${event.degree} · D₃ ${event.curvature}` : (event.coordinate !== undefined ? `coordinate ${event.coordinate}` : `${event.controlPoints || "—"} points`)
      ];
      values.forEach((value) => { const cell = document.createElement("td"); cell.textContent = String(value); row.append(cell); });
      body.append(row);
    });
  }

  function renderManifest() {
    if (!lastRender) return null;
    return {
      schema: "https://qsol-imc.example/schemas/e8-workbench-recipe-v1.json",
      workbench: { name: "E8 Sonification Workbench Studio", engineVersion: Core.ENGINE_VERSION },
      createdUtc: new Date().toISOString(),
      mathematicalSource: lastRender.recipe.modelMode === "e8" ? "standard-240-root-E8-coordinate-realization" : "ETQ-101-v2.0.0-studio-extension",
      claimBoundary: "Mathematical/model fixtures drive an authored musical receiver. WAV parameters are not intrinsic E8 or qutrit properties.",
      recipe: lastRender.recipe,
      receipt: { wavSha256: lastRender.sha256, wavBytes: lastRender.wav.bytes, peak: lastRender.analysis.peak, rms: lastRender.analysis.rms, eventCount: lastRender.events.length, fixtures: lastRender.fixtures },
      eventPreview: lastRender.events.slice(0, 303)
    };
  }

  function fileStem() {
    const preset = lastRender?.recipe.presetId || $("preset").value;
    const seed = (lastRender?.recipe.seed || $("seed").value).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 28);
    return `e8-workbench_${preset}_${seed || "seed"}`.toLowerCase();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadRecipe(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const recipe = parsed.recipe || parsed;
        if (!recipe.presetId || !AudioEngine.PRESETS[recipe.presetId]) throw new Error("Unknown or missing presetId.");
        $("preset").value = recipe.presetId;
        controlIds.forEach((id) => setValue(id, recipe[id]));
        $("presetDescription").textContent = AudioEngine.PRESETS[recipe.presetId].description;
        updateOutputs(); updateModelUI(); updateLiveFixtures();
      } catch (error) {
        window.alert(`Could not load recipe: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  function newSeed() {
    const data = new Uint32Array(2);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(data);
    else { data[0] = Date.now() >>> 0; data[1] = Math.floor(Math.random() * 0xffffffff); }
    $("seed").value = `E8-${data[0].toString(16).padStart(8, "0")}-${data[1].toString(16).padStart(8, "0")}`;
  }

  function formatClock(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds - minutes * 60;
    return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(3).padStart(6, "0")}`;
  }

  function initialize() {
    buildPresetMenu();
    const validation = Core.validateRoots(Core.generateE8Roots());
    $("rootStatus").textContent = validation.valid ? "240 ROOTS VERIFIED" : "ROOT CHECK FAILED";
    applyPreset("c64Slide");
    $("preset").addEventListener("change", (event) => applyPreset(event.target.value));
    controlIds.forEach((id) => {
      $(id).addEventListener("input", () => { updateOutputs(); if (id === "modelMode") updateModelUI(); if (id === "projection" || id === "modelMode") updateLiveFixtures(); });
    });
    $("renderButton").addEventListener("click", render);
    $("randomSeedButton").addEventListener("click", newSeed);
    $("downloadWav").addEventListener("click", () => lastRender && downloadBlob(lastRender.wav.blob, `${fileStem()}.wav`));
    $("downloadRecipe").addEventListener("click", () => {
      const manifest = renderManifest();
      if (manifest) downloadBlob(new Blob([Core.canonicalJson(manifest)], { type: "application/json" }), `${fileStem()}.recipe.json`);
    });
    $("loadRecipe").addEventListener("change", (event) => { const [file] = event.target.files; if (file) loadRecipe(file); event.target.value = ""; });
    $("audioPlayer").addEventListener("timeupdate", () => { $("renderClock").textContent = formatClock($("audioPlayer").currentTime); });
    document.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey && !/input|select|textarea/i.test(document.activeElement.tagName)) render();
    });
  }

  initialize();
})();
