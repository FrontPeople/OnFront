/**
 * Tests for the image input gate. Run with:  node --test tests/image-gate.test.js
 * Gemini responses are mocked so results are deterministic (no network).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  requestImageGate,
  validateAuditResult,
  parseModelJson,
  MalformedModelOutputError,
  OCR_PROMPT
} = require("../image-gate.js");

/** Build a fake fetch that returns `modelText` as Gemini's candidate text, and records the request. */
function mockGemini(modelText, { ok = true, status = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return {
      ok,
      status,
      json: async () =>
        ok
          ? { candidates: [{ content: { parts: [{ text: modelText }] } }] }
          : { error: { message: modelText } }
    };
  };
  return { fetchImpl, calls };
}

function gate(modelOutput, opts) {
  const text = typeof modelOutput === "string" ? modelOutput : JSON.stringify(modelOutput);
  const mock = mockGemini(text, opts);
  const promise = requestImageGate({
    mimeType: "image/jpeg",
    base64Data: "AAAA",
    apiKey: "test-key",
    endpoint: "https://example.test/generate",
    fetchImpl: mock.fetchImpl
  });
  return { promise, calls: mock.calls };
}

const base = {
  reason: "",
  productName: "-",
  brandName: "-",
  countryOfOrigin: "-",
  registrationNumber: "-",
  expiryDateText: "-",
  halalCertificationText: "Tidak Ada",
  rawIngredientsText: "",
  ocrConfidence: "HIGH",
  ocrNotes: ""
};

// --- The five required scenarios -------------------------------------------

test("clear ingredient label passes the gate with verbatim ingredients", async () => {
  const { promise, calls } = gate({
    ...base,
    image_type: "ingredient_label",
    confidence: 0.95,
    unreadable: false,
    ingredients_found: ["Tepung Terigu", "Minyak Nabati", "Garam", "Penguat Rasa Mononatrium Glutamat (E621)"],
    reason: "Packaging with a readable KOMPOSISI section.",
    productName: "Mie Sedaap Soto",
    rawIngredientsText: "Tepung Terigu, Minyak Nabati, Garam, Penguat Rasa Mononatrium Glutamat (E621)"
  });
  const result = await promise;
  assert.equal(result.status, "ok");
  assert.deepEqual(result.data.ingredients_found.length, 4);
  assert.match(result.data.rawIngredientsText, /E621/);
  // The image and the anti-hallucination prompt are sent to the model
  const parts = calls[0].body.contents[0].parts;
  assert.equal(parts[0].inlineData.mimeType, "image/jpeg");
  assert.equal(parts[1].text, OCR_PROMPT);
});

test("face / selfie is rejected as not_food", async () => {
  const { promise } = gate({
    ...base,
    image_type: "not_food",
    confidence: 0.98,
    unreadable: false,
    ingredients_found: [],
    reason: "A close-up photo of a person's face."
  });
  assert.equal((await promise).status, "not_food");
});

test("random object is rejected as not_food even if the model lists ingredients", async () => {
  const { promise } = gate({
    ...base,
    image_type: "not_food",
    confidence: 0.9,
    unreadable: false,
    ingredients_found: ["Sugar", "Salt"], // hallucinated - must be ignored
    reason: "A wooden desk with a laptop."
  });
  assert.equal((await promise).status, "not_food");
});

test("blurry label is rejected as unreadable", async () => {
  const { promise } = gate({
    ...base,
    image_type: "ingredient_label",
    confidence: 0.4,
    unreadable: true,
    ingredients_found: [],
    reason: "Ingredient panel visible but text is too blurry.",
    ocrConfidence: "LOW"
  });
  assert.equal((await promise).status, "unreadable");
});

test("food photo without a label is rejected as food_no_label", async () => {
  const { promise } = gate({
    ...base,
    image_type: "food_no_label",
    confidence: 0.93,
    unreadable: false,
    ingredients_found: [],
    reason: "A plate of fried rice; no packaging or ingredient list."
  });
  assert.equal((await promise).status, "food_no_label");
});

// --- Low-confidence edge cases ----------------------------------------------

