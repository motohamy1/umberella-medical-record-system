import { z } from 'zod';

export const CreatePatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.coerce.number().int().min(0, 'Age must be positive').max(130, 'Invalid age'),
  sex: z.enum(['Male', 'Female', 'Other']).default('Other'),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['Stable', 'New', 'Follow-up', 'Needs review', 'Critical']).default('New'),
  primaryConcern: z.string().optional(),
  socialHistory: z.string().optional(),
  carePlan: z.string().optional(),
});

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;

export const AddObservationSchema = z.object({
  patientId: z.string().min(1, 'Patient ID required'),
  metric: z.enum(['pulse', 'pressure', 'oxygen', 'temp', 'glucose', 'weight']),
  value: z.string().min(1, 'Value required'),
  unit: z.string().min(1, 'Unit required'),
});

export type AddObservationInput = z.infer<typeof AddObservationSchema>;
