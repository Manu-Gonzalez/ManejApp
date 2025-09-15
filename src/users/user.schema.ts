import { z } from "zod";
import { Request, Response, NextFunction } from "express";
// Normalización de roles: acepta valores en español y mapea al enum del backend
const ROLE_ENUM = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;

const normalizeRole = (val: unknown) => {
  if (typeof val !== "string") return val;
  const key = val.trim().toUpperCase();
  const map: Record<string, string> = {
    ALUMNO: "STUDENT",
    STUDENT: "STUDENT",
    INSTRUCTOR: "INSTRUCTOR",
    ADMIN: "ADMIN",
  };
  return map[key] ?? key;
};

export const userSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    email: z.string().email("Correo electrónico inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    age: z.number().int().positive().optional(),
});

export const registerSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    surname: z.string().min(1, "El apellido es requerido"),
    email: z.email("Correo electrónico inválido"),
    dni: z.string().min(1, "El DNI es requerido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    birthDate: z.string().min(1, "La fecha de nacimiento es requerida"),
});

export const loginSchema = z.object({
    email: z.email("Correo electrónico inválido").optional(),
    dni: z.string().min(1, "El DNI es requerido").optional(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
}).refine(
    (data) => !!data.email || !!data.dni,
    { message: "Debe proporcionar un correo electrónico o un DNI", path: ["email", "dni"] }
);

export const getUserByRoleSchema = z.object({
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]),
});

export const updateRoleSchema = z.object({
  // Acepta valores en español (p.ej. "Alumno") y normaliza al enum Prisma
  role: z.preprocess(normalizeRole, z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"])),
});

export type ParamsInput = z.infer<typeof getUserByRoleSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