test("label with low confidence is unreadable even if not flagged", async () => {
  const { promise } = gate({
    ...base,
    image_type: "ingredient_label",
    confidence: 0.5,
    unreadable: false,
    ingredients_found: ["Gula"]
  });
  assert.equal((await promise).status, "unreadable");
});

test("label with LOW ocrConfidence is unreadable", async () => {
  const { promise } = gate({
    ...base,
    image_type: "ingredient_label",
    confidence: 0.8,
    unreadable: false,
    ingredients_found: ["Gula"],
    ocrConfidence: "LOW"
  });
  assert.equal((await promise).status, "unreadable");
});

test("label with no ingredients found is unreadable", async () => {
  const { promise } = gate({
    ...base,
    image_type: "ingredient_label",
    confidence: 0.9,
    unreadable: false,
    ingredients_found: ["  "]
  });
  assert.equal((await promise).status, "unreadable");
});

// --- Malformed output is an error, never a result ---------------------------

test("non-JSON model output throws MalformedModelOutputError", async () => {
  const { promise } = gate("Sure! The ingredients are sugar and salt.");
  await assert.rejects(promise, MalformedModelOutputError);
});

test("missing image_type throws MalformedModelOutputError", async () => {
  const { promise } = gate({ ...base, confidence: 0.9, unreadable: false, ingredients_found: ["Gula"] });
  await assert.rejects(promise, MalformedModelOutputError);
});

test("unknown image_type throws MalformedModelOutputError", async () => {
  const { promise } = gate({ ...base, image_type: "maybe_food", confidence: 0.9, unreadable: false, ingredients_found: [] });
  await assert.rejects(promise, MalformedModelOutputError);
});

test("confidence as string throws MalformedModelOutputError", async () => {
  const { promise } = gate({ ...base, image_type: "not_food", confidence: "high", unreadable: false, ingredients_found: [] });
  await assert.rejects(promise, MalformedModelOutputError);
});

test("ingredients_found not an array throws MalformedModelOutputError", async () => {
  const { promise } = gate({ ...base, image_type: "ingredient_label", confidence: 0.9, unreadable: false, ingredients_found: "Gula, Garam" });
  await assert.rejects(promise, MalformedModelOutputError);
});

test("empty candidate text throws MalformedModelOutputError", async () => {
  const { promise } = gate("");
  await assert.rejects(promise, MalformedModelOutputError);
});

test("markdown-fenced JSON is still accepted", () => {
  const parsed = parseModelJson('```json\n{"a":1}\n```');
  assert.deepEqual(parsed, { a: 1 });
});

test("HTTP error from the API is propagated as a normal Error", async () => {
  const { promise } = gate("Quota exceeded", { ok: false, status: 429 });
  await assert.rejects(promise, (err) => !(err instanceof MalformedModelOutputError) && /Quota exceeded/.test(err.message));
});

// --- Step 2 audit validation (existing flow for real labels) ----------------

test("valid audit result for a real label is accepted", () => {
  const audit = {
    productName: "Mie Sedaap Soto",
    halalStatus: "HALAL",
    criticalFlaggedItems: [],
    ingredientsBreakdown: [{ name: "Tepung Terigu", eCode: "-", source: "Nabati", status: "HALAL", note: "-" }]
  };
  assert.equal(validateAuditResult(audit), audit);
});

test("audit verdict UNCERTAIN is accepted (caller must not show a verdict)", () => {
  const audit = { halalStatus: "UNCERTAIN", ingredientsBreakdown: [] };
  assert.equal(validateAuditResult(audit).halalStatus, "UNCERTAIN");
});

test("audit with invalid halalStatus throws MalformedModelOutputError", () => {
  assert.throws(() => validateAuditResult({ halalStatus: "PROBABLY_HALAL", ingredientsBreakdown: [] }), MalformedModelOutputError);
});

test("audit without ingredientsBreakdown throws MalformedModelOutputError", () => {
  assert.throws(() => validateAuditResult({ halalStatus: "HALAL" }), MalformedModelOutputError);
});

test("prompt forbids inventing ingredients", () => {
  assert.match(OCR_PROMPT, /NEVER infer, guess/);
  assert.match(OCR_PROMPT, /ONLY ingredients that are actually visible/);
});
