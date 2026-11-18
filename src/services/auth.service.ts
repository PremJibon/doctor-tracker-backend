import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUserDocument } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { LoginInput } from "../validators/auth.validator.js";
import { TokenPayload } from "../types/auth.js";

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

// Dummy hash used for constant-time comparison when email is not found
const DUMMY_HASH = "$2a$10$wT51e8083XfTjVq54XwzdeHekNnFvWvjM0i6p59z3v649l5iT12ea";

export class AuthService {
  /**
   * Authenticate admin user with email and password.
   * Defends against timing-based user enumeration.
   */
  static async login(input: LoginInput): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email }).select("+passwordHash").lean<IUserDocument>();

    const hashToCompare = user?.passwordHash || DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(input.password, hashToCompare);

    if (!user || !isPasswordValid) {
      throw ApiError.unauthenticated("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const jti = crypto.randomUUID();

    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      jti,
      iss: env.JWT_ISSUER ?? "doctor-tracker-api",
      aud: env.JWT_AUDIENCE ?? "doctor-tracker-client",
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    const refreshJti = crypto.randomUUID();
    const refreshToken = jwt.sign(
      { sub: user._id.toString(), jti: refreshJti, iss: payload.iss, aud: payload.aud },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      }
    );

    await User.findByIdAndUpdate(user._id, {
      refreshTokenJti: refreshJti,
      refreshTokenVersion: (user.refreshTokenVersion ?? 0) + 1,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Validate refresh token and issue a fresh 15-minute access token.
   * Implements refresh token rotation: each refresh invalidates the previous
   * refresh token and issues a new one, preventing replay of stolen tokens.
   */
  static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw ApiError.unauthenticated("Refresh token is required", "UNAUTHENTICATED");
    }

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    } catch {
      throw ApiError.unauthenticated("Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
    }

    if (!decoded.sub || !decoded.jti) {
      throw ApiError.unauthenticated("Malformed refresh token", "INVALID_REFRESH_TOKEN");
    }

    const user = await User.findById(decoded.sub).lean<IUserDocument>();
    if (!user) {
      throw ApiError.unauthenticated("User account no longer exists", "UNAUTHENTICATED");
    }

    // Revocation check: the refresh token's JTI must match the stored JTI.
    // Any mismatch means the token was already rotated (replay attack) or revoked.
    if (user.refreshTokenJti !== decoded.jti) {
      throw ApiError.unauthenticated("Refresh token has been revoked or rotated", "INVALID_REFRESH_TOKEN");
    }

    const jti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      jti,
      iss: env.JWT_ISSUER ?? "doctor-tracker-api",
      aud: env.JWT_AUDIENCE ?? "doctor-tracker-client",
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    const newRefreshToken = jwt.sign(
      { sub: user._id.toString(), jti: refreshJti, iss: payload.iss, aud: payload.aud },
      env.JWT_REFRESH_SECRET,
      {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      }
    );

    await User.findByIdAndUpdate(user._id, {
      refreshTokenJti: refreshJti,
      refreshTokenVersion: (user.refreshTokenVersion ?? 0) + 1,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Revoke all refresh tokens for a user (logout).
   */
  static async revoke(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      refreshTokenJti: null,
      refreshTokenVersion: 0,
    });
  }

  /**
   * Fetch current authenticated admin user profile.
   */
  static async getMe(userId: string): Promise<UserResponse> {
    const user = await User.findById(userId).lean<IUserDocument>();
    if (!user) {
      throw ApiError.notFound("User not found", "USER_NOT_FOUND");
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
