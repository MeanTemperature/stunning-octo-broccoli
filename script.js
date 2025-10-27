const state = {
  base: 10,
  data: [],
  maxDigits: 1,
  algorithms: {
    lsd: null,
    msd: null,
  },
  stepIndex: 0,
  maxSteps: 0,
  playing: false,
  timerId: null,
};

const elements = {};

window.addEventListener("DOMContentLoaded", initialize);

function initialize() {
  Object.assign(elements, collectElements());
  if (!elements.sizeInput || !elements.runBtn) {
    console.error("Radix visualizer failed to initialize: required controls missing.");
    return;
  }
  attachEventHandlers();
  handleGenerate();
}

function collectElements() {
  return {
    sizeInput: document.getElementById("size-input"),
    sizeValue: document.getElementById("size-value"),
    digitsInput: document.getElementById("digits-input"),
    digitsValue: document.getElementById("digits-value"),
    seedInput: document.getElementById("seed-input"),
    generateBtn: document.getElementById("generate-btn"),
    runBtn: document.getElementById("run-btn"),
    playBtn: document.getElementById("play-btn"),
    stepBtn: document.getElementById("step-btn"),
    resetBtn: document.getElementById("reset-btn"),
    previewList: document.getElementById("data-preview-list"),
    lsd: {
      passes: document.getElementById("lsd-passes"),
      operations: document.getElementById("lsd-operations"),
      time: document.getElementById("lsd-time"),
      array: document.getElementById("lsd-array"),
      buckets: document.getElementById("lsd-buckets"),
      label: document.getElementById("lsd-step-label"),
    },
    msd: {
      passes: document.getElementById("msd-passes"),
      operations: document.getElementById("msd-operations"),
      time: document.getElementById("msd-time"),
      array: document.getElementById("msd-array"),
      buckets: document.getElementById("msd-buckets"),
      label: document.getElementById("msd-step-label"),
    },
  };
}

function attachEventHandlers() {
  elements.sizeInput.addEventListener("input", () => {
    elements.sizeValue.textContent = elements.sizeInput.value;
  });
  elements.digitsInput.addEventListener("input", () => {
    elements.digitsValue.textContent = elements.digitsInput.value;
  });
  elements.generateBtn.addEventListener("click", handleGenerate);
  elements.runBtn.addEventListener("click", handleRunDemo);
  elements.stepBtn.addEventListener("click", handleStep);
  elements.playBtn.addEventListener("click", handleTogglePlayback);
  elements.resetBtn.addEventListener("click", handleReset);
}

function handleGenerate() {
  const size = clamp(parseInt(elements.sizeInput.value, 10) || 12, 2, 100);
  const maxDigits = clamp(parseInt(elements.digitsInput.value, 10) || 4, 1, 8);
  const seedInputValue = parseInt(elements.seedInput.value, 10);
  const seed = Number.isFinite(seedInputValue) ? seedInputValue : Date.now();

  const dataset = generateDataset(size, maxDigits, seed);
  state.data = dataset;
  state.maxDigits = Math.max(getMaxDigits(dataset, state.base), maxDigits);

  stopPlayback();
  state.stepIndex = 0;
  state.algorithms = { lsd: null, msd: null };
  state.maxSteps = 0;

  updatePreview(dataset);
  resetVisual("lsd");
  resetVisual("msd");
  updateMetrics("lsd", null);
  updateMetrics("msd", null);
}

function handleRunDemo() {
  if (!state.data.length) {
    handleGenerate();
  }

  const input = state.data.slice();
  const lsdResult = runRadixLsd(input.slice(), state.base);
  const msdResult = runRadixMsd(input.slice(), state.base);

  state.algorithms = { lsd: lsdResult, msd: msdResult };
  state.maxSteps = Math.max(lsdResult.steps.length, msdResult.steps.length);
  state.stepIndex = 0;

  updateMetrics("lsd", lsdResult.metrics);
  updateMetrics("msd", msdResult.metrics);
  stopPlayback();
  setStepIndex(0);
}

function handleStep() {
  if (!state.algorithms.lsd && !state.algorithms.msd) {
    handleRunDemo();
    return;
  }
  const nextIndex = Math.min(state.stepIndex + 1, Math.max(state.maxSteps - 1, 0));
  setStepIndex(nextIndex);
}

function handleTogglePlayback() {
  if (!state.algorithms.lsd && !state.algorithms.msd) {
    handleRunDemo();
  }
  if (!state.algorithms.lsd && !state.algorithms.msd) {
    return;
  }
  if (state.playing) {
    stopPlayback();
    return;
  }
  state.playing = true;
  updatePlayState();
  state.timerId = window.setInterval(() => {
    if (state.stepIndex >= state.maxSteps - 1) {
      stopPlayback();
      return;
    }
    setStepIndex(state.stepIndex + 1);
  }, 1200);
}

function handleReset() {
  stopPlayback();
  state.algorithms = { lsd: null, msd: null };
  state.maxSteps = 0;
  state.stepIndex = 0;
  resetVisual("lsd");
  resetVisual("msd");
  updateMetrics("lsd", null);
  updateMetrics("msd", null);
}

