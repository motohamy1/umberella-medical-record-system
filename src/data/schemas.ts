import { z } from 'zod';

export const CreatePatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sex: z.enum(['Male', 'Female', 'Other']),
  age: z.coerce.number().int().min(0, 'Age must be positive').max(130, 'Invalid age'),
  dateOfBirth: z.string().min(4, 'Date of birth is required'),
  phone: z.string().min(6, 'Valid phone number is required'),
  status: z.enum(['Stable', 'New', 'Follow-up', 'Needs review', 'Critical']),
  primaryConcern: z.string().min(2, 'Primary concern is required'),
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
