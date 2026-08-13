// SPDX-License-Identifier: MPL-2.0
(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.E8Canonical = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ENGINE_VERSION = "1.0.1";
  const PI = 3.141592653589793;
  const HALF_PI = 1.5707963267948966;
  const TAU = 6.283185307179586;
  const KPC_METERS = 3.0856775814913673e19;
  const SAMPLE_RATE = 48000;
  const BIT_DEPTH = 16;
  const CHANNELS = 1;
  const MAX_SOURCE_ROWS = 4096;
  const MAX_DIRECT_SECONDS = 300;
  const SINE_COEFFICIENTS = Object.freeze([
    1,
    -0.16666666666666666,
    0.008333333333333333,
    -0.0001984126984126984,
    0.0000027557319223985893,
    -2.505210838544172e-8,
    1.6059043836821613e-10,
    -7.647163731819816e-13,
    2.8114572543455206e-15
  ]);

  const PROFILES = Object.freeze({
    "uff-orbital-frequency-v1": Object.freeze({
      id: "uff-orbital-frequency-v1",
      label: "UFF physical orbital frequency",
      sourceKind: "radius-velocity-curve",
      sampleRate: SAMPLE_RATE,
      bitDepth: BIT_DEPTH,
      channels: CHANNELS,
      audibleLowHz: 20,
      audibleHighHz: 18000,
      secondsPerInterval: 0.05,
      frequencyInterpolation: "piecewise-linear in octave-translated frequency between adjacent radius-sorted observations over uniform source-index intervals",
      endpointPolicy: "include both the first and final observations; frame_count = intervals * frames_per_interval + 1",
      oscillator: Object.freeze({
        function: "sine",
        implementation: "qsol-deterministic-sine-poly17-v1",
        phaseOriginRadians: 0,
        phaseAccumulator: "binary64 radians wrapped to [0,2*pi) after every frame",
        rangeReduction: "wrap to [-pi,pi], reflect to [-pi/2,pi/2], then evaluate the fixed odd polynomial",
        coefficients: SINE_COEFFICIENTS
      }),
      description: "Compute f = V/(2πR), apply the smallest single integer-octave translation that places the complete frequency interval inside 20–18,000 Hz, then linearly interpolate the translated frequencies between adjacent radius-sorted observations.",
      claim: "Frequency ratios come from the physical orbital-frequency field. Radius traversal and the fixed observation profile are declared sonification conventions, not physical time."
    }),
    "direct-unit-signal-v1": Object.freeze({
      id: "direct-unit-signal-v1",
      label: "Direct unit-signal audification",
      sourceKind: "time-amplitude-signal",
      sampleRate: SAMPLE_RATE,
      bitDepth: BIT_DEPTH,
      channels: CHANNELS,
      description: "Resample a source whose time coordinate is already seconds and whose dimensionless amplitude is already bounded to [-1,1]. No pitch, scale, oscillator, envelope, normalization or mastering is added.",
      claim: "The source amplitude becomes the PCM waveform through deterministic linear resampling only."
    })
  });

  function normalizeSignedZero(value) {
    return Object.is(value, -0) ? 0 : value;
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      const output = {};
      Object.keys(value).sort().forEach((key) => { output[key] = canonicalize(value[key]); });
      return output;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("Canonical JSON cannot contain non-finite numbers.");
      return normalizeSignedZero(value);
    }
    return value;
  }

  function canonicalJson(value) {
    return `${JSON.stringify(canonicalize(value))}\n`;
  }

  function utf8Buffer(text) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).buffer;
    if (typeof Buffer !== "undefined") {
      const bytes = Buffer.from(text, "utf8");
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    throw new Error("UTF-8 encoder unavailable.");
  }

  async function sha256Hex(arrayBuffer) {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", arrayBuffer);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    if (typeof require !== "undefined") {
      return require("crypto").createHash("sha256").update(Buffer.from(arrayBuffer)).digest("hex");
    }
    throw new Error("SHA-256 implementation unavailable.");
  }

  function normalizeKey(key) {
    return String(key).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function parseCsvRow(line) {
    const fields = [];
    let field = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = !quoted;
      } else if (char === "," && !quoted) {
        fields.push(field.trim()); field = "";
      } else field += char;
    }
    if (quoted) throw new Error("Unterminated quoted CSV field.");
    fields.push(field.trim());
    return fields;
  }

  function parseDelimited(text) {
    const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
    if (lines.length < 2) throw new Error("Input must contain a header and at least one data row.");
    const commaSeparated = lines[0].includes(",");
    const split = commaSeparated ? parseCsvRow : (line) => line.trim().split(/\s+/);
    const headers = split(lines[0]);
    const records = [];
    for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
      const fields = split(lines[rowIndex]);
      if (fields.length !== headers.length) throw new Error(`Row ${rowIndex + 1} has ${fields.length} fields; expected ${headers.length}.`);
      const record = {};
      headers.forEach((header, index) => { record[header] = fields[index]; });
      records.push(record);
    }
    return records;
  }

  function recordsFromJson(parsed) {
    if (Array.isArray(parsed)) {
      if (!parsed.length || parsed.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
        throw new Error("JSON input must be an array of record objects or an object containing parallel arrays.");
      }
      return parsed;
    }
    if (!parsed || typeof parsed !== "object") throw new Error("JSON input must be an object or array of objects.");
    const keys = Object.keys(parsed);
    const arrayKeys = keys.filter((key) => Array.isArray(parsed[key]));
    if (arrayKeys.length < 2) throw new Error("JSON object input must contain at least two parallel arrays.");
    const length = parsed[arrayKeys[0]].length;
    if (!length || arrayKeys.some((key) => parsed[key].length !== length)) throw new Error("JSON arrays must be non-empty and have equal lengths.");
    return Array.from({ length }, (_, index) => {
      const row = {};
      arrayKeys.forEach((key) => { row[key] = parsed[key][index]; });
      return row;
    });
  }

  function parseRecords(text) {
    const source = String(text).trim();
    if (!source) throw new Error("Source data is empty.");
    if (source.startsWith("[") || source.startsWith("{")) return recordsFromJson(JSON.parse(source));
    return parseDelimited(source);
  }

  function findField(record, candidates) {
    const lookup = new Map(Object.keys(record).map((key) => [normalizeKey(key), key]));
    for (const candidate of candidates) {
      const key = lookup.get(candidate);
      if (key !== undefined) return key;
    }
    return null;
  }

  function finiteNumber(value, label, rowIndex) {
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
      throw new Error(`${label} at row ${rowIndex + 1} is blank.`);
    }
    const number = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(number)) throw new Error(`${label} at row ${rowIndex + 1} is not finite.`);
    return normalizeSignedZero(number);
  }

  function parseUffCurve(text) {
    const records = parseRecords(text);
    if (records.length < 2) throw new Error("UFF orbital sonification requires at least two observations.");
    if (records.length > MAX_SOURCE_ROWS) throw new Error(`UFF orbital sonification accepts at most ${MAX_SOURCE_ROWS} observations.`);
    const radiusKey = findField(records[0], ["radiuskpc", "rkpc", "radius"]);
    const velocityKey = findField(records[0], ["velocitykms", "vkms", "vobskms", "vmodelkms", "velocity", "vobs", "vmodel"]);
    if (!radiusKey || !velocityKey) throw new Error("UFF input needs radius_kpc/R_kpc and velocity_kms/V_kms/V_obs_kms/V_model_kms columns.");
    const rows = records.map((record, index) => {
      const radiusKpc = finiteNumber(record[radiusKey], "radius_kpc", index);
      const velocityKms = finiteNumber(record[velocityKey], "velocity_kms", index);
      if (!(radiusKpc > 0)) throw new Error(`radius_kpc at row ${index + 1} must be > 0.`);
      if (!(velocityKms > 0)) throw new Error(`velocity_kms at row ${index + 1} must be > 0.`);
      return { radius_kpc: radiusKpc, velocity_kms: velocityKms };
    }).sort((a, b) => a.radius_kpc - b.radius_kpc);
    for (let index = 1; index < rows.length; index += 1) {
      if (!(rows[index].radius_kpc > rows[index - 1].radius_kpc)) throw new Error("radius_kpc values must be unique after sorting.");
    }
    return rows;
  }

  function parseDirectSignal(text) {
    const records = parseRecords(text);
    if (records.length < 2) throw new Error("Direct audification requires at least two observations.");
    if (records.length > MAX_SOURCE_ROWS) throw new Error(`Direct audification accepts at most ${MAX_SOURCE_ROWS} observations.`);
    const timeKey = findField(records[0], ["times", "time", "t"]);
    const valueKey = findField(records[0], ["value", "values", "signal", "amplitude", "sample"]);
    if (!timeKey || !valueKey) throw new Error("Direct input needs time_s/time and value/signal/amplitude columns.");
    const rows = records.map((record, index) => {
      const timeS = finiteNumber(record[timeKey], "time_s", index);
      const value = finiteNumber(record[valueKey], "value", index);
      if (value < -1 || value > 1) throw new Error(`value at row ${index + 1} must already lie in [-1,1]; canonical mode does not normalize it.`);
      return { time_s: timeS, value };
    }).sort((a, b) => a.time_s - b.time_s);
    for (let index = 1; index < rows.length; index += 1) {
      if (!(rows[index].time_s > rows[index - 1].time_s)) throw new Error("time_s values must be strictly increasing.");
    }
    const duration = rows[rows.length - 1].time_s - rows[0].time_s;
    if (!(duration > 0)) throw new Error("Direct signal duration must be positive.");
    if (duration > MAX_DIRECT_SECONDS) throw new Error(`Direct signal duration exceeds the ${MAX_DIRECT_SECONDS} second profile limit.`);
    return rows;
  }

  function orbitalFrequencyHz(radiusKpc, velocityKms) {
    return velocityKms * 1000 / (TAU * radiusKpc * KPC_METERS);
  }

  function chooseOctaveShift(frequencies, profile = PROFILES["uff-orbital-frequency-v1"]) {
    if (!frequencies.length || frequencies.some((frequency) => !(frequency > 0) || !Number.isFinite(frequency))) throw new Error("Orbital frequencies must be finite and positive.");
    const minFrequency = Math.min(...frequencies);
    const maxFrequency = Math.max(...frequencies);
    let shift = Math.ceil(Math.log2(profile.audibleLowHz / minFrequency));
    let factor = 2 ** shift;
    if (!(factor > 0) || !Number.isFinite(factor)) throw new Error("Octave translation is outside the supported numerical range.");

    while (minFrequency * factor < profile.audibleLowHz) {
      shift += 1;
      factor *= 2;
      if (!Number.isFinite(factor)) throw new Error("Octave translation is outside the supported numerical range.");
    }
    while (factor / 2 > 0 && minFrequency * (factor / 2) >= profile.audibleLowHz && maxFrequency * (factor / 2) <= profile.audibleHighHz) {
      shift -= 1;
      factor /= 2;
    }

    const translatedMin = minFrequency * factor;
    const translatedMax = maxFrequency * factor;
    if (translatedMin < profile.audibleLowHz || translatedMax > profile.audibleHighHz) {
      throw new Error(`No single integer-octave translation can place the full ${maxFrequency / minFrequency}× source-frequency span inside ${profile.audibleLowHz}–${profile.audibleHighHz} Hz.`);
    }
    return shift;
  }

  function allocateMono(length) {
    if (!Number.isSafeInteger(length) || length <= 0) throw new Error("Invalid render frame count.");
    const left = new Float64Array(length);
    return { left, right: left, length };
  }

  function interpolate(values, position) {
    const leftIndex = Math.min(values.length - 1, Math.floor(position));
    const rightIndex = Math.min(values.length - 1, leftIndex + 1);
    const fraction = position - leftIndex;
    return values[leftIndex] * (1 - fraction) + values[rightIndex] * fraction;
  }

  function wrapPhase(phase) {
    let wrapped = phase % TAU;
    if (wrapped < 0) wrapped += TAU;
    return normalizeSignedZero(wrapped);
  }

  function deterministicSine(phase) {
    let x = wrapPhase(phase);
    if (x > PI) x -= TAU;
    if (x > HALF_PI) x = PI - x;
    else if (x < -HALF_PI) x = -PI - x;
    const x2 = x * x;
    const polynomial = SINE_COEFFICIENTS[0] + x2 * (
      SINE_COEFFICIENTS[1] + x2 * (
        SINE_COEFFICIENTS[2] + x2 * (
          SINE_COEFFICIENTS[3] + x2 * (
            SINE_COEFFICIENTS[4] + x2 * (
              SINE_COEFFICIENTS[5] + x2 * (
                SINE_COEFFICIENTS[6] + x2 * (
                  SINE_COEFFICIENTS[7] + x2 * SINE_COEFFICIENTS[8]
                )
              )
            )
          )
        )
      )
    );
    return normalizeSignedZero(x * polynomial);
  }

  function float64LeBuffer(values) {
    const arrayBuffer = new ArrayBuffer(values.length * 8);
    const view = new DataView(arrayBuffer);
    for (let index = 0; index < values.length; index += 1) view.setFloat64(index * 8, normalizeSignedZero(values[index]), true);
    return arrayBuffer;
  }

  function encodeWavMono16(samples, sampleRate = SAMPLE_RATE) {
    const dataBytes = samples.length * 2;
    const arrayBuffer = new ArrayBuffer(44 + dataBytes);
    const pcmArrayBuffer = new ArrayBuffer(dataBytes);
    const view = new DataView(arrayBuffer);
    const pcmView = new DataView(pcmArrayBuffer);
    const writeText = (offset, text) => { for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index)); };
    writeText(0, "RIFF"); view.setUint32(4, 36 + dataBytes, true); writeText(8, "WAVE");
    writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeText(36, "data"); view.setUint32(40, dataBytes, true);
    for (let index = 0; index < samples.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, normalizeSignedZero(samples[index])));
      const quantized = Math.round(sample < 0 ? sample * 32768 : sample * 32767);
      view.setInt16(44 + index * 2, quantized, true);
      pcmView.setInt16(index * 2, quantized, true);
    }
    return {
      arrayBuffer,
      pcmArrayBuffer,
      blob: typeof Blob !== "undefined" ? new Blob([arrayBuffer], { type: "audio/wav" }) : null,
      bytes: arrayBuffer.byteLength
    };
  }

  function analyze(samples) {
    let peak = 0;
    let sumSquares = 0;
    for (const sample of samples) {
      peak = Math.max(peak, Math.abs(sample));
      sumSquares += sample * sample;
    }
    return { peak, rms: Math.sqrt(sumSquares / samples.length) };
  }

  async function renderUffOrbital(text) {
    const profile = PROFILES["uff-orbital-frequency-v1"];
    const rows = parseUffCurve(text);
    const physicalFrequencies = rows.map((row) => orbitalFrequencyHz(row.radius_kpc, row.velocity_kms));
    const octaveShift = chooseOctaveShift(physicalFrequencies, profile);
    const octaveFactor = 2 ** octaveShift;
    const audioFrequencies = physicalFrequencies.map((frequency) => frequency * octaveFactor);
    const framesPerInterval = Math.round(profile.sampleRate * profile.secondsPerInterval);
    const frameCount = Math.max(1, (rows.length - 1) * framesPerInterval + 1);
    const buffer = allocateMono(frameCount);
    let phase = profile.oscillator.phaseOriginRadians;
    for (let frame = 0; frame < frameCount; frame += 1) {
      const position = Math.min(audioFrequencies.length - 1, frame / framesPerInterval);
      const frequency = interpolate(audioFrequencies, position);
      buffer.left[frame] = deterministicSine(phase);
      phase = wrapPhase(phase + TAU * frequency / profile.sampleRate);
    }
    const sourceDescriptor = {
      schema: "qsol.canonical-source.uff-radius-velocity/v1",
      units: { radius_kpc: "kpc", velocity_kms: "km/s" },
      observations: rows
    };
    const sourceSha256 = await sha256Hex(utf8Buffer(canonicalJson(sourceDescriptor)));
    const canonicalSignalSha256 = await sha256Hex(float64LeBuffer(buffer.left));
    const wav = encodeWavMono16(buffer.left, profile.sampleRate);
    const pcmSha256 = await sha256Hex(wav.pcmArrayBuffer);
    const wavSha256 = await sha256Hex(wav.arrayBuffer);
    const frequencyRatioError = (() => {
      let maximum = 0;
      for (let index = 1; index < physicalFrequencies.length; index += 1) {
        const physicalRatio = physicalFrequencies[index] / physicalFrequencies[0];
        const audioRatio = audioFrequencies[index] / audioFrequencies[0];
        maximum = Math.max(maximum, Math.abs(physicalRatio - audioRatio));
      }
      return maximum;
    })();
    const manifest = {
      schema: "qsol.e8-music.canonical-sonification-manifest/v1",
      engine: { name: "E8_MUSIC canonical sonification", version: ENGINE_VERSION },
      profile,
      source: {
        schema: sourceDescriptor.schema,
        observation_count: rows.length,
        source_sha256: sourceSha256,
        ordering: "radius_kpc ascending",
        units: sourceDescriptor.units
      },
      transform: {
        physical_frequency_formula: "f_orbit_hz = (velocity_kms * 1000) / (2*pi*radius_kpc*kpc_meters)",
        kpc_meters: KPC_METERS,
        octave_translation: { exponent_k: octaveShift, factor: octaveFactor, rule: "smallest integer k placing the complete source-frequency interval inside the profile audible window, verified after translation" },
        traversal: { coordinate: "radius_kpc ascending", seconds_per_source_interval: profile.secondsPerInterval, physical_time_claim: false, endpoint_policy: profile.endpointPolicy },
        frequency_interpolation: profile.frequencyInterpolation,
        oscillator: profile.oscillator,
        maximum_frequency_ratio_error: frequencyRatioError
      },
      identity: {
        source_sha256: sourceSha256,
        canonical_signal_float64le_sha256: canonicalSignalSha256,
        pcm_s16le_sha256: pcmSha256,
        wav_sha256: wavSha256
      },
      render: { sample_rate_hz: profile.sampleRate, bit_depth: profile.bitDepth, channels: profile.channels, frame_count: frameCount, wav_bytes: wav.bytes },
      claim_boundary: {
        supported: ["orbital frequencies are computed from the declared radius and circular velocity values", "one global power-of-two translation preserves every source frequency ratio", "the WAV is a deterministic realization of this frozen observation profile"],
        not_supported: ["the octave-translated frequencies are emitted acoustic frequencies of the galaxy", "radius traversal is physical time", "the audible window or sine receiver is intrinsic to UFF, E8, or nature", "a sonification validates a physical theory"]
      }
    };
    return {
      profile,
      source: sourceDescriptor,
      buffer,
      wav,
      analysis: analyze(buffer.left),
      manifest,
      sha256: wavSha256,
      events: rows.map((row, index) => ({ index, radius_kpc: row.radius_kpc, velocity_kms: row.velocity_kms, physical_hz: physicalFrequencies[index], audio_hz: audioFrequencies[index] })),
      derived: { octaveShift, octaveFactor, physicalFrequencies, audioFrequencies, frequencyRatioError }
    };
  }

  async function renderDirect(text) {
    const profile = PROFILES["direct-unit-signal-v1"];
    const rows = parseDirectSignal(text);
    const startTime = rows[0].time_s;
    const relativeRows = rows.map((row) => ({ time_s: row.time_s - startTime, value: row.value }));
    const duration = relativeRows[relativeRows.length - 1].time_s;
    const endTime = rows[rows.length - 1].time_s;
    const frameCount = Math.floor(duration * profile.sampleRate + 1e-12) + 1;
    const buffer = allocateMono(frameCount);
    let sourceIndex = 0;
    for (let frame = 0; frame < frameCount; frame += 1) {
      const time = Math.min(duration, frame / profile.sampleRate);
      while (sourceIndex + 1 < relativeRows.length - 1 && relativeRows[sourceIndex + 1].time_s < time) sourceIndex += 1;
      const left = relativeRows[sourceIndex];
      const right = relativeRows[Math.min(relativeRows.length - 1, sourceIndex + 1)];
      const span = right.time_s - left.time_s;
      const fraction = span > 0 ? (time - left.time_s) / span : 0;
      buffer.left[frame] = normalizeSignedZero(left.value * (1 - fraction) + right.value * fraction);
    }
    const sourceDescriptor = {
      schema: "qsol.canonical-source.direct-unit-signal/v1",
      units: { time_s: "s", value: "dimensionless [-1,1]" },
      observations: rows
    };
    const sourceSha256 = await sha256Hex(utf8Buffer(canonicalJson(sourceDescriptor)));
    const canonicalSignalSha256 = await sha256Hex(float64LeBuffer(buffer.left));
    const wav = encodeWavMono16(buffer.left, profile.sampleRate);
    const pcmSha256 = await sha256Hex(wav.pcmArrayBuffer);
    const wavSha256 = await sha256Hex(wav.arrayBuffer);
    const manifest = {
      schema: "qsol.e8-music.canonical-sonification-manifest/v1",
      engine: { name: "E8_MUSIC canonical sonification", version: ENGINE_VERSION },
      profile,
      source: { schema: sourceDescriptor.schema, observation_count: rows.length, source_sha256: sourceSha256, ordering: "time_s ascending", units: sourceDescriptor.units },
      transform: {
        mapping: "dimensionless source value -> waveform amplitude",
        resampling: "piecewise-linear at fixed 48,000 Hz on time coordinates shifted to a zero-relative origin before frame generation",
        time_origin_shift_s: startTime,
        additions: "none: no oscillator, envelope, normalization, seed, effects, panning, scale, tuning or mastering"
      },
      identity: { source_sha256: sourceSha256, canonical_signal_float64le_sha256: canonicalSignalSha256, pcm_s16le_sha256: pcmSha256, wav_sha256: wavSha256 },
      render: { sample_rate_hz: profile.sampleRate, bit_depth: profile.bitDepth, channels: profile.channels, frame_count: frameCount, wav_bytes: wav.bytes },
      claim_boundary: {
        supported: ["source time is interpreted in seconds", "source value is interpreted directly as dimensionless amplitude", "the WAV is a deterministic linear resampling of the source signal"],
        not_supported: ["the amplitude values are calibrated sound pressure", "48 kHz or PCM16 is intrinsic to the source phenomenon", "audibility validates the source model"]
      }
    };
    return {
      profile,
      source: sourceDescriptor,
      buffer,
      wav,
      analysis: analyze(buffer.left),
      manifest,
      sha256: wavSha256,
      events: rows.map((row, index) => ({ index, time_s: row.time_s, value: row.value })),
      derived: { startTime, endTime, duration }
    };
  }

  async function render(profileId, text) {
    if (profileId === "uff-orbital-frequency-v1") return renderUffOrbital(text);
    if (profileId === "direct-unit-signal-v1") return renderDirect(text);
    throw new Error(`Unknown canonical sonification profile: ${profileId}`);
  }

  return Object.freeze({
    ENGINE_VERSION,
    PROFILES,
    KPC_METERS,
    canonicalJson,
    parseUffCurve,
    parseDirectSignal,
    orbitalFrequencyHz,
    chooseOctaveShift,
    deterministicSine,
    encodeWavMono16,
    sha256Hex,
    renderUffOrbital,
    renderDirect,
    render
  });
});
