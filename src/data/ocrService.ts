import { GoogleGenAI } from '@google/genai';
/**
 * Prescription OCR Engine & Extraction Service
 * Governed by: docs/PACK.md §2.2 (D8, D9), §9.4 (Rule 12), §11 (L1)
 *
 * Rules:
 * - Patient consent required before processing (D9).
 * - Matches against Egyptian drug catalog (D8).
 * - Flags fields with confidence < 0.85 as uncertain (Rule 12: uncertain fields flagged, never guessed).
 * - Extracted fields are suggestions only until clinician verifies.
 */

import { EGYPTIAN_DRUG_CATALOG, matchEgyptianDrug } from './drugCatalog';

export interface ExtractedPrescriptionItem {
  id: string;
  rawText: string;
  medicationName: string;
  catalogMatch?: string;
  strength: string;
  route: string;
  dosesPerDay: number;
  frequency: string;
  instructions: string;
  confidence: number; // 0 to 1.0
  isUncertain: boolean; // confidence < 0.85
  verified: boolean;
}

export interface PrescriptionScanResult {
  id: string;
  patientId: string;
  imageUrl: string;
  imageFileName: string;
  scannedAt: string;
  patientConsentObtained: boolean;
  status: 'extracted' | 'verified' | 'rejected';
  items: ExtractedPrescriptionItem[];
  rawOcrText: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

export const SAMPLE_PRESCRIPTIONS = [
  {
    id: 'rx-sample-01',
    title: 'Dr. Tarek Clinic — Cairo Internal Medicine',
    fileName: 'cairo_clinic_rx_sample.jpg',
    rawText: `عيادة الدكتور طارق - القاهرة
اسم المريض: مصطفى إبراهيم
التاريخ: 18/10/2026
Rx:
1. Alkapress 10 mg tab - 1x1 صباحاً
2. Cidophage 850 mg tab - 1x2 بعد الأكل
3. Concor 5 mg tab - 1x1 بعد الإفطار`,
    items: [
      {
        id: 'rx-item-1',
        rawText: 'Alkapress 10 mg tab - 1x1 صباحاً',
        medicationName: 'Alkapress',
        catalogMatch: 'Alkapress (Amlodipine Besylate)',
        strength: '10 mg',
        route: 'Oral',
        dosesPerDay: 1,
        frequency: 'Once daily in morning',
        instructions: 'Take 1 tablet daily in the morning with water',
        confidence: 0.96,
        isUncertain: false,
        verified: false,
      },
      {
        id: 'rx-item-2',
        rawText: 'Cidophage 850 mg tab - 1x2 بعد الأكل',
        medicationName: 'Cidophage',
        catalogMatch: 'Cidophage (Metformin Hydrochloride)',
        strength: '850 mg',
        route: 'Oral',
        dosesPerDay: 2,
        frequency: 'Twice daily with meals',
        instructions: 'Take 1 tablet twice daily with food',
        confidence: 0.94,
        isUncertain: false,
        verified: false,
      },
      {
        id: 'rx-item-3',
        rawText: 'Concor 5 mg tab - 1x1 بعد الإفطار',
        medicationName: 'Concor',
        catalogMatch: 'Concor (Bisoprolol Fumarate)',
        strength: '5 mg',
        route: 'Oral',
        dosesPerDay: 1,
        frequency: 'Once daily',
        instructions: 'Take 1 tablet after breakfast',
        confidence: 0.95,
        isUncertain: false,
        verified: false,
      },
    ],
  },
  {
    id: 'rx-sample-02',
    title: 'Hospital Discharge Prescription (Handwritten & Faint)',
    fileName: 'alexandria_general_discharge.jpg',
    rawText: `Alexandria Hospital Emergency Ward
Patient: Mostafa Ibrahim
Rx:
1. Ator 20 mg - Q.H.S (before bed)
2. Micard... 40 mg (?) - Daily morning
3. Panadol Extra 500 mg - PRN for headache`,
    items: [
      {
        id: 'rx-item-4',
        rawText: 'Ator 20 mg - Q.H.S (before bed)',
        medicationName: 'Ator',
        catalogMatch: 'Ator (Atorvastatin Calcium)',
        strength: '20 mg',
        route: 'Oral',
        dosesPerDay: 1,
        frequency: 'Once daily at bedtime',
        instructions: 'Take 1 tablet at night before sleep',
        confidence: 0.92,
        isUncertain: false,
        verified: false,
      },
      {
        id: 'rx-item-5',
        rawText: 'Micard... 40 mg (?) - Daily morning',
        medicationName: 'Micardis',
        catalogMatch: 'Micardis (Telmisartan)',
        strength: '40 mg',
        route: 'Oral',
        dosesPerDay: 1,
        frequency: 'Once daily in morning',
        instructions: 'Take 1 tablet in the morning',
        confidence: 0.72, // Below 0.85 -> uncertain!
        isUncertain: true,
        verified: false,
      },
      {
        id: 'rx-item-6',
        rawText: 'Panadol Extra 500 mg - PRN for headache',
        medicationName: 'Panadol',
        catalogMatch: 'Panadol (Paracetamol)',
        strength: '500 mg',
        route: 'Oral',
        dosesPerDay: 3,
        frequency: 'Every 8 hours as needed',
        instructions: 'Take 1-2 tablets as needed for headache',
        confidence: 0.91,
        isUncertain: false,
        verified: false,
      },
    ],
  },
];

/**
 * Parse arbitrary clinical prescription text (in English or Arabic).
 * Works for ANY medication in the world. If found in the Egyptian Drug Catalog,
 * it enriches with brand/generic and standard forms; if unlisted, it keeps the exact
 * extracted medication and flags it for clinician verification (Rule 12).
 */
export function parseArbitraryPrescriptionText(rawText: string): ExtractedPrescriptionItem[] {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ExtractedPrescriptionItem[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    // Skip doctor title / clinic / header lines
    if (
      line.startsWith('عيادة') ||
      line.startsWith('اسم') ||
      line.startsWith('التاريخ') ||
      line.toLowerCase().startsWith('clinic') ||
      line.toLowerCase().startsWith('patient') ||
      line.toLowerCase().startsWith('date') ||
      line.toLowerCase() === 'rx' ||
      line.toLowerCase() === 'rx:'
    ) {
      continue;
    }

    // Strip leading numbers: "1.", "1-", "2)", etc.
    const cleanLine = line.replace(/^\d+[\.\-\)]\s*/, '').trim();
    if (!cleanLine) continue;

    // Extract dosage/strength: e.g. "10 mg", "500 mg", "1 g", "20mcg"
    const strengthMatch = cleanLine.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|%))/i);
    const strength = strengthMatch ? strengthMatch[1] : 'Standard Dose';

    // Extract medication name
    let medName = cleanLine;
    if (strengthMatch && strengthMatch.index !== undefined) {
      medName = cleanLine.slice(0, strengthMatch.index).trim();
    } else if (cleanLine.includes('-')) {
      medName = cleanLine.split('-')[0].trim();
    }

    // Remove tablet / capsule keywords if attached
    medName = medName.replace(/\b(tab|tablet|cap|capsule|amp|vial|syrup|قرص|كبسول)\b/gi, '').trim();
    if (!medName) {
      medName = cleanLine.split(' ')[0] || 'Medication';
    }

    // Extract frequency & doses per day
    let dosesPerDay = 1;
    let frequency = 'Once daily';
    if (/1x2|twice|مرتين/i.test(cleanLine)) {
      dosesPerDay = 2;
      frequency = 'Twice daily';
    } else if (/1x3|three times|3 times|مرات/i.test(cleanLine)) {
      dosesPerDay = 3;
      frequency = 'Three times daily';
    } else if (/1x4|four times/i.test(cleanLine)) {
      dosesPerDay = 4;
      frequency = 'Four times daily';
    } else if (/prn|عند اللزوم|as needed/i.test(cleanLine)) {
      dosesPerDay = 1;
      frequency = 'As needed (PRN)';
    }

    // Check Egyptian Drug Catalog match for standardization / enrichment
    const match = matchEgyptianDrug(medName);

    // If matched in catalog, attach canonical EDA generic name and higher confidence.
    // If NOT in catalog, STILL PRESERVE IT! Keep extracted name and flag as uncertain (< 0.85).
    const catalogMatch = match.matchedEntry
      ? `${match.matchedEntry.brandName} (${match.matchedEntry.genericName})`
      : undefined;

    const confidence = match.matchedEntry ? match.confidence : 0.72; // Below 0.85 -> clinician verification
    const isUncertain = confidence < 0.85;

    items.push({
      id: `rx-item-${Date.now()}-${idx + 1}`,
      rawText: line,
      medicationName: match.matchedEntry?.brandName || medName,
      catalogMatch,
      strength,
      route: match.matchedEntry?.defaultRoute || 'Oral',
      dosesPerDay,
      frequency,
      instructions: `Take ${strength} ${frequency}`,
      confidence,
      isUncertain,
      verified: false,
    });
  }

  return items;
}

