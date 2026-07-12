"use strict";

const MODEL_URL = "model/model.json?v=7";
const INPUT_SIZE = 64;
const CLASSES = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const PREDICTION_INTERVAL_MS = 180;
const HISTORY_SIZE = 8;
const MIN_CONFIDENCE = 0.58;
const MIN_MARGIN = 0.08;
const MIN_REPEATS = 4;
// BYPASS: false = NO segmentar, mandar recorte crudo del centro (usar con fondo plano).
// Poner en true para volver a la segmentacion original con OpenCV.
const USE_SEGMENTATION = false;
// FLIP TTA: false = NO promediar con la imagen espejada (una sena espejada puede ser otro digito).
// Poner en true para volver al promedio original con el espejo horizontal.
const USE_FLIP_TTA = false;

const stateClasses = [
  "state-idle",
  "state-loading",
  "state-error",
  "state-warning",
  "state-unstable",
  "state-success",
  "state-saved"
];

const ui = {
  cameraButton: document.getElementById("cameraButton"),
  detectButton: document.getElementById("detectButton"),
  useDigitButton: document.getElementById("useDigitButton"),
  modelStatus: document.getElementById("modelStatus"),
  cvStatus: document.getElementById("cvStatus"),
  statusCard: document.getElementById("statusCard"),
  statusMessage: document.getElementById("statusMessage"),
  cameraFrame: document.getElementById("cameraFrame"),
  video: document.getElementById("video"),
  captureCanvas: document.getElementById("captureCanvas"),
  processedCanvas: document.getElementById("processedCanvas"),
  currentPrediction: document.getElementById("currentPrediction"),
  currentConfidence: document.getElementById("currentConfidence"),
  confirmedConfidence: document.getElementById("confirmedConfidence"),
  autoStatus: document.getElementById("autoStatus"),
  processingSummary: document.getElementById("processingSummary"),
  probabilityList: document.getElementById("probabilityList"),
  operationDisplay: document.getElementById("operationDisplay"),
  calculatorHint: document.getElementById("calculatorHint"),
  equalsButton: document.getElementById("equalsButton"),
  clearButton: document.getElementById("clearButton"),
  operatorButtons: Array.from(document.querySelectorAll("[data-operator]"))
};

const app = {
  model: null,
  cameraStream: null,
  predictionTimer: null,
  predicting: false,
  modelReady: false,
  opencvReady: false,
  cameraReady: false,
  predictionHistory: [],
  currentDigit: null,
  confirmedDigit: null,
  lastConfirmedAt: 0,
  probabilities: Array(10).fill(0),
  calculator: {
    first: null,
    operator: null,
    second: null,
    result: null
  }
};

function setVisualState(name, message) {
  const className = `state-${name}`;
  ui.statusCard.classList.remove(...stateClasses);
  ui.cameraFrame.classList.remove(...stateClasses);
  ui.statusCard.classList.add(className);
  ui.cameraFrame.classList.add(className);
  ui.statusMessage.textContent = message;
}

function setComponentStatus(element, message, state) {
  element.textContent = message;
  element.classList.remove("ready", "error");
  if (state) {
    element.classList.add(state);
  }
}

function initProbabilityRows() {
  ui.probabilityList.innerHTML = "";
  CLASSES.forEach((label) => {
    const row = document.createElement("div");
    row.className = "probability-row";
    row.innerHTML = `
      <span>${label}</span>
      <div class="probability-track"><div class="probability-fill" data-prob="${label}"></div></div>
      <strong data-prob-label="${label}">0.0%</strong>
    `;
    ui.probabilityList.appendChild(row);
  });
}

function waitForOpenCv() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.cv && cv.Mat && cv.imread) {
        window.clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - startedAt > 16000) {
        window.clearInterval(timer);
        reject(new Error("OpenCV.js no termino de cargar"));
      }
    }, 80);
  });
}

async function loadComponents() {
  setVisualState("loading", "Cargando componentes de inteligencia artificial.");

  if (!window.tf) {
    setComponentStatus(ui.modelStatus, "Modelo: error", "error");
    throw new Error("TensorFlow.js no esta disponible");
  }
  console.info("TensorFlow.js cargado");

  try {
    await waitForOpenCv();
    app.opencvReady = true;
    setComponentStatus(ui.cvStatus, "OpenCV: listo", "ready");
    console.info("OpenCV.js cargado");
  } catch (error) {
    setComponentStatus(ui.cvStatus, "OpenCV: error", "error");
    throw error;
  }

  try {
    app.model = await tf.loadLayersModel(MODEL_URL);
    app.modelReady = true;
    setComponentStatus(ui.modelStatus, "Modelo: listo", "ready");
    console.info("modelo cargado", MODEL_URL);
    console.info("input shape", app.model.inputs[0].shape);
    console.info("output shape", app.model.outputs[0].shape);
    setVisualState("idle", "Componentes listos. Activa la camara.");
  } catch (error) {
    setComponentStatus(ui.modelStatus, "Modelo: error", "error");
    setVisualState("error", "No se pudo cargar el modelo.");
    throw error;
  }
}

