// C:\Users\thiag\Desktop\Back\ManejApp\src\users\repository\UserPrismaRepository.ts

import { UserWithDates, UserWithOutId, UserWithOutPassword, User, UserWithOutPasswordAndDates } from "../user.types";
import { UserRepository } from "./userRepository"
import { prisma } from "../../config/prismaClient";
import { error } from "console";

// Mapeo seguro de roles String -> enum literal compatible
const mapRole = (val: string): "STUDENT" | "INSTRUCTOR" | "ADMIN" => {
  const key = (val ?? "").toUpperCase().trim();
  switch (key) {
    case "STUDENT":
    case "ALUMNO":
      return "STUDENT";
    case "INSTRUCTOR":
      return "INSTRUCTOR";
    case "ADMIN":
      return "ADMIN";
    default:
      throw new Error("Rol no válido");
  }
};

export default class UserPrismaRepository implements UserRepository {

    // ... (El método register() y getAllUsers() permanecen igual, sin cambios) ...

    async register({name, surname, email, dni, password, birthDate}: UserWithDates): Promise<UserWithOutPasswordAndDates | Error> {
        // Convertimos la cadena de la fecha a un objeto Date
        const birthDateObject = new Date(birthDate);

        // Pasamos un objeto 'data' limpio y explícito para evitar conflictos.
        return await prisma.user.create({
            data: {
                name: name,
                surname: surname,
                email: email,
                dni: dni,
                password: password,
                birthDate: birthDateObject, 
                role: 'STUDENT' as any,
            },
            select: {
                id: true,
                dni: true,
                email: true,
                name: true,
                surname: true,
                birthDate: true,
                isActive: true,
                createdAt: true,
                role: true,
            }
        });
    }

    async findByEmail(email: string): Promise<User | undefined> {
        return await prisma.user.findUnique({
            where : {email}
        }) ?? undefined;
    }

    async getAllUsers(): Promise<UserWithOutPassword[]> {
        return await prisma.user.findMany({
            select: {
                id: true,
                dni: true,
                email: true,
                name: true,
                surname: true,
                role: true,
            }
        });
    }

   async findByRole(rol: string): Promise<UserWithOutPassword[]> {
    return await prisma.user.findMany({
        where: {
        role: mapRole(rol) as any,
        },
        select: {
        id: true,
        dni: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        createdAt: true,
        birthDate: true,
        isActive: true,
        },
    });
    }

    async updateLastLoginAt(userId: number): Promise<UserWithOutPassword | null> {
        const user = await prisma.user.update({
        where: { id: userId },
        data: {
            lastLoginAt: new Date(), // se actualiza con la fecha actual
        },
        });

        // Omitimos la contraseña antes de devolver
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async updateRole(userId: string, role: string): Promise<UserWithOutPassword | null> {
        const id = typeof userId === "number" ? userId : parseInt(userId, 10);

        const newRole = mapRole(role);

        // 1) Actualizar el rol del usuario
        const user = await prisma.user.update({
            where: { id },
            data: { role: { set: newRole } as any },
            select: {
                id: true,
                dni: true,
                email: true,
                name: true,
                surname: true,
                role: true,
                createdAt: true,
                birthDate: true,
                isActive: true,
            }
        });

        // 2) Si el nuevo rol es STUDENT, asegurar registro en la tabla Student
        if (newRole === "STUDENT") {
            await prisma.student.upsert({
                where: { userId: id },
                create: { userId: id },
                update: {},
            });
        }

        return user;
    }

    async findUser(value: string | number): Promise<UserWithOutPassword | undefined> {
  let whereClause;

  if (typeof value === "number" || /^\d+$/.test(value)) {
    // Si es número o string numérico, buscar por ID
    whereClause = { id: typeof value === "number" ? value : parseInt(value, 10) };
  } else {
    // Si es string no numérico, buscar por DNI o email
    whereClause = { OR: [{ dni: value }, { email: value }] };
  }

  const foundUser = await prisma.user.findFirst({
    where: whereClause,
    select: {
      id: true,
      dni: true,
      email: true,
      name: true,
      surname: true,
      role: true,
      createdAt: true,
      birthDate: true,
      isActive: true,
    },
  });

  return foundUser ?? undefined;
}


    async login(user: UserWithOutId): Promise<UserWithOutPassword | undefined> {
        const foundUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: user.email },
                    { dni: user.dni }
                ],
                AND: {
                password: user.password
                }
            }
        });

        if (!foundUser) {
            // Si no se encuentra el usuario, retornamos undefined.
            return undefined;
        }
        const passwordsMatch = foundUser.password === user.password;

        if (!passwordsMatch) {
            // Si las contraseñas no coinciden, retornamos undefined.
            return undefined;
        }

        // 3. Si el usuario existe y la contraseña es correcta, devolvemos el usuario
        // sin la contraseña para mantener la seguridad.
        return {
            id: foundUser.id,
            dni: foundUser.dni,
            email: foundUser.email,
            name: foundUser.name,
            surname: foundUser.surname,
            role: foundUser.role
        };
    }
}
