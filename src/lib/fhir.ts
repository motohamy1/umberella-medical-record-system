/**
 * fhir.ts — Phase L7: HL7 FHIR Release 4 (R4) Interoperability & Mapping
 * Specification: docs/PACK.md §11 (Phase L7), HL7 FHIR R4 standard.
 *
 * Provides bidirectional mapping between Umbrella EHR entities and FHIR R4:
 * 1. Patient <-> FHIR R4 Patient
 * 2. VitalObservation <-> FHIR R4 Observation (vital-signs)
 * 3. LabResult <-> FHIR R4 Observation (laboratory)
 * 4. Medication <-> FHIR R4 MedicationRequest
 * 5. Visit <-> FHIR R4 Encounter
 * 6. Allergy <-> FHIR R4 AllergyIntolerance
 * 7. FHIR R4 Bundle (type: 'collection') Export & Import
 */

import type {
  Patient,
  VitalObservation,
  LabResult,
  Medication,
  Visit,
  Allergy,
} from '@/data/types';
import {
  getPatientById,
  getPatientVitals,
  getPatientLabs,
  getPatientMedications,
  getPatientVisits,
  getPatientAllergies,
  createPatient,
  createVital,
  createLabResult,
  createMedication,
  createVisit,
  createAllergy,
} from '@/data/repository';

export interface FHIRResource {
  resourceType: string;
  id: string;
  [key: string]: unknown;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection' | 'transaction';
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: FHIRResource;
  }>;
}

/* ========================================================================= */
/* 1. Resource Converters: Umbrella -> FHIR R4                               */
/* ========================================================================= */

export function toFHIRPatient(patient: Patient): FHIRResource {
  const [family, ...givenParts] = patient.name.split(' ').reverse();
  const given = givenParts.reverse().join(' ');

  return {
    resourceType: 'Patient',
    id: patient.id,
    identifier: [
      {
        use: 'official',
        system: 'urn:oid:umbrella:mrn',
        value: patient.mrn,
      },
    ],
    active: true,
    name: [
      {
        use: 'official',
        family: family || patient.name,
        given: given ? [given] : [patient.name],
        text: patient.name,
      },
    ],
    telecom: patient.phone
      ? [
          {
            system: 'phone',
            value: patient.phone,
            use: 'mobile',
          },
        ]
      : undefined,
    gender: patient.sex.toLowerCase() === 'female' ? 'female' : 'male',
    birthDate: patient.dateOfBirth,
    extension: [
      {
        url: 'http://umbrella.health/fhir/StructureDefinition/primary-concern',
        valueString: patient.primaryConcern,
      },
      {
        url: 'http://umbrella.health/fhir/StructureDefinition/care-plan',
        valueString: patient.carePlan,
      },
    ],
  };
}

export function toFHIRObservation(vital: VitalObservation, patientId: string): FHIRResource {
  const isPressure = vital.metric === 'pressure';
  let components = undefined;
  let valueQuantity = undefined;

  if (isPressure) {
    const parts = vital.value.split('/');
    const sys = parseInt(parts[0], 10) || 120;
    const dia = parseInt(parts[1], 10) || 80;
    components = [
      {
        code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
        valueQuantity: { value: sys, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
      {
        code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
        valueQuantity: { value: dia, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
    ];
  } else {
    valueQuantity = {
      value: parseFloat(vital.value) || 0,
      unit: vital.unit || '',
      system: 'http://unitsofmeasure.org',
    };
  }

  return {
    resourceType: 'Observation',
    id: vital.id,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: isPressure ? '85354-9' : vital.metric === 'pulse' ? '8867-4' : '2708-6',
          display: vital.metric,
        },
      ],
      text: vital.metric,
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: vital.measuredAt,
    valueQuantity,
    component: components,
  };
}

export function toFHIRLabObservation(lab: LabResult, patientId: string): FHIRResource {
  return {
    resourceType: 'Observation',
    id: lab.id,
    status: lab.reviewedBy ? 'final' : 'preliminary',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      text: lab.testName,
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: lab.occurredAt,
    valueQuantity: {
      value: parseFloat(lab.value) || 0,
      unit: lab.unit,
      system: 'http://unitsofmeasure.org',
    },
    referenceRange: lab.referenceLow !== undefined || lab.referenceHigh !== undefined
      ? [
          {
            low: lab.referenceLow !== undefined ? { value: lab.referenceLow, unit: lab.unit } : undefined,
            high: lab.referenceHigh !== undefined ? { value: lab.referenceHigh, unit: lab.unit } : undefined,
          },
        ]
      : undefined,
    interpretation: lab.status === 'abnormal' || lab.status === 'critical'
      ? [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: lab.status === 'critical' ? 'HH' : 'A',
                display: lab.status === 'critical' ? 'Critical High' : 'Abnormal',
              },
            ],
            text: lab.status,
          },
        ]
      : undefined,
  };
}

