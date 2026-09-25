/**
 * HalalGuard AI - Food Halal, Origin & Expiry Inspector
 * With Dark/Light Theme Switcher & High-Precision Multimodal AI Vision
 */

// ==========================================================================
// Global API Configuration & Constants
// ==========================================================================
const GEMINI_API_KEY = "AQ.Ab8RN6JWrIpYhF1VRIu5EVr1lBjxX1l74h1qv6-MHY_1T1JSHg";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Storage Keys
const STORAGE_HISTORY_KEY = "halalguard_history_v3";
const STORAGE_API_KEY = "halalguard_custom_api_key";
const STORAGE_THEME_KEY = "halalguard_theme";

// State Management
let currentAuditResult = null;
let currentActiveApiKey = localStorage.getItem(STORAGE_API_KEY) || GEMINI_API_KEY;
let currentTheme = localStorage.getItem(STORAGE_THEME_KEY) || "dark";
let cameraStream = null;
let currentFacingMode = "environment"; // "environment" (rear) or "user" (front)
let currentCapturedImageBase64 = null;

// DOM Elements - Theme & Tabs
const themeToggleBtn = document.getElementById("btn-theme-toggle");
const tabBtnCamera = document.getElementById("tab-btn-camera");
const tabBtnManual = document.getElementById("tab-btn-manual");
const panelCamera = document.getElementById("panel-camera");
const panelManual = document.getElementById("panel-manual");

// DOM Elements - Form & Inputs
const form = document.getElementById("inspector-form");
const productNameInput = document.getElementById("product-name");
const ingredientsInput = document.getElementById("ingredients-text");
const expiryDateInput = document.getElementById("expiry-date");
const halalLabelSelect = document.getElementById("halal-label");
const btnClear = document.getElementById("btn-clear");
const formAlert = document.getElementById("form-alert");
const alertMessage = document.getElementById("alert-message");

// DOM Elements - Camera & Vision
const cameraFeedContainer = document.getElementById("camera-feed-container");
const cameraVideo = document.getElementById("camera-video");
const cameraCanvas = document.getElementById("camera-canvas");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const capturedPreviewContainer = document.getElementById("captured-preview-container");
const capturedImage = document.getElementById("captured-image");
const btnToggleCamera = document.getElementById("btn-toggle-camera");
const camToggleText = document.getElementById("cam-toggle-text");
const btnSwitchCamera = document.getElementById("btn-switch-camera");
const btnCaptureScan = document.getElementById("btn-capture-scan");
const btnRetakePhoto = document.getElementById("btn-retake-photo");
const uploadDropzone = document.getElementById("upload-dropzone");
const dropzoneTrigger = document.getElementById("dropzone-trigger");
const fileInput = document.getElementById("file-input");
const btnSampleImg1 = document.getElementById("btn-sample-img-1");

// DOM Elements - States & Results View
const stateEmpty = document.getElementById("state-empty");
const stateLoading = document.getElementById("state-loading");
const stateResults = document.getElementById("state-results");
const stateRejected = document.getElementById("state-rejected");
const loadingStepText = document.getElementById("loading-step-text");

// Results Dashboard Elements
const resProductName = document.getElementById("res-product-name");
const resTimestamp = document.getElementById("res-timestamp");
const overallStatusBanner = document.getElementById("overall-status-banner");
const bannerIconContainer = document.getElementById("banner-icon-container");
const bannerVerdictBadge = document.getElementById("banner-verdict-badge");
const bannerSafetyBadge = document.getElementById("banner-safety-badge");
const bannerOriginPill = document.getElementById("banner-origin-pill");
const bannerHeadline = document.getElementById("banner-headline");
const bannerSummary = document.getElementById("banner-summary");
const bannerThumbnailContainer = document.getElementById("banner-thumbnail-container");
const bannerThumbnailImg = document.getElementById("banner-thumbnail-img");

// Origin Identification Elements
const resOriginCountry = document.getElementById("res-origin-country");
const resOriginManufacturer = document.getElementById("res-origin-manufacturer");
const resOriginRegistration = document.getElementById("res-origin-registration");
const resOriginCategory = document.getElementById("res-origin-category");
const resOriginImplication = document.getElementById("res-origin-implication");

// Expiry Elements
const expiryStatusBadge = document.getElementById("expiry-status-badge");
const expiryStatusText = document.getElementById("expiry-status-text");
const expiryDateVal = document.getElementById("expiry-date-val");
const expiryDaysText = document.getElementById("expiry-days-text");
const expiryAdviceText = document.getElementById("expiry-advice-text");
const expiryHighlightBox = document.getElementById("expiry-highlight-box");

// Cert Elements
const certStatusBadge = document.getElementById("cert-status-badge");
const certDetailsText = document.getElementById("cert-details-text");
const certTipText = document.getElementById("cert-tip-text");

// Ingredients Elements
const flaggedContainer = document.getElementById("flagged-items-container");
const flaggedList = document.getElementById("flagged-items-list");
const ingredientsTbody = document.getElementById("ingredients-tbody");

// Guidance Elements
const adviceConsumption = document.getElementById("advice-consumption");
const adviceStorage = document.getElementById("advice-storage");

// Action Buttons
const btnCopyReport = document.getElementById("btn-copy-report");
const btnPrintReport = document.getElementById("btn-print-report");
const btnNewScan = document.getElementById("btn-new-scan");

// History Elements
const btnOpenHistory = document.getElementById("btn-open-history");
const btnCloseHistory = document.getElementById("btn-close-history");
const historyDrawer = document.getElementById("history-drawer");
const historyOverlay = document.getElementById("history-overlay");
const historyList = document.getElementById("history-list");
const historyCountBadge = document.getElementById("history-count");
const historyTotalLabel = document.getElementById("history-total-label");
const btnClearHistory = document.getElementById("btn-clear-history");

// Settings Modal Elements
const btnOpenSettings = document.getElementById("btn-open-settings");
const btnCloseSettings = document.getElementById("btn-close-settings");
const settingsModal = document.getElementById("settings-modal");
const inputApiKey = document.getElementById("input-api-key");
const btnSaveKey = document.getElementById("btn-save-key");
const btnResetKey = document.getElementById("btn-reset-key");
const btnToggleKeyVisibility = document.getElementById("btn-toggle-key-visibility");

// Toast
const toastContainer = document.getElementById("toast-container");

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTabs();
  initSampleChips();
  initDateHelpers();
  initTagQuickInsert();
  initCameraAndVision();
  initHistoryDrawer();
  initSettingsModal();
  updateHistoryUI();

  // Handle Manual Form Submission
  form.addEventListener("submit", handleManualFormSubmit);

  // Clear Button
  btnClear.addEventListener("click", () => {
    resetForm();
    showToast("Kolom input telah dibersihkan", "info");
  });

  // Action Buttons
  btnCopyReport.addEventListener("click", copyReportToClipboard);
  btnPrintReport.addEventListener("click", () => window.print());
  // Rejected-scan actions
  document.getElementById("btn-rejected-retake").addEventListener("click", () => {
    resetCameraState();
    showEmptyState();
    switchTab("camera");
  });
  document.getElementById("btn-rejected-manual").addEventListener("click", () => {
    showEmptyState();
    switchTab("manual");
  });

  btnNewScan.addEventListener("click", () => {
    resetForm();
    resetCameraState();
    showEmptyState();
    switchTab("camera");
  });
});

// ==========================================================================
// 1. Theme Management (Dark / Light Mode)
// ==========================================================================
function initTheme() {
  applyTheme(currentTheme);

  themeToggleBtn.addEventListener("click", () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
    showToast(`Tema diubah ke ${newTheme === "dark" ? "Dark Mode 🌙" : "Light Mode ☀️"}`, "info");
  });
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_THEME_KEY, theme);
}

// ==========================================================================
// 2. Tab Switcher (Camera vs Manual)
// ==========================================================================
function initTabs() {
  tabBtnCamera.addEventListener("click", () => switchTab("camera"));
  tabBtnManual.addEventListener("click", () => switchTab("manual"));
}

function switchTab(mode) {
  if (mode === "camera") {
    tabBtnCamera.classList.add("active");
    tabBtnCamera.setAttribute("aria-selected", "true");
    tabBtnManual.classList.remove("active");
    tabBtnManual.setAttribute("aria-selected", "false");
    
    panelCamera.classList.remove("hidden");
    panelManual.classList.add("hidden");
  } else {
    tabBtnManual.classList.add("active");
    tabBtnManual.setAttribute("aria-selected", "true");
    tabBtnCamera.classList.remove("active");
    tabBtnCamera.setAttribute("aria-selected", "false");
    
    panelManual.classList.remove("hidden");
    panelCamera.classList.add("hidden");
  }
}

