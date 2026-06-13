// src/lib/validations.ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const createRequestSchema = z.object({
  studentId: z.number().int().positive('Select a student'),
  amount: z
    .number()
    .int('Amount must be a whole number')
    .min(1, 'Amount must be at least RM1')
    .max(200, 'Amount cannot exceed RM200'),
  remark: z.string().max(500, 'Remark is too long').optional(),
})

export const approveRequestSchema = z.object({
  comment: z.string().max(500).optional(),
  // Optional approval date (yyyy-mm-dd); defaults to now when omitted
  approvedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').optional(),
})

export const deleteRequestSchema = z.object({
  comment: z.string().max(500).optional(),
})

export const updateApprovedDateSchema = z.object({
  // yyyy-mm-dd from a native date input
  approvedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
})

export const studentSchema = z.object({
  icNumber: z.string().min(1, 'IC Number is required').max(50),
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
})

// ── Workday Tracking ────────────────────────────────────────────────────────

export const workdaySettingsSchema = z.object({
  workdaysPerWeek: z
    .number()
    .int('Workdays per week must be a whole number')
    .min(1, 'Workdays per week must be at least 1')
    .max(7, 'Workdays per week cannot exceed 7'),
  requiredWorkdays: z
    .number()
    .int('Required workdays must be a whole number')
    .min(0, 'Required workdays cannot be negative')
    .max(100000, 'Required workdays is too large'),
})

export const employerGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name is required')
    .max(100, 'Group name is too long'),
  cutoffDay: z
    .number()
    .int('Cutoff day must be a whole number')
    .min(1, 'Cutoff day must be between 1 and 31')
    .max(31, 'Cutoff day must be between 1 and 31'),
})

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['requester', 'approver', 'admin']),
  password: z.string().min(8),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['requester', 'approver', 'admin']).optional(),
  status: z.enum(['active', 'deactivated']).optional(),
})