export function toFHIRMedicationRequest(med: Medication, patientId: string): FHIRResource {
  return {
    resourceType: 'MedicationRequest',
    id: med.id,
    status: med.status === 'active' ? 'active' : med.status === 'completed' ? 'completed' : 'stopped',
    intent: 'order',
    medicationCodeableConcept: {
      text: `${med.name} ${med.strength}`,
      coding: [
        {
          system: 'urn:umbrella:drug-catalog',
          display: med.name,
        },
      ],
    },
    subject: {
      reference: `Patient/${patientId}`,
    },
    authoredOn: med.startDate || new Date().toISOString(),
    dosageInstruction: [
      {
        text: med.instructions || `${med.name} ${med.strength} (${med.route})`,
        timing: {
          repeat: {
            frequency: med.dosesPerDay || 1,
            period: 1,
            periodUnit: 'd',
          },
        },
        route: {
          text: med.route,
        },
      },
    ],
  };
}

export function toFHIREncounter(visit: Visit, patientId: string): FHIRResource {
  return {
    resourceType: 'Encounter',
    id: visit.id,
    status: visit.stage === 'after' ? 'finished' : visit.stage === 'during' ? 'in-progress' : 'planned',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory',
    },
    type: [
      {
        text: visit.visitType,
      },
    ],
    subject: {
      reference: `Patient/${patientId}`,
    },
    period: {
      start: visit.occurredAt,
    },
    reasonCode: [
      {
        text: visit.reason,
      },
    ],
  };
}

export function toFHIRAllergyIntolerance(allergy: Allergy, patientId: string): FHIRResource {
  return {
    resourceType: 'AllergyIntolerance',
    id: allergy.id,
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          code: allergy.status || 'active',
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
          code: 'confirmed',
        },
      ],
    },
    criticality: allergy.severity === 'critical' || allergy.severity === 'severe' ? 'high' : 'low',
    code: {
      text: allergy.substance,
    },
    patient: {
      reference: `Patient/${patientId}`,
    },
    reaction: [
      {
        manifestation: [
          {
            text: allergy.reaction,
          },
        ],
        severity: allergy.severity,
      },
    ],
  };
}

/* ========================================================================= */
/* 2. Bundle Exporter & Importer                                             */
/* ========================================================================= */

/**
 * Export a complete patient clinical record as a FHIR R4 Bundle
 */