/**
 * Process a prescription scan with simulated/vision OCR engine.
 * Validates Egyptian Drug Authority catalog and flags uncertain fields.
 * Handles both predefined sample scans and arbitrary custom prescription text/images.
 */

async function extractPrescriptionWithGeminiVision(
  imageDataUri: string
): Promise<{ rawOcrText: string; items: ExtractedPrescriptionItem[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured for vision OCR.');
  }

  const match = imageDataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  const mimeType = match ? match[1] : 'image/jpeg';
  const base64Data = match ? match[2] : imageDataUri;

  const ai = new GoogleGenAI({ apiKey });
  const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: unknown;

  const prompt = `You are a senior clinical pharmacist and medical OCR expert specializing in Arabic and English medical prescriptions, hospital discharge summaries, and Egyptian Drug Authority (EDA) medications.
Analyze this medical prescription image thoroughly.
Extract all medications, strengths, routes, frequencies, and instructions.
Assign a confidence score (0.0 to 1.0). If handwriting is faint or ambiguous, assign confidence < 0.85.
Return a valid JSON object matching this schema:
{
  "rawOcrText": "Transcribed text from prescription",
  "items": [
    {
      "rawText": "exact line from prescription",
      "medicationName": "Brand or generic medication name",
      "strength": "e.g. 500 mg, 10 mg",
      "route": "e.g. Oral, IV, Topical",
      "dosesPerDay": 1,
      "frequency": "e.g. Once daily, Twice daily",
      "instructions": "e.g. Take 1 tablet after meals",
      "confidence": 0.95
    }
  ]
}`;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        const rawOcrText = parsed.rawOcrText || '';
        const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

        const items: ExtractedPrescriptionItem[] = rawItems.map((it: any, idx: number) => {
          const medName = it.medicationName || it.rawText || 'Medication';
          const match = matchEgyptianDrug(medName);
          const catalogMatch = match.matchedEntry
            ? `${match.matchedEntry.brandName} (${match.matchedEntry.genericName})`
            : undefined;
          const confidence = typeof it.confidence === 'number' ? it.confidence : (match.matchedEntry ? 0.92 : 0.75);
          const isUncertain = confidence < 0.85;

          return {
            id: `rx-item-${Date.now()}-${idx + 1}`,
            rawText: it.rawText || medName,
            medicationName: match.matchedEntry?.brandName || medName,
            catalogMatch,
            strength: it.strength || 'Standard Dose',
            route: it.route || match.matchedEntry?.defaultRoute || 'Oral',
            dosesPerDay: typeof it.dosesPerDay === 'number' ? it.dosesPerDay : 1,
            frequency: it.frequency || 'Once daily',
            instructions: it.instructions || `Take ${it.strength || ''} ${it.frequency || 'as directed'}`.trim(),
            confidence,
            isUncertain,
            verified: false,
          };
        });

        return { rawOcrText, items };
      }
    } catch (err: unknown) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('Failed to process image with Gemini Vision OCR');
}