function stopPlayback() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  state.playing = false;
  updatePlayState();
}

function updatePlayState() {
  elements.playBtn.dataset.playing = state.playing ? "true" : "false";
  elements.playBtn.textContent = state.playing ? "Pause" : "Play";
}

function setStepIndex(index) {
  state.stepIndex = index;
  renderStep("lsd", index);
  renderStep("msd", index);
}

function generateDataset(size, maxDigits, seed) {
  const rng = lcg(seed);
  const items = [];
  for (let i = 0; i < size; i += 1) {
    const digitCount = clamp(Math.floor(rng() * maxDigits) + 1, 1, maxDigits);
    const max = Math.pow(10, digitCount) - 1;
    const min = digitCount === 1 ? 0 : Math.pow(10, digitCount - 1);
    const value = Math.floor(rng() * (max - min + 1)) + min;
    items.push(value);
  }
  return items;
}

function renderStep(algoKey, index) {
  const algo = state.algorithms[algoKey];
  const ui = elements[algoKey];
  if (!ui) {
    return;
  }

  clearChildren(ui.array);
  clearChildren(ui.buckets);

  if (!algo) {
    ui.label.textContent = "Waiting for run...";
    return;
  }

  const steps = algo.steps;
  if (!steps.length) {
    ui.label.textContent = "No recorded steps.";
    return;
  }

  const clampedIndex = Math.min(index, steps.length - 1);
  const step = steps[clampedIndex];
  const labelPrefix = `Step ${clampedIndex + 1} of ${steps.length}`;

  ui.label.textContent = `${labelPrefix}: ${step.label}`;

  const arrayData =
    step.arrayAfter ??
    step.arrayBefore ??
    algo.sorted.slice();

  renderArray(ui.array, arrayData, step.focusDigit);
  renderBuckets(ui.buckets, step, step.focusDigit);
}

function renderArray(container, items, focusDigit) {
  if (!items || !items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No data.";
    container.appendChild(empty);
    return;
  }

  for (const value of items) {
    const node = document.createElement("div");
    node.className = "array-item";
    if (typeof focusDigit === "number") {
      node.innerHTML = formatNumber(value, focusDigit, state.maxDigits);
    } else {
      node.textContent = value.toString();
    }
    container.appendChild(node);
  }
}

function renderBuckets(container, step, focusDigit) {
  if (!step.buckets) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    if (step.type === "base") {
      empty.textContent = "Base case: bucket split not required.";
    } else if (step.type === "complete") {
      empty.textContent = "All items have been merged.";
    } else {
      empty.textContent = "No bucket data for this step.";
    }
    container.appendChild(empty);
    return;
  }

  step.buckets.forEach((values, digit) => {
    const column = document.createElement("div");
    column.className = "bucket-column";
    column.dataset.digit = digit.toString();

    const list = document.createElement("div");
    list.className = "bucket-items";

    if (!values.length) {
      const empty = document.createElement("div");
      empty.className = "bucket-empty";
      empty.textContent = "--";
      list.appendChild(empty);
    } else {
      values.forEach((value) => {
        const item = document.createElement("div");
        item.className = "bucket-item";
        if (typeof focusDigit === "number") {
          item.innerHTML = formatNumber(value, focusDigit, state.maxDigits);
          const digitValue = getDigit(value, focusDigit, state.base);
          if (digitValue === digit && step.type !== "merge") {
            item.classList.add("is-focus");
          }
        } else {
          item.textContent = value.toString();
        }
        list.appendChild(item);
      });
    }

    column.appendChild(list);
    container.appendChild(column);
  });
}

function resetVisual(key) {
  const ui = elements[key];
  if (!ui) {
    return;
  }
  ui.label.textContent = "Waiting for run...";
  clearChildren(ui.array);
  clearChildren(ui.buckets);
}

function updatePreview(dataset) {
  clearChildren(elements.previewList);
  dataset.forEach((value) => {
    const item = document.createElement("span");
    item.className = "preview-item";
    item.textContent = value.toString();
    elements.previewList.appendChild(item);
  });
}

function updateMetrics(key, metrics) {
  const ui = elements[key];
  if (!ui) {
    return;
  }
  if (!metrics) {
    ui.passes.textContent = "--";
    ui.operations.textContent = "--";
    ui.time.textContent = "--";
    return;
  }
  if (key === "lsd") {
    ui.passes.textContent = metrics.passes.toString();
    ui.operations.textContent = metrics.operations.toLocaleString();
    ui.time.textContent = formatTime(metrics.timeMs);
  } else {
    ui.passes.textContent = metrics.recursiveCalls.toString();
    ui.operations.textContent = metrics.operations.toLocaleString();
    ui.time.textContent = formatTime(metrics.timeMs);
  }
}

