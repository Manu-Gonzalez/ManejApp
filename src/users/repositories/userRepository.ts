import { ZodEmail } from "zod";
import {UserWithOutPassword, UserWithOutPasswordAndDates, User, UserWithOutId, UserWithDates } 
from "../user.types";


export interface UserRepository {
    getAllUsers(): Promise<UserWithOutPassword[]>;
    login(user: UserWithOutId): Promise<UserWithOutPassword | undefined>;
    register(user: UserWithDates): Promise<UserWithOutPasswordAndDates | Error>;
    findUser(value: string):  Promise<UserWithOutPassword | undefined>;
    findByRole(rol: string): Promise<UserWithOutPassword[]>;
    findByEmail(email: string): Promise<User | undefined>;
    updateLastLoginAt(id: number): Promise<UserWithOutPassword | null>;
    updateRole(userId: string, role: string): Promise<UserWithOutPassword | null>;
}

// model User {
//   id             Int       @id @default(autoincrement())
//   name           String     
//   surname        String
//   email          String    @unique
//   password       String
//   dni            String    @unique
//   createdAt      DateTime  @default(now())
//   birthDate      DateTime  @db.Date
//   isActive       Boolean   @default(true)
// }