async function startCamera() {
  ui.cameraButton.disabled = true;
  setVisualState("loading", "Cargando componentes de inteligencia artificial.");

  try {
    if (!app.modelReady || !app.opencvReady) {
      await loadComponents();
    }

    app.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 960 },
        height: { ideal: 720 }
      },
      audio: false
    });

    ui.video.srcObject = app.cameraStream;
    await ui.video.play();
    app.cameraReady = true;
    ui.detectButton.disabled = false;
    ui.autoStatus.textContent = "Deteccion automatica: activa";
    console.info("camara iniciada");

    setVisualState("unstable", "Muestra un numero dentro del recuadro.");
    startPredictionLoop();
  } catch (error) {
    console.error(error);
    ui.cameraButton.disabled = false;
    const message = String(error.message || error).toLowerCase();
    if (message.includes("model") || message.includes("inputlayer") || message.includes("layers")) {
      setVisualState("error", "No se pudo cargar el modelo.");
    } else if (message.includes("opencv")) {
      setVisualState("error", "No se pudo cargar OpenCV.js.");
    } else {
      setVisualState("error", "No fue posible acceder a la camara.");
    }
  }
}

function startPredictionLoop() {
  window.clearInterval(app.predictionTimer);
  app.predictionTimer = window.setInterval(runPredictionCycle, PREDICTION_INTERVAL_MS);
}

async function runPredictionCycle() {
  if (app.predicting || !app.cameraReady || !app.modelReady || !app.opencvReady) {
    return;
  }

  app.predicting = true;
  try {
    const processed = processCurrentFrame();
    ui.processingSummary.textContent = processed.summary;

    if (!processed.ok) {
      resetCurrentPrediction();
      app.predictionHistory = [];
      setVisualState(processed.state, processed.message);
      return;
    }

    if (!processed.hasHand) {
      resetCurrentPrediction();
      app.predictionHistory = [];
      setVisualState("error", "No se detecta una mano.");
      return;
    }

    const prediction = await predictProcessedCanvas();
    updateCurrentPrediction(prediction);
    updateProbabilityBars(prediction.probabilities);
    updateStability(prediction, processed);
  } catch (error) {
    // Solo se registra en consola; no se muestra al usuario para no ensuciar la interfaz.
    console.error(error);
  } finally {
    app.predicting = false;
  }
}

