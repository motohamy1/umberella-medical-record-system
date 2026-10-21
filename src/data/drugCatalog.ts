/**
 * Egyptian Drug Authority (EDA) / Egyptian Market Drug Catalog
 * Reference: docs/PACK.md §2.2 (D8), §11 (L1)
 *
 * Authoritative lookup for local brand names, active substances, standard strengths, and routes.
 */

export interface DrugCatalogEntry {
  id: string;
  brandName: string;
  genericName: string;
  category: string;
  standardStrengths: string[];
  defaultRoute: 'Oral' | 'Subcutaneous' | 'Inhalation' | 'Intravenous' | 'Topical';
  defaultFrequency: string;
  defaultDosesPerDay: number;
}

export const EGYPTIAN_DRUG_CATALOG: DrugCatalogEntry[] = [
  {
    id: 'eda-001',
    brandName: 'Alkapress',
    genericName: 'Amlodipine Besylate',
    category: 'Antihypertensive (Calcium Channel Blocker)',
    standardStrengths: ['5 mg', '10 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Once daily in morning',
    defaultDosesPerDay: 1,
  },
  {
    id: 'eda-002',
    brandName: 'Norvasc',
    genericName: 'Amlodipine Besylate',
    category: 'Antihypertensive',
    standardStrengths: ['5 mg', '10 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Once daily in morning',
    defaultDosesPerDay: 1,
  },
  {
    id: 'eda-003',
    brandName: 'Concor',
    genericName: 'Bisoprolol Fumarate',
    category: 'Beta Blocker',
    standardStrengths: ['2.5 mg', '5 mg', '10 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Once daily',
    defaultDosesPerDay: 1,
  },
  {
    id: 'eda-004',
    brandName: 'Cidophage',
    genericName: 'Metformin Hydrochloride',
    category: 'Biguanide (Antidiabetic)',
    standardStrengths: ['500 mg', '850 mg', '1000 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Twice daily with meals',
    defaultDosesPerDay: 2,
  },
  {
    id: 'eda-005',
    brandName: 'Glucophage',
    genericName: 'Metformin Hydrochloride',
    category: 'Antidiabetic',
    standardStrengths: ['500 mg', '850 mg', '1000 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Twice daily with meals',
    defaultDosesPerDay: 2,
  },
  {
    id: 'eda-006',
    brandName: 'Ator',
    genericName: 'Atorvastatin Calcium',
    category: 'Statin (Lipid-lowering)',
    standardStrengths: ['10 mg', '20 mg', '40 mg', '80 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Once daily at bedtime',
    defaultDosesPerDay: 1,
  },
  {
    id: 'eda-007',
    brandName: 'Lipitor',
    genericName: 'Atorvastatin Calcium',
    category: 'Statin',
    standardStrengths: ['10 mg', '20 mg', '40 mg', '80 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Once daily at bedtime',
    defaultDosesPerDay: 1,
  },
  {
    id: 'eda-008',
    brandName: 'Micardis',
    genericName: 'Telmisartan',
    category: 'ARB (Antihypertensive)',
    standardStrengths: ['40 mg', '80 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Once daily',
    defaultDosesPerDay: 1,
  },
  {
    id: 'eda-009',
    brandName: 'Januvia',
    genericName: 'Sitagliptin',
    category: 'DPP-4 Inhibitor (Antidiabetic)',
    standardStrengths: ['50 mg', '100 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Once daily',
    defaultDosesPerDay: 1,
  },
  {
    id: 'eda-010',
    brandName: 'Panadol',
    genericName: 'Paracetamol',
    category: 'Analgesic & Antipyretic',
    standardStrengths: ['500 mg', '1000 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Every 6 to 8 hours as needed',
    defaultDosesPerDay: 3,
  },
  {
    id: 'eda-011',
    brandName: 'Augmentin',
    genericName: 'Amoxicillin / Clavulanate',
    category: 'Penicillin Antibiotic',
    standardStrengths: ['625 mg', '1 g'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Twice daily with food',
    defaultDosesPerDay: 2,
  },
  {
    id: 'eda-012',
    brandName: 'Coversyl',
    genericName: 'Perindopril Arginine',
    category: 'ACE Inhibitor',
    standardStrengths: ['5 mg', '10 mg'],
    defaultRoute: 'Oral',
    defaultFrequency: 'Once daily in morning',
    defaultDosesPerDay: 1,
  },
];

/**
 * Match a raw extracted OCR text against Egyptian drug catalog entries.
 */
export function matchEgyptianDrug(rawText: string): {
  matchedEntry: DrugCatalogEntry | null;
  confidence: number;
} {
  const clean = rawText.toLowerCase().trim();
  if (!clean) return { matchedEntry: null, confidence: 0 };

  for (const drug of EGYPTIAN_DRUG_CATALOG) {
    const brandLower = drug.brandName.toLowerCase();
    const genericLower = drug.genericName.toLowerCase();

    // Exact matches
    if (clean.includes(brandLower) || clean.includes(genericLower)) {
      return { matchedEntry: drug, confidence: 0.96 };
    }

    // Levenshtein / Substring fuzzy check
    if (brandLower.length >= 4 && clean.slice(0, 4) === brandLower.slice(0, 4)) {
      return { matchedEntry: drug, confidence: 0.82 };
    }
  }

  return { matchedEntry: null, confidence: 0.45 };
}
