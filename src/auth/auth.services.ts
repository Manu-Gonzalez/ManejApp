import bcrypt from "bcryptjs";
import { Response, Request } from "express";
import { User as UserInterface, UserWithOutPassword} from "src/users/user.types";
import SessionRepository  from "./repositories/SessionRepository"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../shared/utils/jwtUtils";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "../config/cookies";
import { UserRepository } from "src/users/repositories/userRepository";
import CustomizedError from "@shared/classes/CustomizedError";


export default class AuthService {
  constructor(
    private sessions: SessionRepository,
    private users: UserRepository,
  ) {}

  async login(req: Request, res: Response, email: string, password: string)
  : Promise<Error | {accessToken: string, user:UserWithOutPassword} > {

    const user = await this.users.findByEmail(email);
    if (!user) return new CustomizedError("Email no encontrado", 401);
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return new CustomizedError("Contraseña Incorrecta", 401);

    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const refreshToken = signRefreshToken({ id: user.id, role: user.role });

    // Guarda la sesión (hash del refresh)
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await this.sessions.create({
      userId: user.id,
      refreshHash,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      expiresAt,
    });
    // Set cookie httpOnly con el refresh token
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    await this.users.updateLastLoginAt(user.id);

    return { accessToken, user: this.stripUser(user) };
  }

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw new Error("Refresh token no encontrado");

    const payload = verifyRefreshToken(token);

    // Validar sesión en BD comparando el hash
    const allSessions = await this.sessions.findValidByUser(payload.id);
    let match = null;
    for (const s of allSessions) {
      const ok = await bcrypt.compare(token, s.refreshHash);
      if (ok) { match = s; break; }
    }
    if (!match) throw new Error("Refresh token inválido");

    const accessToken = signAccessToken({ id: payload.id, role: payload.role });

    // (Opcional) Rotación de refresh token:
    const newRefresh = signRefreshToken({ id: payload.id, role: payload.role });
    const newHash = await bcrypt.hash(newRefresh, 10);
    // Revoca la sesión anterior y crea una nueva (rotación estricta)
    await this.sessions.revokeById(match.id);
    await this.sessions.create({
      userId: payload.id,
      refreshHash: newHash,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
    res.cookie(REFRESH_COOKIE_NAME, newRefresh, refreshCookieOptions);

    return { accessToken };
  }

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      const payload = verifyRefreshToken(token);
      // Revocar la sesión que corresponda a este refresh
      const sessions = await this.sessions.findValidByUser(payload.id);
      for (const s of sessions) {
        const ok = await bcrypt.compare(token, s.refreshHash);
        if (ok) { await this.sessions.revokeById(s.id); break; }
      }
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
    return { ok: true };
  }

  async listSessions(userId: number) {
    return this.sessions.findValidByUser(userId);
  }

  async revokeSession(userId: number, sessionId: string) {
    const s = await this.sessions.findById(sessionId);
    if (!s || s.userId !== userId) throw new Error("Sesión no encontrada");
    await this.sessions.revokeById(sessionId);
    return { ok: true };
  }

  async revokeAll(userId: number) {
    await this.sessions.revokeAllByUser(userId);
    return { ok: true };
  }

  private stripUser(user: UserInterface) {
    const { password, ...rest } = user;
    return rest;
  }
}