function processCurrentFrame() {
  const videoWidth = ui.video.videoWidth;
  const videoHeight = ui.video.videoHeight;

  if (!videoWidth || !videoHeight) {
    return {
      ok: false,
      state: "warning",
      message: "Esperando imagen de la camara.",
      summary: "Esperando camara."
    };
  }

  const capture = ui.captureCanvas;
  capture.width = videoWidth;
  capture.height = videoHeight;
  const captureCtx = capture.getContext("2d", { willReadFrequently: true });
  captureCtx.drawImage(ui.video, 0, 0, videoWidth, videoHeight);

  let src = null;
  let roi = null;
  let rgb = null;
  let hsv = null;
  let maskA = null;
  let maskB = null;
  let mask = null;
  let lowerSkinA = null;
  let upperSkinA = null;
  let lowerSkinB = null;
  let upperSkinB = null;
  let kernel = null;
  let contours = null;
  let hierarchy = null;
  let cropRgb = null;
  let cropMask = null;
  let cleaned = null;
  let resized = null;

  try {
    src = cv.imread(capture);
    const side = Math.round(Math.min(videoWidth, videoHeight) * 0.72);
    const rect = new cv.Rect(
      Math.max(0, Math.round((videoWidth - side) / 2)),
      Math.max(0, Math.round((videoHeight - side) / 2)),
      Math.min(side, videoWidth),
      Math.min(side, videoHeight)
    );

    roi = src.roi(rect);
    rgb = new cv.Mat();
    cv.cvtColor(roi, rgb, cv.COLOR_RGBA2RGB);

    hsv = new cv.Mat();
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);

    maskA = new cv.Mat();
    maskB = new cv.Mat();
    mask = new cv.Mat();
    lowerSkinA = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 18, 35, 0]);
    upperSkinA = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [32, 210, 255, 255]);
    lowerSkinB = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [155, 12, 35, 0]);
    upperSkinB = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [179, 190, 255, 255]);
    cv.inRange(hsv, lowerSkinA, upperSkinA, maskA);
    cv.inRange(hsv, lowerSkinB, upperSkinB, maskB);
    cv.bitwise_or(maskA, maskB, mask);

    kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(7, 7));
    cv.morphologyEx(mask, mask, cv.MORPH_OPEN, kernel);
    cv.morphologyEx(mask, mask, cv.MORPH_CLOSE, kernel);
    cv.GaussianBlur(mask, mask, new cv.Size(5, 5), 0);

    const coverage = cv.countNonZero(mask) / (mask.rows * mask.cols);
    const mean = cv.mean(rgb);
    const brightness = Math.round((mean[0] + mean[1] + mean[2]) / 3);
    const handRect = USE_SEGMENTATION ? findHandRect(mask) : null;

    if (handRect) {
      const padded = padRect(handRect, rgb.cols, rgb.rows, 0.42);
      cropRgb = rgb.roi(padded);
      cropMask = mask.roi(padded);
      cleaned = new cv.Mat(cropRgb.rows, cropRgb.cols, cropRgb.type(), [245, 245, 245, 255]);
      cropRgb.copyTo(cleaned, cropMask);
    } else {
      const fallback = squareCenterRect(rgb.cols, rgb.rows, 0.82);
      cropRgb = rgb.roi(fallback);
      cleaned = new cv.Mat();
      cropRgb.copyTo(cleaned);
    }

    resized = new cv.Mat();
    cv.resize(cleaned, resized, new cv.Size(INPUT_SIZE, INPUT_SIZE), 0, 0, cv.INTER_AREA);
    cv.imshow(ui.processedCanvas, resized);

    const coverageText = `${(coverage * 100).toFixed(1)}%`;
    let summary;
    if (!USE_SEGMENTATION) {
      summary = `Modo bypass: recorte crudo del centro redimensionado a 64x64 (sin quitar fondo). Brillo: ${brightness}.`;
    } else {
      summary = handRect
        ? `Fondo removido con OpenCV. Mano recortada y redimensionada a 64x64. Cobertura: ${coverageText}. Brillo: ${brightness}.`
        : `Sin contorno confiable; no se envia prediccion estable. Cobertura: ${coverageText}. Brillo: ${brightness}.`;
    }

    if (brightness < 35) {
      summary += " Mejora la iluminacion.";
    }

    return {
      ok: true,
      // en modo bypass no dependemos de detectar la mano: siempre mandamos el recorte crudo
      hasHand: USE_SEGMENTATION ? Boolean(handRect) : true,
      coverage,
      brightness,
      summary
    };
  } finally {
    [src, roi, rgb, hsv, maskA, maskB, mask, lowerSkinA, upperSkinA, lowerSkinB, upperSkinB, kernel, contours, hierarchy, cropRgb, cropMask, cleaned, resized]
      .forEach((mat) => {
        if (mat) mat.delete();
      });
  }
}

function findHandRect(mask) {
  let contours = null;
  let hierarchy = null;
  try {
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let left = mask.cols;
    let top = mask.rows;
    let right = 0;
    let bottom = 0;
    let totalArea = 0;
    const minArea = mask.rows * mask.cols * 0.0012;

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      const rect = cv.boundingRect(contour);
      const centerY = rect.y + rect.height / 2;
      const centerX = rect.x + rect.width / 2;
      const isLikelyHand =
        area >= minArea &&
        centerY > mask.rows * 0.22 &&
        centerX > mask.cols * 0.08 &&
        centerX < mask.cols * 0.92;

      if (isLikelyHand) {
        left = Math.min(left, rect.x);
        top = Math.min(top, rect.y);
        right = Math.max(right, rect.x + rect.width);
        bottom = Math.max(bottom, rect.y + rect.height);
        totalArea += area;
      }
      contour.delete();
    }

    if (!totalArea || right <= left || bottom <= top) {
      return null;
    }

    const width = right - left;
    const height = bottom - top;
    if (width < mask.cols * 0.08 || height < mask.rows * 0.12) {
      return null;
    }

    return new cv.Rect(left, top, width, height);
  } finally {
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }
}