export async function processPrescriptionOCR(params: {
  patientId: string;
  sampleId?: string;
  imageDataUri?: string;
  imageFileName?: string;
  customText?: string;
  consentObtained: boolean;
}): Promise<PrescriptionScanResult> {
  if (!params.consentObtained) {
    throw new Error('Patient consent is required before processing prescription scans under Egypt PDPL Law 151/2020.');
  }

  // 1. Process real uploaded or camera captured image with Gemini Vision
  if (params.imageDataUri && params.imageDataUri.trim()) {
    try {
      const visionResult = await extractPrescriptionWithGeminiVision(params.imageDataUri);
      return {
        id: `scan-${Date.now()}`,
        patientId: params.patientId,
        imageUrl: params.imageDataUri,
        imageFileName: params.imageFileName || 'prescription_capture.jpg',
        scannedAt: new Date().toISOString(),
        patientConsentObtained: true,
        status: 'extracted',
        rawOcrText: visionResult.rawOcrText,
        items: visionResult.items,
      };
    } catch (visionError) {
      console.warn('Gemini vision OCR encountered an error, falling back to catalog parser:', visionError);
      const fallbackItems = params.customText ? parseArbitraryPrescriptionText(params.customText) : [];
      return {
        id: `scan-${Date.now()}`,
        patientId: params.patientId,
        imageUrl: params.imageDataUri,
        imageFileName: params.imageFileName || 'prescription_capture.jpg',
        scannedAt: new Date().toISOString(),
        patientConsentObtained: true,
        status: 'extracted',
        rawOcrText: params.customText || 'Image uploaded. Optical character recognition could not determine text automatically.',
        items: fallbackItems,
      };
    }
  }

  // Artificial short processing latency to simulate OCR optical pipeline
  await new Promise((resolve) => setTimeout(resolve, 350));

  if (params.customText && params.customText.trim()) {
    const parsedItems = parseArbitraryPrescriptionText(params.customText);
    return {
      id: `scan-${Date.now()}`,
      patientId: params.patientId,
      imageUrl: '/documents/prescriptions/custom_prescription.jpg',
      imageFileName: 'custom_prescription.jpg',
      scannedAt: new Date().toISOString(),
      patientConsentObtained: true,
      status: 'extracted',
      rawOcrText: params.customText,
      items: parsedItems,
    };
  }

  const sample = SAMPLE_PRESCRIPTIONS.find((s) => s.id === params.sampleId) || SAMPLE_PRESCRIPTIONS[0];

  return {
    id: `scan-${Date.now()}`,
    patientId: params.patientId,
    imageUrl: `/documents/prescriptions/${sample.fileName}`,
    imageFileName: sample.fileName,
    scannedAt: new Date().toISOString(),
    patientConsentObtained: true,
    status: 'extracted',
    rawOcrText: sample.rawText,
    items: sample.items.map((it) => ({ ...it })),
  };
}