// ==========================================================================
// 3. Camera & AI Vision Scanner Feature
// ==========================================================================
function initCameraAndVision() {
  btnToggleCamera.addEventListener("click", () => {
    if (cameraStream) {
      stopCamera();
    } else {
      startCamera();
    }
  });

  btnSwitchCamera.addEventListener("click", () => {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    if (cameraStream) {
      stopCamera();
      startCamera();
    }
  });

  // Torch / Flashlight Toggle
  const btnToggleTorch = document.getElementById("btn-toggle-torch");
  let torchActive = false;
  if (btnToggleTorch) {
    btnToggleTorch.addEventListener("click", async () => {
      if (!cameraStream) return;
      const track = cameraStream.getVideoTracks()[0];
      if (!track || !track.getCapabilities || !track.getCapabilities().torch) {
        showToast("Senter tidak tersedia di kamera ini", "error");
        return;
      }
      torchActive = !torchActive;
      try {
        await track.applyConstraints({ advanced: [{ torch: torchActive }] });
        btnToggleTorch.style.background = torchActive ? "rgba(245, 158, 11, 0.2)" : "";
        btnToggleTorch.style.borderColor = torchActive ? "rgba(245, 158, 11, 0.5)" : "";
        showToast(torchActive ? "Senter Aktif 🔦" : "Senter Mati", "info");
      } catch (e) {
        showToast("Gagal mengaktifkan senter", "error");
        torchActive = !torchActive;
      }
    });
  }

  btnCaptureScan.addEventListener("click", captureAndAnalyzePhoto);

  btnRetakePhoto.addEventListener("click", () => {
    capturedPreviewContainer.classList.add("hidden");
    currentCapturedImageBase64 = null;
    torchActive = false;
    startCamera();
  });

  dropzoneTrigger.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileUpload);

  uploadDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadDropzone.classList.add("drag-over");
  });

  uploadDropzone.addEventListener("dragleave", () => {
    uploadDropzone.classList.remove("drag-over");
  });

  uploadDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadDropzone.classList.remove("drag-over");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  });

  // Helper: load a sample image by filename and send to AI
  async function loadSampleAndAnalyze(filename, toastMsg, fallbackData) {
    showToast(toastMsg, "info");
    try {
      const response = await fetch(filename);
      if (!response.ok) throw new Error("File not found");
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target.result;
        displayCapturedImage(base64Url);
        // Make sure we are on camera tab so preview shows
        switchTab("camera");
        analyzeImageWithAI(base64Url, filename);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.warn(`Could not load ${filename}, using fallback:`, err);
      switchTab("manual");
      fillForm(fallbackData);
      triggerManualAnalysis();
    }
  }

  // Sample 1: Mie Sedaap (Halal - Indonesia)
  btnSampleImg1.addEventListener("click", () => {
    loadSampleAndAnalyze(
      "sample1.jpg",
      "🔍 Menganalisis foto kemasan Mie Sedaap dengan AI...",
      {
        productName: "Mie Sedaap Soto Jamur",
        ingredients: "Tepung Terigu, Minyak Nabati (mengandung Antioksidan TBHQ), Garam, Gula, Penguat Rasa Mononatrium Glutamat (E621), Rempah-rempah, Bubuk Jamur, Daun Bawang Kering, Pengatur Keasaman, Pewarna Alami Karamel.",
        expiryDate: "2027-12-31",
        halalLabel: "Halal Certified (BPJPH / MUI / JAKIM / IFANCA / Diakui)"
      }
    );
  });

  // Sample 2: Tonkotsu Ramen (Haram - Japan)
  const btnSampleImg2 = document.getElementById("btn-sample-img-2");
  if (btnSampleImg2) {
    btnSampleImg2.addEventListener("click", () => {
      loadSampleAndAnalyze(
        "sample2.jpg",
        "🔍 Menganalisis foto kemasan Tonkotsu Ramen dengan AI...",
        {
          productName: "Ichiraku Tonkotsu Pork Ramen",
          ingredients: "Noodles (wheat flour, salt), Pork Bone Broth, Lard, Porcine Gelatin (E441), Soy Sauce, Mirin (alcohol), Salt, Green Onion, Sesame Oil.",
          expiryDate: "2024-03-15",
          halalLabel: "No Halal Label"
        }
      );
    });
  }

  // Sample 3: Gummy Candy (Syubhah - Germany / E120 / Gelatin)
  const btnSampleImg3 = document.getElementById("btn-sample-img-3");
  if (btnSampleImg3) {
    btnSampleImg3.addEventListener("click", () => {
      const plus10 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      loadSampleAndAnalyze(
        "sample3.jpg",
        "🔍 Menganalisis foto kemasan Gummy Candy dengan AI...",
        {
          productName: "Sweet Fruits Gummy Candy",
          ingredients: "Glucose syrup, Sugar, Porcine Gelatin (E441), Citric Acid, Natural & Artificial Flavors, Carmine (E120), Fruit Juice Concentrates.",
          expiryDate: formatDateToISO(plus10),
          halalLabel: "Unknown / Not Stated"
        }
      );
    });
  }

  // Wire OCR action buttons
  const btnCopyOcrText = document.getElementById("btn-copy-ocr-text");
  if (btnCopyOcrText) {
    btnCopyOcrText.addEventListener("click", async () => {
      const ocrEl = document.getElementById("res-ocr-raw-text");
      const text = ocrEl ? ocrEl.textContent : "";
      if (!text || text === "Belum ada pemindaian foto.") {
        showToast("Belum ada teks OCR untuk disalin", "error");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast("Teks komposisi asli berhasil disalin! 📋", "success");
      } catch (e) {
        showToast("Gagal menyalin teks OCR", "error");
      }
    });
  }

  const btnEditInForm = document.getElementById("btn-edit-in-form");
  if (btnEditInForm) {
    btnEditInForm.addEventListener("click", () => {
      const ocrEl = document.getElementById("res-ocr-raw-text");
      const text = ocrEl ? ocrEl.textContent : "";
      if (!text || text === "Belum ada pemindaian foto.") {
        showToast("Belum ada teks OCR untuk diedit", "error");
        return;
      }
      switchTab("manual");
      ingredientsInput.value = text;
      ingredientsInput.focus();
      showToast("Teks komposisi OCR dimasukkan ke form manual untuk koreksi ✏️", "success");
    });
  }
}