function runRadixLsd(numbers, base = 10) {
  const steps = [];
  const working = numbers.slice();
  let operations = 0;
  let passes = 0;

  const maxDigits = getMaxDigits(working, base);
  state.maxDigits = Math.max(state.maxDigits, maxDigits);

  const start = performance.now();
  for (let place = 0; place < maxDigits; place += 1) {
    const buckets = Array.from({ length: base }, () => []);
    for (const value of working) {
      const digit = getDigit(value, place, base);
      buckets[digit].push(value);
      operations += 1;
    }
    const flattened = buckets.flat();
    steps.push({
      label: `Pass ${place + 1}: ${titleCase(digitLabel(place))} place`,
      focusDigit: place,
      buckets: buckets.map((bucket) => bucket.slice()),
      arrayBefore: working.slice(),
      arrayAfter: flattened.slice(),
      operationsSnapshot: operations,
      type: "pass",
    });
    working.splice(0, working.length, ...flattened);
    passes += 1;
  }
  const end = performance.now();
  steps.push({
    label: "Sorted (LSD complete)",
    focusDigit: null,
    buckets: Array.from({ length: base }, () => []),
    arrayAfter: working.slice(),
    operationsSnapshot: operations,
    type: "complete",
  });

  return {
    sorted: working.slice(),
    steps,
    metrics: {
      passes,
      operations,
      timeMs: end - start,
    },
  };
}

function runRadixMsd(numbers, base = 10) {
  const steps = [];
  const working = numbers.slice();
  const maxDigits = getMaxDigits(working, base);
  state.maxDigits = Math.max(state.maxDigits, maxDigits);

  let operations = 0;
  let recursiveCalls = 0;

  const start = performance.now();
  const sorted = msdRecursive(working, maxDigits - 1, 0);
  const end = performance.now();

  steps.push({
    label: "Sorted (MSD complete)",
    focusDigit: null,
    buckets: Array.from({ length: base }, () => []),
    arrayAfter: sorted.slice(),
    operationsSnapshot: operations,
    type: "complete",
  });

  return {
    sorted,
    steps,
    metrics: {
      recursiveCalls,
      operations,
      timeMs: end - start,
    },
  };

  function msdRecursive(arr, position, depth) {
    recursiveCalls += 1;

    if (arr.length <= 1 || position < 0) {
      steps.push({
        label: depth === 0 ? "Base case" : `Depth ${depth}: base case`,
        focusDigit: position >= 0 ? position : null,
        buckets: null,
        arrayBefore: arr.slice(),
        arrayAfter: arr.slice(),
        operationsSnapshot: operations,
        type: "base",
      });
      return arr.slice();
    }

    const buckets = Array.from({ length: base }, () => []);
    for (const value of arr) {
      const digit = getDigit(value, position, base);
      buckets[digit].push(value);
      operations += 1;
    }

    steps.push({
      label: `Depth ${depth}: split on ${titleCase(digitLabel(position))}`,
      focusDigit: position,
      buckets: buckets.map((bucket) => bucket.slice()),
      arrayBefore: arr.slice(),
      operationsSnapshot: operations,
      type: "split",
      depth,
    });

    const merged = [];
    for (let digit = 0; digit < base; digit += 1) {
      if (!buckets[digit].length) {
        continue;
      }
      const sortedBucket = msdRecursive(buckets[digit], position - 1, depth + 1);
      merged.push(...sortedBucket);
    }

    steps.push({
      label: `Depth ${depth}: merge buckets`,
      focusDigit: position,
      buckets: buckets.map(() => []),
      arrayAfter: merged.slice(),
      operationsSnapshot: operations,
      type: "merge",
      depth,
    });

    return merged;
  }
}

function getDigit(value, place, base) {
  const divisor = Math.pow(base, place);
  return Math.floor(Math.abs(value) / divisor) % base;
}

function getMaxDigits(values, base) {
  let max = 1;
  for (const value of values) {
    max = Math.max(max, digitCount(value, base));
  }
  return max;
}

function digitCount(value, base) {
  if (value === 0) {
    return 1;
  }
  return Math.floor(Math.log(Math.abs(value)) / Math.log(base)) + 1;
}

function digitLabel(index) {
  const labels = [
    "ones",
    "tens",
    "hundreds",
    "thousands",
    "ten-thousands",
    "hundred-thousands",
  ];
  if (index < labels.length) {
    return labels[index];
  }
  return `10^${index}`;
}

function formatNumber(value, focusDigit, maxDigits) {
  const raw = value.toString();
  const padded = raw.padStart(maxDigits, "0");
  let html = "";
  for (let i = 0; i < padded.length; i += 1) {
    const isGhost = i < padded.length - raw.length;
    const classes = [];
    if (isGhost) {
      classes.push("digit-ghost");
    }
    if (typeof focusDigit === "number" && i === padded.length - 1 - focusDigit) {
      classes.push("focus-digit");
    }
    const classAttr = classes.length ? ` class="${classes.join(" ")}"` : "";
    html += `<span${classAttr}>${padded[i]}</span>`;
  }
  return html;
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)} us`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lcg(seed) {
  let stateValue = seed % 2147483647;
  if (stateValue <= 0) {
    stateValue += 2147483646;
  }
  return () => {
    stateValue = (stateValue * 16807) % 2147483647;
    return (stateValue - 1) / 2147483646;
  };
}
