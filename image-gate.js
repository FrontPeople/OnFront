/**
 * HalalGuard AI - Image Input Gate
 * Classifies a photo (ingredient label / food without label / not food) and
 * validates the model's structured output BEFORE any halal audit is run.
 * DOM-free so it can be unit tested in Node (see tests/image-gate.test.js).
 */
(function (root) {
  "use strict";

  const IMAGE_TYPES = ["ingredient_label", "food_no_label", "not_food"];
  const HALAL_STATUSES = ["HALAL", "HARAM", "SYUBHAH", "UNCERTAIN"];
  const OCR_CONFIDENCES = ["HIGH", "MEDIUM", "LOW"];

  // Below this the photo is treated as unreadable and the user is asked to retake it
  const MIN_CONFIDENCE = 0.6;

  /** Thrown when the model output is missing, not JSON, or does not match the schema. */
  class MalformedModelOutputError extends Error {
    constructor(message) {
      super(message);
      this.name = "MalformedModelOutputError";
    }
  }

  const OCR_PROMPT = `You are a strict image classifier and OCR engine for a halal food checker.

STEP A - Decide what the image contains. Set "image_type" to exactly one of:
- "ingredient_label": food/drink packaging where an INGREDIENTS / KOMPOSISI / COMPOSITION / BAHAN list is visible.
- "food_no_label": food, a dish, a drink or packaging, but NO readable ingredient list is visible.
- "not_food": anything else (faces, people, selfies, animals, desks, rooms, random objects, screens, documents that are not food labels, blank, black or extremely blurry images).

STEP B - Only if "image_type" is "ingredient_label", transcribe the ingredient list VERBATIM, character by character. Do NOT paraphrase, summarize or translate.

HARD RULES - violating these is a critical failure:
- Report ONLY ingredients that are actually visible and readable in THIS image.
- NEVER infer, guess, complete or "typically contains" missing ingredients. NEVER use knowledge of the product or brand to fill gaps.
- If the ingredient text is too blurry, cut off, too small or obscured to read reliably, set "unreadable": true and leave "ingredients_found" empty.
- If "image_type" is not "ingredient_label", "ingredients_found" MUST be [] and "rawIngredientsText" MUST be "".
- For any field you cannot read, use "-" (do not invent product names, brands, countries or dates).

"confidence" is a number from 0.0 to 1.0 expressing how sure you are that the classification AND the transcription are correct.

Return STRICT JSON ONLY (no markdown, no explanation outside JSON):
{
  "image_type": "ingredient_label | food_no_label | not_food",
  "confidence": 0.0,
  "unreadable": false,
  "ingredients_found": ["each ingredient exactly as printed"],
  "reason": "One short English sentence explaining the classification",
  "productName": "Exact product name from packaging or '-'",
  "brandName": "Exact brand/manufacturer from packaging or '-'",
  "countryOfOrigin": "Exact country text from packaging or '-'",
  "registrationNumber": "License number text from packaging or '-'",
  "expiryDateText": "Exact expiry date text from packaging or '-'",
  "halalCertificationText": "Exact halal cert text/logo found or 'Tidak Ada'",
  "rawIngredientsText": "VERBATIM full KOMPOSISI/INGREDIENTS section text, or '' if none is readable",
  "ocrConfidence": "HIGH | MEDIUM | LOW",
  "ocrNotes": "Brief note if any text was unclear or partially unreadable"
}`;

  /** Strip optional markdown fences and parse; any failure is a malformed-output error. */
  function parseModelJson(rawText) {
    if (typeof rawText !== "string" || !rawText.trim()) {
      throw new MalformedModelOutputError("Respon AI kosong.");
    }
    const clean = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      throw new MalformedModelOutputError("Respon AI bukan JSON yang valid.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new MalformedModelOutputError("Respon AI bukan objek JSON.");
    }
    return parsed;
  }

  /**
   * Validate the step-1 (classification + OCR) output and decide whether the
   * image may proceed to the halal audit.
   * Returns { status: "ok" | "not_food" | "food_no_label" | "unreadable", data }.
   * Throws MalformedModelOutputError if the schema is not respected.
   */
  function validateOcrResult(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new MalformedModelOutputError("Respon AI bukan objek JSON.");
    }
    if (!IMAGE_TYPES.includes(data.image_type)) {
      throw new MalformedModelOutputError(`image_type tidak valid: ${JSON.stringify(data.image_type)}`);
    }
    if (typeof data.confidence !== "number" || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 1) {
      throw new MalformedModelOutputError(`confidence tidak valid: ${JSON.stringify(data.confidence)}`);
    }
    if (typeof data.unreadable !== "boolean") {
      throw new MalformedModelOutputError("unreadable harus boolean.");
    }
    if (!Array.isArray(data.ingredients_found) || !data.ingredients_found.every((i) => typeof i === "string")) {
      throw new MalformedModelOutputError("ingredients_found harus array string.");
    }
    if (typeof data.reason !== "string") {
      throw new MalformedModelOutputError("reason harus string.");
    }
    if (data.ocrConfidence !== undefined && !OCR_CONFIDENCES.includes(data.ocrConfidence)) {
      throw new MalformedModelOutputError(`ocrConfidence tidak valid: ${JSON.stringify(data.ocrConfidence)}`);
    }

    if (data.image_type === "not_food") return { status: "not_food", data };
    if (data.image_type === "food_no_label") return { status: "food_no_label", data };

    const ingredients = data.ingredients_found.map((i) => i.trim()).filter(Boolean);
    const rawText = typeof data.rawIngredientsText === "string" ? data.rawIngredientsText.trim() : "";
    const tooUncertain =
      data.unreadable ||
      data.confidence < MIN_CONFIDENCE ||
      data.ocrConfidence === "LOW" ||
      ingredients.length === 0;
    if (tooUncertain) return { status: "unreadable", data };

    return {
      status: "ok",
      data: { ...data, ingredients_found: ingredients, rawIngredientsText: rawText || ingredients.join(", ") }
    };
  }

  /** Validate the step-2 (halal audit) output. Throws MalformedModelOutputError on bad shape. */
  function validateAuditResult(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new MalformedModelOutputError("Respon audit bukan objek JSON.");
    }
    if (!HALAL_STATUSES.includes(data.halalStatus)) {
      throw new MalformedModelOutputError(`halalStatus tidak valid: ${JSON.stringify(data.halalStatus)}`);
    }
    if (!Array.isArray(data.ingredientsBreakdown)) {
      throw new MalformedModelOutputError("ingredientsBreakdown harus array.");
    }
    if (data.criticalFlaggedItems !== undefined && !Array.isArray(data.criticalFlaggedItems)) {
      throw new MalformedModelOutputError("criticalFlaggedItems harus array.");
    }
    return data;
  }

  /** Pull the text part out of a Gemini generateContent response body. */
  function extractGeminiText(body) {
    return body?.candidates?.[0]?.content?.parts?.[0]?.text;
  }

  /**
   * Run the classification/OCR request against Gemini and validate the result.
   * `fetchImpl` is injectable so tests can mock the API.
   */
  async function requestImageGate({ mimeType, base64Data, apiKey, endpoint, fetchImpl }) {
    const doFetch = fetchImpl || root.fetch.bind(root);
    const resp = await doFetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: OCR_PROMPT }
          ]
        }],
        generationConfig: {
          temperature: 0.05,   // Very low temp for faithful OCR
          topP: 0.9,
          maxOutputTokens: 1500,
          responseMimeType: "application/json"
        }
      })
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${resp.status}`);
    }

    const body = await resp.json();
    return validateOcrResult(parseModelJson(extractGeminiText(body)));
  }

  const api = {
    IMAGE_TYPES,
    HALAL_STATUSES,
    MIN_CONFIDENCE,
    OCR_PROMPT,
    MalformedModelOutputError,
    parseModelJson,
    validateOcrResult,
    validateAuditResult,
    extractGeminiText,
    requestImageGate
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ImageGate = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