async function startCamera() {
  try {
    const constraints = {
      video: {
        facingMode: { ideal: currentFacingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();

    cameraFeedContainer.classList.add("is-active");
    cameraPlaceholder.classList.add("hidden");
    capturedPreviewContainer.classList.add("hidden");
    btnToggleCamera.classList.add("btn-cam-active");
    camToggleText.textContent = "Matikan Kamera";
    btnSwitchCamera.classList.remove("hidden");
    btnCaptureScan.classList.remove("hidden");

    showToast("Kamera aktif! Arahkan ke kemasan produk 📸", "success");
  } catch (err) {
    console.error("Camera access error:", err);
    showToast("Tidak dapat mengakses kamera. Silakan gunakan tombol 'Unggah Foto'.", "error");
    stopCamera();
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraFeedContainer.classList.remove("is-active");
  cameraPlaceholder.classList.remove("hidden");
  btnToggleCamera.classList.remove("btn-cam-active");
  camToggleText.textContent = "Aktifkan Kamera";
  btnSwitchCamera.classList.add("hidden");
  btnCaptureScan.classList.add("hidden");
}

function resetCameraState() {
  stopCamera();
  capturedPreviewContainer.classList.add("hidden");
  currentCapturedImageBase64 = null;
}

function captureAndAnalyzePhoto() {
  if (!cameraVideo.videoWidth) {
    showToast("Video belum siap untuk diambil fotonya", "error");
    return;
  }

  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  const ctx = cameraCanvas.getContext("2d");
  ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

  const base64DataUrl = cameraCanvas.toDataURL("image/jpeg", 0.88);
  displayCapturedImage(base64DataUrl);
  stopCamera();

  analyzeImageWithAI(base64DataUrl, "Kamera Langsung");
}

function handleFileUpload(e) {
  if (e.target.files && e.target.files[0]) {
    processUploadedFile(e.target.files[0]);
  }
}

function processUploadedFile(file) {
  if (!file.type.startsWith("image/")) {
    showToast("Mohon unggah file berupa gambar (JPG, PNG, WEBP)", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64DataUrl = e.target.result;
    displayCapturedImage(base64DataUrl);
    stopCamera();
    analyzeImageWithAI(base64DataUrl, file.name);
  };
  reader.readAsDataURL(file);
}

function displayCapturedImage(base64DataUrl) {
  currentCapturedImageBase64 = base64DataUrl;
  capturedImage.src = base64DataUrl;
  capturedPreviewContainer.classList.remove("hidden");
}

// ==========================================================================
// 4. Multimodal AI Vision - OCR-First Ingredient & Origin Detection
// ==========================================================================
async function analyzeImageWithAI(base64DataUrl, sourceName = "Foto Kemasan") {
  showLoadingState();
  hideAlert();

  const stepMessages = [
    "Membaca & mentranskripsi tabel KOMPOSISI kata demi kata dari foto...",
    "Mendeteksi nama produk, merek & asal negara/pabrikan...",
    "Mengklasifikasi setiap bahan & kode E-number secara presisi...",
    "Mengevaluasi status halal, haram, syubhah & tanggal kedaluwarsa..."
  ];
  let stepIdx = 0;
  if (loadingStepText) loadingStepText.textContent = stepMessages[0];
  const stepInterval = setInterval(() => {
    stepIdx = (stepIdx + 1) % stepMessages.length;
    if (loadingStepText) loadingStepText.textContent = stepMessages[stepIdx];
  }, 950);

  try {
    const matches = base64DataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) throw new Error("Format gambar tidak valid.");
    const mimeType = matches[1];
    const base64Data = matches[2];

    const apiKey = currentActiveApiKey || GEMINI_API_KEY;

    // -----------------------------------------------------------------------
    // STEP 1: Input gate - classify the image & OCR the label (see image-gate.js)
    // Only a readable ingredient label is allowed through to the halal audit.
    // -----------------------------------------------------------------------
    if (loadingStepText) loadingStepText.textContent = "📖 Memeriksa jenis foto & membaca teks kemasan (OCR)...";

    const gate = await ImageGate.requestImageGate({
      mimeType,
      base64Data,
      apiKey,
      endpoint: GEMINI_ENDPOINT
    });

    if (gate.status !== "ok") {
      clearInterval(stepInterval);
      showScanRejected(gate.status, gate.data.reason);
      return;
    }

    const ocrParsed = gate.data;

    // -----------------------------------------------------------------------
    // STEP 2: Halal analysis pass - use the extracted OCR text for deep audit
    // -----------------------------------------------------------------------
    if (loadingStepText) loadingStepText.textContent = "🔬 Mengaudit komposisi & mendeteksi status halal...";

    const rawIngredients = ocrParsed.rawIngredientsText || "";
    const productNameOcr = ocrParsed.productName && ocrParsed.productName !== "-" ? ocrParsed.productName : "Produk Kemasan";
    const originOcr = ocrParsed.countryOfOrigin && ocrParsed.countryOfOrigin !== "-" ? ocrParsed.countryOfOrigin : "";

    const auditPrompt = `You are HalalGuard AI, an authoritative Islamic food safety auditor and halal ingredient classifier.

Here is the VERBATIM ingredients/composition text extracted via OCR from a food packaging:
---
PRODUCT NAME: ${productNameOcr}
BRAND: ${ocrParsed.brandName || '-'}
COUNTRY OF ORIGIN: ${originOcr}
REGISTRATION: ${ocrParsed.registrationNumber || '-'}
HALAL CERT FOUND: ${ocrParsed.halalCertificationText || 'Tidak Ada'}
EXPIRY DATE TEXT: ${ocrParsed.expiryDateText || '-'}

RAW INGREDIENTS (verbatim from packaging):
${rawIngredients}
---

Perform a thorough Islamic halal audit:
1. Identify Country of Origin with flag emoji.
2. Identify manufacturer company.
3. For EVERY SINGLE ingredient listed above, determine:
   - Exact name
   - E-number code if applicable
   - Origin source: "Nabati (Tumbuhan)" | "Hewani (Sapi/Babi/dll)" | "Mikrobial" | "Sintetis" | "Kimia Murni"
   - Status: "HALAL" | "HARAM" | "SYUBHAH" | "SAFE"
   - Clear Indonesian jurisprudence note
4. Detect expiry date (convert to YYYY-MM-DD).
5. Determine overall halal verdict.

Strict rules:
- Audit ONLY the ingredients listed above. NEVER add, infer or guess ingredients that are not in that list, even if the product "usually" contains them.
- "ingredientsBreakdown" must contain only ingredients from the list above.
- If the list is too incomplete, garbled or ambiguous to judge, set "halalStatus" to "UNCERTAIN" instead of guessing.

Rules:
- HARAM: Pork/babi, lard/lemak babi, porcine gelatin (E441), khamr/alcohol/wine/beer/mirin, blood/darah, non-halal slaughtered meat.
- SYUBHAH: Carmine/Karmin (E120), Mono & diglycerides (E471/E472) unknown origin, Gelatin unknown animal source, Animal rennet/pepsin, Polysorbate unknown source.
- HALAL: Nabati ingredients, MSG (E621), Citric acid (E330), Caramel (E150), certified synthetic additives.

Return STRICT JSON ONLY:
{
  "productName": "${productNameOcr}",
  "productOrigin": {
    "country": "Country with flag emoji",
    "manufacturer": "Exact manufacturer name",
    "registrationNumber": "BPOM/license or '-'",
    "category": "Product category in Indonesian",
    "originHalalImplication": "1-2 sentences about halal implications of this origin"
  },
  "rawExtractedOcrText": ${JSON.stringify(rawIngredients)},
  "extractedIngredients": "Clean comma-separated full ingredient list",
  "detectedExpiryDate": "YYYY-MM-DD or ''",
  "detectedHalalLabel": "Halal Certified (BPJPH / MUI / JAKIM / IFANCA / Diakui) | No Halal Label | Unknown / Not Stated",
  "halalStatus": "HALAL | HARAM | SYUBHAH | UNCERTAIN",
  "overallVerdictBadge": "Short verdict badge",
  "headline": "Short Indonesian verdict headline",
  "summary": "2-sentence Indonesian summary of halal status and origin",
  "criticalFlaggedItems": [],
  "ingredientsBreakdown": [
    {
      "name": "ingredient name",
      "eCode": "E-number or '-'",
      "source": "Nabati / Hewani / Mikrobial / Sintetis",
      "status": "HALAL",
      "note": "Indonesian jurisprudence note"
    }
  ],
  "halalCertAssessment": "Assessment in Indonesian",
  "certTip": "Verification tip in Indonesian",
  "consumptionGuidance": "Guidance in Indonesian",
  "storageTip": "Storage tip in Indonesian"
}`;

    const auditRequestBody = {
      contents: [{ role: "user", parts: [{ text: auditPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.85,
        maxOutputTokens: 3000,
        responseMimeType: "application/json"
      }
    };

    const auditResp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(auditRequestBody)
    });

    if (!auditResp.ok) {
      const errData = await auditResp.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${auditResp.status}`);
    }

    const auditData = await auditResp.json();
    const parsed = ImageGate.validateAuditResult(ImageGate.parseModelJson(ImageGate.extractGeminiText(auditData)));

    if (parsed.halalStatus === "UNCERTAIN") {
      clearInterval(stepInterval);
      showScanRejected("uncertain", parsed.summary);
      return;
    }

    // Merge OCR raw text into the parsed result
    parsed.rawExtractedOcrText = ocrParsed.rawIngredientsText || parsed.rawExtractedOcrText || "-";
    parsed.ocrConfidence = ocrParsed.ocrConfidence || "MEDIUM";
    parsed.ocrNotes = ocrParsed.ocrNotes || "";

    clearInterval(stepInterval);

    // Auto-fill form
    const expDate = parsed.detectedExpiryDate ||
      (ocrParsed.expiryDateText && ocrParsed.expiryDateText !== '-' ? parseExpiryText(ocrParsed.expiryDateText) : null) ||
      formatDateToISO(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

    fillForm({
      productName: parsed.productName || productNameOcr,
      ingredients: parsed.extractedIngredients || rawIngredients,
      expiryDate: expDate,
      halalLabel: parsed.detectedHalalLabel || "Unknown / Not Stated"
    });

    const expiryAssessment = evaluateExpiryDate(expDate);

    const finalReport = {
      id: "scan_" + Date.now(),
      timestamp: new Date().toLocaleString("id-ID"),
      productName: parsed.productName || productNameOcr,
      productOrigin: parsed.productOrigin || {
        country: originOcr || "Indonesia 🇮🇩",
        manufacturer: ocrParsed.brandName || "Produsen Makanan",
        registrationNumber: ocrParsed.registrationNumber || "-",
        category: "Makanan Olahan",
        originHalalImplication: "Produk teridentifikasi dari foto kemasan."
      },
      ingredients: parsed.extractedIngredients || rawIngredients,
      rawOcrText: parsed.rawExtractedOcrText,
      ocrConfidence: parsed.ocrConfidence,
      expiryDate: expDate,
      halalLabel: parsed.detectedHalalLabel || "Unknown / Not Stated",
      imageThumbnail: base64DataUrl,
      sourceType: "camera_ai",
      expiryAssessment,
      aiAnalysis: parsed
    };

    currentAuditResult = finalReport;
    saveToHistory(finalReport);
    renderResults(finalReport);

    const country = parsed.productOrigin?.country || originOcr || "kemasan";
    showToast(`✅ Berhasil mengenali "${parsed.productName}" asal ${country}!`, "success");

  } catch (error) {
    clearInterval(stepInterval);
    // Built-in demo samples keep the offline fallback; a user photo never gets a made-up result
    if (!(error instanceof ImageGate.MalformedModelOutputError) && /^sample\d\.jpg$/.test(sourceName)) {
      console.warn("Vision AI fallback triggered:", error);
      handleVisionFallback(base64DataUrl, sourceName, error);
      return;
    }
    console.error("Vision AI error:", error);
    showScanRejected("error", error.message);
  }
}

// Messages shown instead of a verdict when the photo cannot be audited
const SCAN_REJECTION_MESSAGES = {
  not_food: {
    icon: "🚫",
    title: "Ini Bukan Foto Makanan / Label Komposisi",
    text: "Foto ini sepertinya bukan makanan atau label komposisi. Silakan ambil foto daftar komposisi (ingredients) pada kemasan produk."
  },
  food_no_label: {
    icon: "🍽️",
    title: "Label Komposisi Tidak Terlihat",
    text: "Status halal/haram tidak dapat ditentukan secara andal hanya dari foto makanan atau hidangan. Silakan foto daftar komposisi (ingredients) pada kemasan produk."
  },
  unreadable: {
    icon: "🔍",
    title: "Teks Komposisi Tidak Terbaca",
    text: "Teks komposisi kurang jelas untuk dibaca. Silakan foto ulang lebih dekat, dengan pencahayaan yang lebih terang, dan pastikan gambar fokus."
  },
  uncertain: {
    icon: "❔",
    title: "Status Tidak Dapat Ditentukan",
    text: "Komposisi yang terbaca tidak cukup lengkap untuk menentukan status halal/haram. Silakan foto ulang seluruh daftar komposisi lebih dekat, dengan pencahayaan yang baik dan gambar yang fokus."
  },
  error: {
    icon: "⚠️",
    title: "Analisis Foto Gagal",
    text: "Terjadi kesalahan saat menganalisis foto, sehingga tidak ada hasil yang ditampilkan. Silakan coba lagi atau gunakan Input Manual."
  }
};

function showScanRejected(kind, detail) {
  const msg = SCAN_REJECTION_MESSAGES[kind] || SCAN_REJECTION_MESSAGES.error;
  currentAuditResult = null;
  document.getElementById("rejected-icon").textContent = msg.icon;
  document.getElementById("rejected-title").textContent = msg.title;
  document.getElementById("rejected-text").textContent = msg.text;
  const detailEl = document.getElementById("rejected-detail");
  detailEl.textContent = detail ? `Detail: ${detail}` : "";
  detailEl.classList.toggle("hidden", !detail);

  stateEmpty.classList.add("hidden");
  stateLoading.classList.add("hidden");
  stateResults.classList.add("hidden");
  stateRejected.classList.remove("hidden");
  showToast(msg.title, "error");

  if (window.innerWidth <= 1024) {
    stateRejected.scrollIntoView({ behavior: "smooth" });
  }
}

/** Try to parse various expiry date formats to YYYY-MM-DD */
function parseExpiryText(text) {
  if (!text || text === '-') return null;
  // Try ISO
  const iso = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
  // Try DD/MM/YYYY or MM/YYYY
  const dmy = text.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  // Try MM/YYYY
  const my = text.match(/(\d{1,2})[\/\.](\d{4})/);
  if (my) return `${my[2]}-${my[1].padStart(2,'0')}-01`;
  return null;
}

// Fallback for image scanning when API limit is reached
function handleVisionFallback(base64DataUrl, sourceName, error) {
  showToast(`Pemberitahuan: Menjalankan audit cerdas lokal dengan deteksi asal...`, "info");

  const isSample1 = sourceName.includes("sample1") || sourceName.includes("Mie");
  const fallbackProductName = isSample1 ? "Mie Sedaap Soto Jamur" : "Produk Makanan Kemasan";
  const fallbackOrigin = isSample1
    ? {
        country: "Indonesia 🇮🇩",
        manufacturer: "PT Wings Surya / Mie Sedaap",
        registrationNumber: "BPOM RI MD 102910298765",
        category: "Makanan Olahan / Mie Instan",
        originHalalImplication: "Diproduksi di Indonesia dengan sertifikasi Halal resmi BPJPH / MUI dan izin BPOM MD. Bahan terjamin halal sesuai regulasi syariat nasional."
      }
    : {
        country: "Indonesia 🇮🇩",
        manufacturer: "Produsen Kemasan",
        registrationNumber: "BPOM RI Terdaftar",
        category: "Makanan Olahan",
        originHalalImplication: "Produk dalam negeri dengan pengawasan pangan terstandarisasi."
      };

  const fallbackIngredients = isSample1
    ? "Tepung Terigu, Minyak Nabati (mengandung Antioksidan TBHQ), Garam, Gula, Penguat Rasa Mononatrium Glutamat (E621), Rempah-rempah, Bubuk Jamur, Daun Bawang Kering, Pengatur Keasaman, Pewarna Alami Karamel."
    : "Tepung Terigu, Gula, Garam, Minyak Nabati, Pengemulsi E471, Perisa Alami.";
  
  const expDate = "2027-12-31";
  const halalLabel = "Halal Certified (BPJPH / MUI / JAKIM / IFANCA / Diakui)";

  fillForm({
    productName: fallbackProductName,
    ingredients: fallbackIngredients,
    expiryDate: expDate,
    halalLabel: halalLabel
  });

  const expiryAssessment = evaluateExpiryDate(expDate);
  const fallbackAnalysis = performLocalFallbackAudit({
    productName: fallbackProductName,
    ingredients: fallbackIngredients,
    expiryDate: expDate,
    halalLabel: halalLabel,
    productOrigin: fallbackOrigin,
    expiryAssessment
  });

  const finalReport = {
    id: "scan_" + Date.now(),
    timestamp: new Date().toLocaleString("id-ID"),
    productName: fallbackProductName,
    productOrigin: fallbackOrigin,
    ingredients: fallbackIngredients,
    expiryDate: expDate,
    halalLabel: halalLabel,
    imageThumbnail: base64DataUrl,
    sourceType: "camera_ai",
    expiryAssessment,
    aiAnalysis: fallbackAnalysis,
    isFallback: true
  };

  currentAuditResult = finalReport;
  saveToHistory(finalReport);
  renderResults(finalReport);
}

// ==========================================================================
// 5. Manual Input Form Submission & Gemini AI Analysis
// ==========================================================================
async function handleManualFormSubmit(e) {
  e.preventDefault();

  const productName = productNameInput.value.trim();
  const ingredients = ingredientsInput.value.trim();
  const expiryDate = expiryDateInput.value.trim();
  const halalLabel = halalLabelSelect.value;

  if (!productName || !ingredients || !expiryDate) {
    showAlert("Mohon lengkapi Nama Produk, Daftar Komposisi, dan Tanggal Kedaluwarsa.");
    return;
  }

  hideAlert();
  showLoadingState();

  const stepMessages = [
    "Mendeteksi produsen & asal negara produk...",
    "Membedah seluruh komposisi & kode E-number...",
    "Mengevaluasi standar sertifikasi halal...",
    "Menghitung sisa masa simpan produk..."
  ];
  let stepIdx = 0;
  if (loadingStepText) loadingStepText.textContent = stepMessages[0];
  const stepInterval = setInterval(() => {
    stepIdx = (stepIdx + 1) % stepMessages.length;
    if (loadingStepText) {
      loadingStepText.textContent = stepMessages[stepIdx];
    }
  }, 900);

  try {
    const expiryAssessment = evaluateExpiryDate(expiryDate);

    const aiAnalysis = await callGeminiTextAnalysis({
      productName,
      ingredients,
      expiryDate,
      halalLabel,
      expiryAssessment
    });

    clearInterval(stepInterval);

    const finalReport = {
      id: "scan_" + Date.now(),
      timestamp: new Date().toLocaleString("id-ID"),
      productName,
      productOrigin: aiAnalysis.productOrigin || inferOriginFromProductName(productName),
      ingredients,
      expiryDate,
      halalLabel,
      imageThumbnail: currentCapturedImageBase64 || null,
      sourceType: "manual_text",
      expiryAssessment,
      aiAnalysis
    };

    currentAuditResult = finalReport;
    saveToHistory(finalReport);
    renderResults(finalReport);
  } catch (error) {
    clearInterval(stepInterval);
    console.error("Gemini API Error:", error);

    handleManualAnalysisError(error, {
      productName,
      ingredients,
      expiryDate,
      halalLabel
    });
  }
}

async function callGeminiTextAnalysis(payload) {
  const apiKey = currentActiveApiKey || GEMINI_API_KEY;

  const systemPrompt = `
You are HalalGuard AI, an authoritative Islamic food safety auditor, product origin detector, and high-precision ingredient evaluator.
Analyze the provided food product details thoroughly:

1. Identify product origin: Country of Origin (with flag emoji), Manufacturer/Brand, Distribution License, Product Category, and Halal Implication.
2. Decompose all ingredients with clear origin source (Nabati / Hewani / Mikrobial / Sintetis), E-codes, and Islamic jurisprudence ruling.
3. Determine Halal/Haram/Syubhah status.

Return STRICT JSON ONLY conforming to this schema in Indonesian:
{
  "productName": "${payload.productName}",
  "productOrigin": {
    "country": "Country of Origin with Flag (e.g. Indonesia 🇮🇩, Jepang 🇯🇵, Jerman 🇩🇪)",
    "manufacturer": "Manufacturer / Brand Owner Company",
    "registrationNumber": "BPOM RI MD / ML / P-IRT or license",
    "category": "Product Category (e.g. Mie Instan, Kembang Gula, Makanan Ringan)",
    "originHalalImplication": "Jurisprudential explanation regarding origin in Indonesian"
  },
  "halalStatus": "HALAL" | "HARAM" | "SYUBHAH",
  "overallVerdictBadge": "HALAL & AMAN" | "HARAM / DILARANG KONSUMSI" | "SYUBHAH / PERLU DIVERIFIKASI",
  "headline": "Judul kesimpulan singkat dalam bahasa Indonesia",
  "summary": "Ringkasan 2 kalimat dalam bahasa Indonesia menjelaskan kehalalan dan asal produk.",
  "criticalFlaggedItems": ["Daftar string bahan kritis/haram/syubhah yang terdeteksi, atau array kosong jika 100% halal"],
  "ingredientsBreakdown": [
    {
      "name": "Nama bahan atau aditif",
      "eCode": "Kode E-number jika ada, misal E120, E471, atau '-'",
      "source": "Nabati / Hewani / Mikrobial / Sintetis",
      "status": "HALAL" | "HARAM" | "SYUBHAH" | "SAFE",
      "note": "Penjelasan hukum fikih & sumber asal bahan dalam bahasa Indonesia"
    }
  ],
  "halalCertAssessment": "Evaluasi sertifikat halal dalam bahasa Indonesia",
  "certTip": "Saran verifikasi keaslian sertifikasi dalam bahasa Indonesia",
  "consumptionGuidance": "Panduan konsumsi untuk umat Muslim dalam bahasa Indonesia",
  "storageTip": "Rekomendasi penyimpanan produk makanan dalam bahasa Indonesia"
}
`;

  const userQuery = `
PRODUK YANG DIAUDIT:
- Nama Produk: ${payload.productName}
- Daftar Komposisi: ${payload.ingredients}
- Tanggal Kedaluwarsa: ${payload.expiryDate} (Status: ${payload.expiryAssessment.badge})
- Sertifikasi Halal: ${payload.halalLabel}

Analisis asal negara produk, nama produsen, bedah setiap komposisi secara tepat dan deteksi kode E-number, lalu kembalikan JSON murni.
`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          { text: userQuery }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.15,
      topP: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errMessage);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Tidak ada respon dari Gemini API.");
  }

  const cleanJson = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleanJson);
}

function inferOriginFromProductName(name) {
  const n = name.toLowerCase();
  if (n.includes("indomie") || n.includes("sedaap") || n.includes("sarimi") || n.includes("mayora") || n.includes("garuda") || n.includes("tango")) {
    return {
      country: "Indonesia 🇮🇩",
      manufacturer: "Produsen Makanan Indonesia (PT Indofood / Wings / Mayora)",
      registrationNumber: "BPOM RI MD / Terdaftar",
      category: "Makanan Olahan Kemasan",
      originHalalImplication: "Produksi dalam negeri bersertifikasi BPJPH/MUI mematuhi regulasi jaminan produk halal nasional."
    };
  } else if (n.includes("ramen") || n.includes("nissin") || n.includes("tonkotsu") || n.includes("japan") || n.includes("udon") || n.includes("sushi")) {
    return {
      country: "Jepang 🇯🇵",
      manufacturer: "Produsen Makanan Jepang (Nissin / Maruchan / Sapporo)",
      registrationNumber: "BPOM RI ML (Impor) / Tanpa BPOM",
      category: "Makanan Instan Impor Jepang",
      originHalalImplication: "Produk impor Jepang umumnya memerlukan verifikasi ketat terhadap kaldu babi (tonkotsu), mirin/alkohol, dan pengemulsi hewani."
    };
  } else if (n.includes("haribo") || n.includes("gummy") || n.includes("german") || n.includes("candy") || n.includes("trolli")) {
    return {
      country: "Jerman / Eropa 🇩🇪",
      manufacturer: "HARIBO GmbH & Co. KG / Produsen Permen Eropa",
      registrationNumber: "BPOM RI ML (Impor)",
      category: "Kembang Gula / Permen Lunak",
      originHalalImplication: "Produk kembang gula Eropa non-khusus umumnya menggunakan gelatin hewani (porcine/swine) dan pewarna karmin E120."
    };
  }
  return {
    country: "Indonesia / Internasional 🌐",
    manufacturer: "Produsen Makanan Olahan",
    registrationNumber: "BPOM RI Terdaftar / Izin Edar Resmi",
    category: "Makanan Olahan Kemasan",
    originHalalImplication: "Periksa sertifikat halal resmi dan izin edar BPOM pada kemasan fisik."
  };
}

// Fallback audit engine
function performLocalFallbackAudit(payload) {
  const ingLower = payload.ingredients.toLowerCase();
  const nameLower = payload.productName.toLowerCase();

  const haramKeywords = ["pork", "babi", "lard", "bacon", "khamr", "alkohol", "alcohol", "wine", "beer", "swine", "porcine", "darah", "blood", "mirin", "non-halal"];
  const syubhahKeywords = ["gelatin", "carmine", "karmin", "e120", "e471", "e472", "pepsin", "rennet", "cochineal", "unspecified", "source unknown", "e441", "polysorbate"];

  let hasHaram = haramKeywords.some((k) => ingLower.includes(k) || nameLower.includes(k));
  let hasSyubhah = syubhahKeywords.some((k) => ingLower.includes(k) || nameLower.includes(k));

  let halalStatus = "HALAL";
  let overallVerdictBadge = "HALAL & AMAN";
  let headline = "Produk 100% Halal & Komposisi Bersih";
  let summary = "Tidak ditemukan turunan hewani non-halal, alkohol, maupun aditif makanan yang meragukan.";

  if (hasHaram) {
    halalStatus = "HARAM";
    overallVerdictBadge = "HARAM / DILARANG KONSUMSI";
    headline = "HARAM: Terdeteksi Bahan yang Dilarang Syariat";
    summary = "Produk mengandung bahan yang secara tegas dilarang seperti turunan babi (pork/lard) atau alkohol/mirin.";
  } else if (hasSyubhah) {
    halalStatus = "SYUBHAH";
    overallVerdictBadge = "SYUBHAH / PERLU DIVERIFIKASI";
    headline = "SYUBHAH: Terdeteksi Bahan Aditif Kritis";
    summary = "Mengandung bahan dengan asal nabati/hewani yang ambigu atau kode E-number kritis (seperti E120 Karmin atau Gelatin) yang memerlukan verifikasi sertifikasi halal.";
  }

  // Tokenize ingredients
  const rawItems = payload.ingredients.split(/[,;\n]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  const flagged = [];
  const breakdown = rawItems.map((item) => {
    const itemLow = item.toLowerCase();
    let status = "HALAL";
    let eCode = "-";
    let source = "Nabati (Tumbuhan)";
    let note = "Bahan pangan nabati alami yang aman dan diperbolehkan.";

    const eMatch = item.match(/\bE\d{3,4}[a-z]?\b/i);
    if (eMatch) {
      eCode = eMatch[0].toUpperCase();
    }

    if (haramKeywords.some((k) => itemLow.includes(k))) {
      status = "HARAM";
      source = "Hewani (Babi/Non-Halal)";
      note = "Mengandung turunan hewani non-halal atau alkohol. Dilarang dalam syariat Islam.";
      flagged.push(item);
    } else if (syubhahKeywords.some((k) => itemLow.includes(k))) {
      status = "SYUBHAH";
      source = "Hewani/Nabati Kritis";
      note = "Asal sumber (nabati vs hewani) perlu diverifikasi melalui sertifikat halal resmi BPJPH/MUI.";
      flagged.push(item);
    } else if (itemLow.includes("msg") || itemLow.includes("glutamat") || eCode === "E621") {
      source = "Mikrobial / Fermentasi";
      note = "Monosodium glutamat hasil fermentasi tetes tebu halal.";
    }

    return { name: item, eCode, source, status, note };
  });

  const origin = payload.productOrigin || inferOriginFromProductName(payload.productName);

  return {
    productOrigin: origin,
    halalStatus,
    overallVerdictBadge,
    headline,
    summary,
    criticalFlaggedItems: flagged,
    ingredientsBreakdown: breakdown,
    halalCertAssessment: payload.halalLabel.includes("Halal Certified") || payload.halalLabel.includes("Tersertifikasi")
      ? "Produsen menyatakan sertifikasi Halal resmi dari otoritas yang diakui."
      : "Tidak tertera sertifikasi Halal resmi. Periksa kemasan secara teliti.",
    certTip: "Periksa logo halal fisik pada kemasan resmi (BPJPH / MUI / JAKIM / IFANCA).",
    consumptionGuidance: hasHaram
      ? "Dilarang dikonsumsi oleh umat Islam."
      : hasSyubhah
      ? "Hindari konsumsi kecuali terdapat jaminan sumber 100% nabati atau label halal terpercaya."
      : "Halal dan aman untuk dikonsumsi.",
    storageTip: "Simpan di tempat yang sejuk dan kering, hindari kelembapan dan paparan sinar matahari langsung."
  };
}

function handleManualAnalysisError(error, payload) {
  showToast(`Pemberitahuan: Menjalankan audit cerdas lokal...`, "info");

  const expiryAssessment = evaluateExpiryDate(payload.expiryDate);
  const fallbackAnalysis = performLocalFallbackAudit({ ...payload, expiryAssessment });

  const finalReport = {
    id: "scan_" + Date.now(),
    timestamp: new Date().toLocaleString("id-ID"),
    productName: payload.productName,
    productOrigin: fallbackAnalysis.productOrigin,
    ingredients: payload.ingredients,
    expiryDate: payload.expiryDate,
    halalLabel: payload.halalLabel,
    imageThumbnail: currentCapturedImageBase64 || null,
    sourceType: "manual_text",
    expiryAssessment,
    aiAnalysis: fallbackAnalysis,
    isFallback: true
  };

  currentAuditResult = finalReport;
  saveToHistory(finalReport);
  renderResults(finalReport);
}

// ==========================================================================
// 6. Expiry Date & Date Helpers
// ==========================================================================
function evaluateExpiryDate(expiryDateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expDate = new Date(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (isNaN(diffDays)) {
    return {
      status: "UNKNOWN",
      badge: "TIDAK DIKETAHUI",
      days: 0,
      daysText: "Format tanggal tidak valid.",
      advice: "Periksa tanggal kedaluwarsa yang tertera pada kemasan produk."
    };
  }

  if (diffDays < 0) {
    const daysElapsed = Math.abs(diffDays);
    return {
      status: "EXPIRED",
      badge: "🔴 SUDAH KEDALUWARSA",
      days: diffDays,
      daysText: `Kedaluwarsa ${daysElapsed} hari yang lalu.`,
      advice: "Jangan dikonsumsi! Makanan kedaluwarsa berpotensi mengandung bakteri dan racun berbahaya.",
      isExpired: true
    };
  } else if (diffDays <= 30) {
    return {
      status: "EXPIRING_SOON",
      badge: "🟡 SEGERA KEDALUWARSA",
      days: diffDays,
      daysText: `Tersisa ${diffDays} hari lagi sebelum kedaluwarsa.`,
      advice: "Konsumsi sesegera mungkin dan simpan sesuai petunjuk suhu pada kemasan.",
      isExpiringSoon: true
    };
  } else {
    return {
      status: "SAFE",
      badge: "🟢 AMAN & SEGAR",
      days: diffDays,
      daysText: `Tersisa ${diffDays} hari masa simpan aman.`,
      advice: "Produk berada dalam masa simpan yang aman. Pastikan segel kemasan tetap rapat.",
      isSafe: true
    };
  }
}

function initDateHelpers() {
  const btnExpired = document.getElementById("btn-date-expired");
  const btnSoon = document.getElementById("btn-date-soon");
  const btnSafe = document.getElementById("btn-date-safe");
  const today = new Date();

  btnExpired.addEventListener("click", () => {
    const d = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);
    expiryDateInput.value = formatDateToISO(d);
  });

  btnSoon.addEventListener("click", () => {
    const d = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    expiryDateInput.value = formatDateToISO(d);
  });

  btnSafe.addEventListener("click", () => {
    const d = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
    expiryDateInput.value = formatDateToISO(d);
  });
}

function initTagQuickInsert() {
  const tagBtns = document.querySelectorAll(".tag-btn");
  tagBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const textToInsert = btn.getAttribute("data-insert");
      if (!textToInsert) return;

      if (ingredientsInput.value.trim().length > 0) {
        ingredientsInput.value += `, ${textToInsert}`;
      } else {
        ingredientsInput.value = textToInsert;
      }
      ingredientsInput.focus();
    });
  });
}

function formatDateToISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ==========================================================================
// 7. Sample Presets (Indonesia Halal, Japan Tonkotsu Ramen, Germany Haribo Gummy)
// ==========================================================================
function initSampleChips() {
  const chip1 = document.getElementById("sample-chip-1");
  const chip2 = document.getElementById("sample-chip-2");
  const chip3 = document.getElementById("sample-chip-3");

  chip1.addEventListener("click", () => {
    switchTab("manual");
    fillForm({
      productName: "Mie Sedaap Soto Jamur (Wings Food)",
      ingredients: "Tepung Terigu, Minyak Nabati (mengandung Antioksidan TBHQ), Garam, Gula, Penguat Rasa Mononatrium Glutamat (E621), Rempah-rempah, Bubuk Jamur, Daun Bawang Kering, Pengatur Keasaman, Pewarna Alami Karamel.",
      expiryDate: "2027-12-31",
      halalLabel: "Halal Certified (BPJPH / MUI / JAKIM / IFANCA / Diakui)"
    });
    showToast("Memuat Sampel 1: Produk Asal Indonesia (Halal)", "success");
    triggerManualAnalysis();
  });

  chip2.addEventListener("click", () => {
    switchTab("manual");
    fillForm({
      productName: "Nissin Tonkotsu Pork Ramen Cup",
      ingredients: "Noodles, pork bone broth extract, lard emulsifier (E471), porcine gelatin, soy sauce, mirin (alcohol), salt, green onion.",
      expiryDate: "2024-01-15",
      halalLabel: "No Halal Label"
    });
    showToast("Memuat Sampel 2: Produk Asal Jepang (Haram - Pork Lard & Expired)", "error");
    triggerManualAnalysis();
  });

  chip3.addEventListener("click", () => {
    switchTab("manual");
    const today = new Date();
    const plus10Days = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
    fillForm({
      productName: "HARIBO Goldbären Gummy Candy",
      ingredients: "Glukosa sirup, gula, gelatin hewani (unspecified porcine/bovine), asam sitrat, pewarna merah Karmin (E120), konsentrat sari buah, perisa alami.",
      expiryDate: formatDateToISO(plus10Days),
      halalLabel: "Unknown / Not Stated"
    });
    showToast("Memuat Sampel 3: Produk Asal Jerman (Syubhah - E120 & Gelatin)", "info");
    triggerManualAnalysis();
  });
}

function fillForm(data) {
  productNameInput.value = data.productName || "";
  ingredientsInput.value = data.ingredients || "";
  expiryDateInput.value = data.expiryDate || "";
  if (data.halalLabel) halalLabelSelect.value = data.halalLabel;
  hideAlert();
}

function resetForm() {
  form.reset();
  hideAlert();
}

function triggerManualAnalysis() {
  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
}

// ==========================================================================
// 8. Results View Rendering with Origin & Precision Ingredients
// ==========================================================================
function renderResults(report) {
  const { productName, productOrigin, expiryDate, expiryAssessment, aiAnalysis, timestamp, imageThumbnail } = report;

  // 1. Header Information
  resProductName.textContent = productName;
  resTimestamp.textContent = `Diaudit pada ${timestamp}`;

  // 2. Banner Thumbnail (if scanned from camera/image)
  if (imageThumbnail) {
    bannerThumbnailImg.src = imageThumbnail;
    bannerThumbnailContainer.classList.remove("hidden");
  } else {
    bannerThumbnailContainer.classList.add("hidden");
  }

  // 3. Status Banner Logic
  const isExpired = expiryAssessment.status === "EXPIRED";
  const isExpiringSoon = expiryAssessment.status === "EXPIRING_SOON";
  const halalStatus = aiAnalysis.halalStatus; // "HALAL", "HARAM", "SYUBHAH"

  overallStatusBanner.className = "status-banner";

  let bannerClass = "banner-halal";
  let iconSvg = "";
  let verdictText = aiAnalysis.overallVerdictBadge || "HALAL & AMAN";
  let safetyText = "LAYAK KONSUMSI";
  let headlineText = aiAnalysis.headline;
  let summaryText = aiAnalysis.summary;

  // Origin pill
  const originInfo = productOrigin || aiAnalysis.productOrigin || { country: "Asal Produk Terdeteksi" };
  bannerOriginPill.textContent = originInfo.country ? `Asal: ${originInfo.country}` : "Asal Teridentifikasi";

  if (isExpired) {
    bannerClass = "banner-haram";
    verdictText = "🔴 SUDAH KEDALUWARSA";
    safetyText = "BAHAYA KESEHATAN";
    headlineText = `KEDALUWARSA: ${productName}`;
    summaryText = `Produk ini telah melewati batas kedaluwarsa pada ${expiryDate} (${expiryAssessment.daysText}). Makanan kedaluwarsa berbahaya dan tidak boleh dikonsumsi.`;
    iconSvg = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;
  } else if (halalStatus === "HARAM") {
    bannerClass = "banner-haram";
    verdictText = "🟥 HARAM / DILARANG";
    safetyText = "DILARANG KONSUMSI";
    iconSvg = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
      </svg>
    `;
  } else if (halalStatus === "SYUBHAH") {
    bannerClass = "banner-syubhah";
    verdictText = "🟨 SYUBHAH / PERLU DIVERIFIKASI";
    safetyText = isExpiringSoon ? "SEGERA KEDALUWARSA" : "VERIFIKASI SUMBER";
    iconSvg = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
  } else {
    // HALAL & SAFE
    bannerClass = "banner-halal";
    verdictText = "🟩 HALAL & AMAN";
    safetyText = isExpiringSoon ? "🟡 SEGERA KEDALUWARSA" : "🟢 100% AMAN DIKONSUMSI";
    iconSvg = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `;
  }

  overallStatusBanner.classList.add(bannerClass);
  bannerIconContainer.innerHTML = iconSvg;
  bannerVerdictBadge.textContent = verdictText;
  bannerSafetyBadge.textContent = safetyText;
  bannerHeadline.textContent = headlineText;
  bannerSummary.textContent = summaryText;

  // 4. Product Origin Card
  resOriginCountry.innerHTML = `<strong>${escapeHtml(originInfo.country || 'Indonesia 🇮🇩')}</strong>`;
  resOriginManufacturer.innerHTML = `<strong>${escapeHtml(originInfo.manufacturer || 'Produsen Resmi')}</strong>`;
  resOriginRegistration.innerHTML = `<strong>${escapeHtml(originInfo.registrationNumber || 'BPOM RI / SNI')}</strong>`;
  resOriginCategory.innerHTML = `<strong>${escapeHtml(originInfo.category || 'Makanan Olahan')}</strong>`;
  resOriginImplication.textContent = originInfo.originHalalImplication || "Produk teridentifikasi sesuai dengan regulasi dan standar otoritas terkait.";

  // 4b. OCR Raw Text Card (show verbatim ingredients extracted from photo)
  const ocrCard = document.getElementById("ocr-extracted-card");
  const ocrRawEl = document.getElementById("res-ocr-raw-text");
  const ocrBadgeEl = document.getElementById("ocr-badge-confidence");

  const rawOcr = report.rawOcrText || aiAnalysis.rawExtractedOcrText || null;
  if (ocrCard && ocrRawEl) {
    if (rawOcr && rawOcr !== "-" && report.sourceType === "camera_ai") {
      ocrCard.classList.remove("hidden");
      ocrRawEl.textContent = rawOcr;
      // Show confidence badge
      if (ocrBadgeEl) {
        const conf = report.ocrConfidence || aiAnalysis.ocrConfidence || "MEDIUM";
        const confMap = {
          HIGH: { text: "🔍 Terbaca Jelas (Akurasi Tinggi)", cls: "ocr-badge-high" },
          MEDIUM: { text: "🔍 Terbaca Sebagian (Akurasi Sedang)", cls: "ocr-badge-medium" },
          LOW: { text: "⚠️ Teks Kurang Jelas (Akurasi Rendah)", cls: "ocr-badge-low" }
        };
        const badge = confMap[conf] || confMap.MEDIUM;
        ocrBadgeEl.textContent = badge.text;
        ocrBadgeEl.className = `ocr-badge-confidence ${badge.cls}`;
      }
    } else {
      // Hide OCR card for manual-text submissions
      ocrCard.classList.add("hidden");
    }
  }

  // 5. Expiry Card
  expiryDateVal.textContent = expiryDate;
  expiryStatusText.textContent = expiryAssessment.badge;
  expiryDaysText.innerHTML = `<strong>${expiryAssessment.daysText}</strong>`;
  expiryAdviceText.textContent = expiryAssessment.advice;

  expiryHighlightBox.className = "expiry-highlight-box";
  if (isExpired) {
    expiryHighlightBox.classList.add("expiry-expired");
  } else if (isExpiringSoon) {
    expiryHighlightBox.classList.add("expiry-soon");
  } else {
    expiryHighlightBox.classList.add("expiry-safe");
  }

  // 6. Halal Certificate Card
  certStatusBadge.textContent = report.halalLabel;
  certDetailsText.textContent = aiAnalysis.halalCertAssessment || "Pemeriksaan sertifikasi halal selesai.";
  certTipText.textContent = aiAnalysis.certTip || "Selalu periksa logo resmi dan nomor izin edar BPOM/BPJPH pada kemasan.";

  // 7. Flagged Items Section
  const flagged = aiAnalysis.criticalFlaggedItems || [];
  if (flagged.length > 0) {
    flaggedContainer.classList.remove("hidden");
    flaggedList.innerHTML = flagged.map((item) => `<li><strong>${escapeHtml(item)}</strong> - titik kritis kehalalan</li>`).join("");
  } else {
    flaggedContainer.classList.add("hidden");
    flaggedList.innerHTML = "";
  }

  // 8. Ingredients Breakdown Table
  const items = aiAnalysis.ingredientsBreakdown || [];
  if (items.length > 0) {
    ingredientsTbody.innerHTML = items
      .map((item) => {
        let badgeClass = "table-badge-halal";
        let statusLabel = item.status || "HALAL";

        if (statusLabel === "HARAM") {
          badgeClass = "table-badge-haram";
        } else if (statusLabel === "SYUBHAH") {
          badgeClass = "table-badge-syubhah";
        } else if (statusLabel === "SAFE") {
          badgeClass = "table-badge-safe";
        }

        const sourceText = item.source || "Nabati / Alami";

        return `
          <tr>
            <td>
              <span class="ing-name-highlight">${escapeHtml(item.name || "-")}</span>
            </td>
            <td>
              ${item.eCode && item.eCode !== "-" ? `<span class="code-pill">${escapeHtml(item.eCode)}</span>` : '<span style="color:var(--text-muted)">—</span>'}
            </td>
            <td>
              <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">${escapeHtml(sourceText)}</span>
            </td>
            <td>
              <span class="table-badge ${badgeClass}">${escapeHtml(statusLabel)}</span>
            </td>
            <td>
              <span class="ing-note">${escapeHtml(item.note || "-")}</span>
            </td>
          </tr>
        `;
      })
      .join("");
  } else {
    ingredientsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Tidak ada rincian komposisi.</td></tr>`;
  }

  // 9. Guidance
  adviceConsumption.textContent = aiAnalysis.consumptionGuidance || "Ikuti panduan kehalalan makanan syariat Islam.";
  adviceStorage.textContent = aiAnalysis.storageTip || "Simpan di tempat kering dan sejuk terhindar dari panas berlebih.";

  showResultsView();
}

function showEmptyState() {
  stateRejected.classList.add("hidden");
  stateEmpty.classList.remove("hidden");
  stateLoading.classList.add("hidden");
  stateResults.classList.add("hidden");
}

function showLoadingState() {
  stateRejected.classList.add("hidden");
  stateEmpty.classList.add("hidden");
  stateLoading.classList.remove("hidden");
  stateResults.classList.add("hidden");
}

function showResultsView() {
  stateRejected.classList.add("hidden");
  stateEmpty.classList.add("hidden");
  stateLoading.classList.add("hidden");
  stateResults.classList.remove("hidden");

  if (window.innerWidth <= 1024) {
    stateResults.scrollIntoView({ behavior: "smooth" });
  }
}

function showAlert(msg) {
  alertMessage.textContent = msg;
  formAlert.classList.remove("alert-hidden");
}

function hideAlert() {
  formAlert.classList.add("alert-hidden");
}

// ==========================================================================
// 9. History Management (localStorage)
// ==========================================================================
function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveToHistory(report) {
  const history = getHistory();
  history.unshift(report);
  const trimmed = history.slice(0, 30);
  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Storage full");
  }
  updateHistoryUI();
}

function updateHistoryUI() {
  const history = getHistory();
  const count = history.length;

  historyCountBadge.textContent = count;
  historyTotalLabel.textContent = `${count} item tersimpan`;

  if (count === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Belum ada riwayat pemeriksaan.</p>
        <span>Produk yang diaudit akan otomatis muncul di sini.</span>
      </div>
    `;
    return;
  }

  historyList.innerHTML = history
    .map((item, idx) => {
      const isExp = item.expiryAssessment?.status === "EXPIRED";
      const status = item.aiAnalysis?.halalStatus || "HALAL";
      let badgeClass = "badge-halal";
      let badgeText = "Halal";

      if (isExp) {
        badgeClass = "badge-haram";
        badgeText = "Expired";
      } else if (status === "HARAM") {
        badgeClass = "badge-haram";
        badgeText = "Haram";
      } else if (status === "SYUBHAH") {
        badgeClass = "badge-syubhah";
        badgeText = "Syubhah";
      }

      const country = item.productOrigin?.country || "";

      return `
        <div class="history-item" data-index="${idx}">
          <div class="history-item-top">
            <span class="history-item-title">${escapeHtml(item.productName)}</span>
            <span class="sample-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="history-item-meta">
            <span>${country ? escapeHtml(country) + ' • ' : ''}Exp: ${escapeHtml(item.expiryDate)}</span>
            <span>${escapeHtml(item.timestamp.split(",")[0] || item.timestamp)}</span>
          </div>
        </div>
      `;
    })
    .join("");

  const items = historyList.querySelectorAll(".history-item");
  items.forEach((elem) => {
    elem.addEventListener("click", () => {
      const idx = parseInt(elem.getAttribute("data-index"), 10);
      const report = history[idx];
      if (report) {
        fillForm({
          productName: report.productName,
          ingredients: report.ingredients,
          expiryDate: report.expiryDate,
          halalLabel: report.halalLabel
        });
        currentAuditResult = report;
        renderResults(report);
        closeHistoryDrawer();
        showToast(`Memuat "${report.productName}" dari riwayat`, "info");
      }
    });
  });
}

function initHistoryDrawer() {
  btnOpenHistory.addEventListener("click", openHistoryDrawer);
  btnCloseHistory.addEventListener("click", closeHistoryDrawer);
  historyOverlay.addEventListener("click", closeHistoryDrawer);

  btnClearHistory.addEventListener("click", () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua riwayat pemeriksaan?")) {
      localStorage.removeItem(STORAGE_HISTORY_KEY);
      updateHistoryUI();
      showToast("Riwayat pemeriksaan berhasil dibersihkan", "info");
    }
  });
}

function openHistoryDrawer() {
  historyDrawer.classList.add("active");
  historyDrawer.setAttribute("aria-hidden", "false");
}

function closeHistoryDrawer() {
  historyDrawer.classList.remove("active");
  historyDrawer.setAttribute("aria-hidden", "true");
}

// ==========================================================================
// 10. Settings Modal (Gemini API Configuration)
// ==========================================================================
function initSettingsModal() {
  btnOpenSettings.addEventListener("click", () => {
    inputApiKey.value = currentActiveApiKey;
    settingsModal.classList.remove("hidden");
  });

  btnCloseSettings.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
  });

  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add("hidden");
    }
  });

  btnToggleKeyVisibility.addEventListener("click", () => {
    if (inputApiKey.type === "password") {
      inputApiKey.type = "text";
      btnToggleKeyVisibility.textContent = "🔒";
    } else {
      inputApiKey.type = "password";
      btnToggleKeyVisibility.textContent = "👁️";
    }
  });

  btnSaveKey.addEventListener("click", () => {
    const newKey = inputApiKey.value.trim();
    if (!newKey) {
      showToast("API Key tidak boleh kosong", "error");
      return;
    }
    currentActiveApiKey = newKey;
    localStorage.setItem(STORAGE_API_KEY, newKey);
    settingsModal.classList.add("hidden");
    showToast("Gemini API key berhasil diperbarui!", "success");
  });

  btnResetKey.addEventListener("click", () => {
    currentActiveApiKey = GEMINI_API_KEY;
    localStorage.removeItem(STORAGE_API_KEY);
    inputApiKey.value = GEMINI_API_KEY;
    showToast("Kembali ke API key bawaan", "info");
  });
}

// ==========================================================================
// 11. Utilities & Toast
// ==========================================================================
async function copyReportToClipboard() {
  if (!currentAuditResult) {
    showToast("Belum ada laporan aktif untuk disalin", "error");
    return;
  }

  const r = currentAuditResult;
  const isExp = r.expiryAssessment?.status === "EXPIRED";
  const expStatus = isExp ? "EXPIRED" : r.expiryAssessment?.badge;
  const status = r.aiAnalysis?.halalStatus || "UNKNOWN";
  const origin = r.productOrigin || {};

  const text = `
🌙 LAPORAN AUDIT HALALGUARD AI
====================================
Nama Produk: ${r.productName}
Negara Asal: ${origin.country || "N/A"}
Produsen/Pabrik: ${origin.manufacturer || "N/A"}
Kategori: ${origin.category || "N/A"}
Waktu Audit: ${r.timestamp}
Status Kehalalan: ${status}
Audit Kedaluwarsa: ${expStatus} (${r.expiryDate})
Sertifikasi: ${r.halalLabel}

Ringkasan:
${r.aiAnalysis?.summary || "N/A"}

Panduan Konsumsi:
${r.aiAnalysis?.consumptionGuidance || "N/A"}

Tips Penyimpanan:
${r.aiAnalysis?.storageTip || "N/A"}
====================================
Diaudit dengan HalalGuard AI (Gemini Vision Multimodal)
  `.trim();

  try {
    await navigator.clipboard.writeText(text);
    showToast("Ringkasan laporan berhasil disalin! 📋", "success");
  } catch (e) {
    showToast("Gagal menyalin laporan", "error");
  }
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "success" ? "toast-success" : type === "error" ? "toast-error" : ""}`;

  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "⚠️";

  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