export async function exportPatientToFHIRBundle(patientId: string): Promise<FHIRBundle> {
  const patient = await getPatientById(patientId);
  if (!patient) {
    throw new Error(`Patient not found for FHIR export: ${patientId}`);
  }

  const [vitals, labs, meds, visits, allergies] = await Promise.all([
    getPatientVitals(patientId),
    getPatientLabs(patientId),
    getPatientMedications(patientId),
    getPatientVisits(patientId),
    getPatientAllergies(patientId),
  ]);

  const entries: Array<{ fullUrl: string; resource: FHIRResource }> = [];

  // 1. Patient
  const fhirPatient = toFHIRPatient(patient);
  entries.push({ fullUrl: `urn:uuid:${patient.id}`, resource: fhirPatient });

  // 2. Vitals
  for (const v of vitals) {
    entries.push({ fullUrl: `urn:uuid:${v.id}`, resource: toFHIRObservation(v, patient.id) });
  }

  // 3. Labs
  for (const l of labs) {
    entries.push({ fullUrl: `urn:uuid:${l.id}`, resource: toFHIRLabObservation(l, patient.id) });
  }

  // 4. Medications
  for (const m of meds) {
    entries.push({ fullUrl: `urn:uuid:${m.id}`, resource: toFHIRMedicationRequest(m, patient.id) });
  }

  // 5. Encounters
  for (const vis of visits) {
    entries.push({ fullUrl: `urn:uuid:${vis.id}`, resource: toFHIREncounter(vis, patient.id) });
  }

  // 6. Allergies
  for (const a of allergies) {
    entries.push({ fullUrl: `urn:uuid:${a.id}`, resource: toFHIRAllergyIntolerance(a, patient.id) });
  }

  return {
    resourceType: 'Bundle',
    id: `bundle-${patientId}-${Date.now()}`,
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}

/**
 * Import a FHIR R4 Bundle into Umbrella internal repository
 */
export async function importPatientFromFHIRBundle(bundle: FHIRBundle): Promise<{
  patient: Patient;
  importedCounts: {
    vitals: number;
    labs: number;
    medications: number;
    visits: number;
    allergies: number;
  };
}> {
  if (bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) {
    throw new Error('Invalid FHIR R4 bundle format.');
  }

  const patientEntry = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
  if (!patientEntry) {
    throw new Error('FHIR bundle does not contain a Patient resource.');
  }

  const fhirPt = patientEntry.resource as any;
  const patientName = fhirPt.name?.[0]?.text || `${fhirPt.name?.[0]?.given?.[0] || ''} ${fhirPt.name?.[0]?.family || ''}`.trim() || 'Imported FHIR Patient';
  const mrn = fhirPt.identifier?.find((i: any) => i.use === 'official')?.value || `MRN-FHIR-${Date.now()}`;
  const phone = fhirPt.telecom?.find((t: any) => t.system === 'phone')?.value || '+20 100 000 0000';
  const sex = fhirPt.gender === 'female' ? 'Female' : 'Male';
  const birthDate = fhirPt.birthDate || '1990-01-01';

  // Compute age from birthDate
  const age = Math.max(1, new Date().getFullYear() - new Date(birthDate).getFullYear());

  const createdPt = await createPatient({
    name: patientName,
    phone,
    sex: sex === 'Female' ? 'Female' : 'Male',
    age,
    dateOfBirth: birthDate,
    status: 'New',
    primaryConcern: 'Imported via FHIR R4 Interoperability Bundle',
    socialHistory: 'Non-smoker',
    carePlan: 'Imported clinical care protocol',
  });

  const importedCounts = {
    vitals: 0,
    labs: 0,
    medications: 0,
    visits: 0,
    allergies: 0,
  };

  for (const entry of bundle.entry) {
    const res = entry.resource as any;
    if (res.resourceType === 'Observation') {
      const category = res.category?.[0]?.coding?.[0]?.code;
      if (category === 'vital-signs') {
        const metric = res.code?.text || res.code?.coding?.[0]?.display || 'vital';
        const val = res.component
          ? `${res.component[0]?.valueQuantity?.value || 120}/${res.component[1]?.valueQuantity?.value || 80}`
          : String(res.valueQuantity?.value || 0);
        await createVital({
          patientId: createdPt.id,
          metric,
          value: val,
          unit: res.valueQuantity?.unit || (metric === 'pressure' ? 'mmHg' : ''),
          measuredAt: res.effectiveDateTime || new Date().toISOString(),
        });
        importedCounts.vitals++;
      } else {
        await createLabResult({
          patientId: createdPt.id,
          testName: res.code?.text || 'Lab Test',
          value: String(res.valueQuantity?.value || '0'),
          unit: res.valueQuantity?.unit || '',
          occurredAt: res.effectiveDateTime || new Date().toISOString(),
          status: 'normal',
        });
        importedCounts.labs++;
      }
    } else if (res.resourceType === 'MedicationRequest') {
      const name = res.medicationCodeableConcept?.text || 'Medication';
      await createMedication({
        patientId: createdPt.id,
        name,
        strength: 'Standard Dose',
        route: res.dosageInstruction?.[0]?.route?.text || 'Oral',
        dosesPerDay: res.dosageInstruction?.[0]?.timing?.repeat?.frequency || 1,
        instructions: res.dosageInstruction?.[0]?.text,
        source: 'doctor',
        createdBy: 'FHIR Import',
      });
      importedCounts.medications++;
    } else if (res.resourceType === 'Encounter') {
      await createVisit({
        patientId: createdPt.id,
        title: res.type?.[0]?.text || 'Encounter',
        visitType: res.type?.[0]?.text || 'Routine Follow-up',
        reason: res.reasonCode?.[0]?.text || 'Clinical Consultation',
        occurredAt: res.period?.start || new Date().toISOString(),
      });
      importedCounts.visits++;
    } else if (res.resourceType === 'AllergyIntolerance') {
      await createAllergy({
        patientId: createdPt.id,
        substance: res.code?.text || 'Substance',
        reaction: res.reaction?.[0]?.manifestation?.[0]?.text || 'Adverse reaction',
        severity: res.criticality === 'high' ? 'severe' : 'moderate',
      });
      importedCounts.allergies++;
    }
  }

  return {
    patient: createdPt,
    importedCounts,
  };
}
