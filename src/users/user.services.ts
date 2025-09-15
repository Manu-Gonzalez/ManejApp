import { UserWithOutPassword, UserWithDates, UserWithOutId } from "./user.types";
import { UserRepository } from "./repositories/userRepository";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "sdfsdfsdfsfd"

export default class UserService {
    constructor(private userAuth: UserRepository) {}

    async register(user: UserWithDates): Promise<UserWithOutPassword | Error> {
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(user.password, salt);
            const result = await this.userAuth.register({
                ...user,
                password: hashedPassword,
            });

            if (result instanceof Error) {
                return result;
            }
            return result

        } catch (error: any) {
            return error as Error;
        }
    }

    async getUserById(value: string): Promise<UserWithOutPassword | undefined> {
        return await this.userAuth.findUser(value);
    }

    async findByRole(role: string): Promise<UserWithOutPassword[]> {
        return await this.userAuth.findByRole(role);
    }

    async getAllUsers(): Promise<UserWithOutPassword[]> {
        return await this.userAuth.getAllUsers();
    }

    async login(user: { email: string; password: string }): Promise<{ token: string } | Error> {
        const foundUser = await this.userAuth.findByEmail(user.email);

        if (!foundUser) {
            return new Error("Usuario no encontrado");
        }

        const isPasswordValid = await bcrypt.compare(user.password, foundUser.password);
        if (!isPasswordValid) {
            return new Error("Contraseña incorrecta");
        }

        const token = jwt.sign(
            { id: foundUser.id, role: foundUser.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        return { token };
    }

    async updateRole(userId: string, role: string): Promise<UserWithOutPassword | null> {
        return await this.userAuth.updateRole(userId, role);
    }
}