function padRect(rect, width, height, factor) {
  const pad = Math.round(Math.max(rect.width, rect.height) * factor);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const side = Math.min(Math.max(rect.width, rect.height) + pad * 2, Math.min(width, height));
  const x = Math.max(0, Math.min(width - side, Math.round(cx - side / 2)));
  const y = Math.max(0, Math.min(height - side, Math.round(cy - side / 2)));
  return new cv.Rect(x, y, Math.max(1, side), Math.max(1, side));
}

function squareCenterRect(width, height, factor) {
  const side = Math.round(Math.min(width, height) * factor);
  const x = Math.max(0, Math.round((width - side) / 2));
  const y = Math.max(0, Math.round((height - side) / 2));
  return new cv.Rect(x, y, Math.max(1, side), Math.max(1, side));
}

async function predictProcessedCanvas() {
  const input = tf.tidy(() => (
    tf.browser.fromPixels(ui.processedCanvas, 3)
      .toFloat()
      .div(255)
      .reshape([1, INPUT_SIZE, INPUT_SIZE, 3])
  ));

  const output = app.model.predict(input);
  let probabilities;
  if (USE_FLIP_TTA) {
    const flippedOutput = tf.tidy(() => {
      const flipped = tf.image.flipLeftRight(input);
      return app.model.predict(flipped);
    });
    const averaged = tf.tidy(() => output.add(flippedOutput).div(2));
    probabilities = Array.from(await averaged.data());
    flippedOutput.dispose();
    averaged.dispose();
  } else {
    probabilities = Array.from(await output.data());
  }
  input.dispose();
  output.dispose();

  const ranked = probabilities
    .map((confidence, index) => ({ classIndex: index, confidence }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    digit: CLASSES[ranked[0].classIndex],
    confidence: ranked[0].confidence,
    secondDigit: CLASSES[ranked[1].classIndex],
    secondConfidence: ranked[1].confidence,
    margin: ranked[0].confidence - ranked[1].confidence,
    probabilities
  };
}

function updateCurrentPrediction(prediction) {
  app.currentDigit = prediction.digit;
  ui.currentPrediction.textContent = prediction.digit;
  ui.currentConfidence.textContent = `Confianza: ${(prediction.confidence * 100).toFixed(2)}%`;
}

function resetCurrentPrediction() {
  app.currentDigit = null;
  ui.currentPrediction.textContent = "--";
  ui.currentConfidence.textContent = "Confianza: --";
  ui.confirmedConfidence.textContent = "Sin confirmacion estable.";
  updateCalculatorButtons();
}

function updateProbabilityBars(probabilities) {
  app.probabilities = probabilities;
  probabilities.forEach((value, index) => {
    const label = CLASSES[index];
    const fill = document.querySelector(`[data-prob="${label}"]`);
    const text = document.querySelector(`[data-prob-label="${label}"]`);
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, value * 100))}%`;
    if (text) text.textContent = `${(value * 100).toFixed(1)}%`;
  });
}

function updateStability(prediction, processed) {
  app.predictionHistory.push(prediction);
  if (app.predictionHistory.length > HISTORY_SIZE) {
    app.predictionHistory.shift();
  }

  if (!processed.hasHand) {
    app.predictionHistory = [];
    ui.confirmedConfidence.textContent = "No se detecta una mano.";
    setVisualState("error", "No se detecta una mano.");
    return;
  }

  if (processed.brightness < 35) {
    ui.confirmedConfidence.textContent = "Mejora la iluminacion.";
    setVisualState("warning", "Mejora la iluminacion.");
    return;
  }

  if (prediction.confidence < MIN_CONFIDENCE) {
    ui.confirmedConfidence.textContent = "Prediccion poco clara.";
    setVisualState("unstable", "Prediccion poco clara.");
    return;
  }

  if (prediction.margin < MIN_MARGIN) {
    ui.confirmedConfidence.textContent = "Ajusta ligeramente la posicion.";
    setVisualState("unstable", "Ajusta ligeramente la posicion.");
    return;
  }

  const counts = app.predictionHistory.reduce((acc, item) => {
    acc[item.digit] = (acc[item.digit] || 0) + 1;
    return acc;
  }, {});
  const repeats = counts[prediction.digit] || 0;

  if (app.predictionHistory.length < HISTORY_SIZE || repeats < MIN_REPEATS) {
    ui.confirmedConfidence.textContent = "Mantente un momento quieto.";
    setVisualState("unstable", "Mantente un momento quieto.");
    return;
  }

  const now = Date.now();
  const changed = app.confirmedDigit !== prediction.digit;
  const cooldownPassed = now - app.lastConfirmedAt > 900;

  if (changed || cooldownPassed) {
    app.confirmedDigit = prediction.digit;
    app.lastConfirmedAt = now;
    ui.confirmedConfidence.textContent = `Digito ${prediction.digit} confirmado.`;
    setVisualState("success", `Digito ${prediction.digit} detectado correctamente.`);
    updateCalculatorButtons();
  }
}

function updateCalculatorButtons() {
  const hasDigit = app.confirmedDigit !== null;
  const hasFirst = app.calculator.first !== null;
  const hasOperator = app.calculator.operator !== null;
  ui.useDigitButton.disabled = !hasDigit;
  ui.operatorButtons.forEach((button) => {
    button.disabled = !hasFirst;
  });
  ui.equalsButton.disabled = !(hasFirst && hasOperator && hasDigit);
}

function useConfirmedDigit() {
  if (app.confirmedDigit === null) {
    return;
  }

  const digit = Number(app.confirmedDigit);
  if (app.calculator.operator === null) {
    app.calculator.first = digit;
    ui.operationDisplay.textContent = String(digit);
    ui.calculatorHint.textContent = `Primer numero guardado: ${digit}`;
    setVisualState("saved", `Primer numero guardado: ${digit}.`);
  } else {
    app.calculator.second = digit;
    ui.operationDisplay.textContent = `${app.calculator.first} ${renderOperator(app.calculator.operator)} ${digit}`;
    ui.calculatorHint.textContent = `Segundo numero guardado: ${digit}`;
    setVisualState("saved", `Segundo numero guardado: ${digit}.`);
  }
  updateCalculatorButtons();
}

function handleOperator(operator) {
  if (app.calculator.first === null) {
    return;
  }

  app.calculator.operator = operator;
  app.calculator.second = null;
  app.calculator.result = null;
  ui.operationDisplay.textContent = `${app.calculator.first} ${renderOperator(operator)} --`;
  ui.calculatorHint.textContent = "Ahora confirma y usa el segundo digito.";
  setVisualState("saved", `Operacion seleccionada: ${renderOperator(operator)}.`);
  updateCalculatorButtons();
}

function handleEquals() {
  const { first, operator, second } = app.calculator;
  if (first === null || operator === null || second === null) {
    return;
  }

  if (operator === "/" && second === 0) {
    app.calculator.result = null;
    ui.operationDisplay.textContent = `${first} ${renderOperator(operator)} ${second}`;
    ui.calculatorHint.textContent = "No es posible dividir por cero";
    setVisualState("error", "No es posible dividir por cero.");
    return;
  }

  const result = calculate(first, second, operator);
  app.calculator.result = result;
  ui.operationDisplay.textContent = `${first} ${renderOperator(operator)} ${second} = ${result}`;
  ui.calculatorHint.textContent = "Operacion completada.";
  setVisualState("saved", "Operacion completada.");
  updateCalculatorButtons();
}

function resetCalculator() {
  app.calculator = {
    first: null,
    operator: null,
    second: null,
    result: null
  };
  ui.operationDisplay.textContent = "0";
  ui.calculatorHint.textContent = "Usa el digito detectado o limpia la operacion.";
  setVisualState(app.cameraReady ? "unstable" : "idle", app.cameraReady ? "Muestra un numero dentro del recuadro." : "Esperando acceso a la camara.");
  updateCalculatorButtons();
}

function calculate(first, second, operator) {
  if (operator === "+") return first + second;
  if (operator === "-") return first - second;
  if (operator === "*") return first * second;
  return Number((first / second).toFixed(4));
}

function renderOperator(operator) {
  if (operator === "*") return "x";
  if (operator === "/") return "/";
  return operator;
}

ui.cameraButton.addEventListener("click", startCamera);
ui.detectButton.addEventListener("click", runPredictionCycle);
ui.useDigitButton.addEventListener("click", useConfirmedDigit);
ui.operatorButtons.forEach((button) => {
  button.addEventListener("click", () => handleOperator(button.dataset.operator));
});
ui.equalsButton.addEventListener("click", handleEquals);
ui.clearButton.addEventListener("click", resetCalculator);

window.__signApp = app;
window.loadComponents = loadComponents;

initProbabilityRows();
setVisualState("idle", "Esperando acceso a la camara.");
updateCalculatorButtons();
loadComponents().catch((error) => console.error(error));
