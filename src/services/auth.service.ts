import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUserDocument } from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { LoginInput } from "../validators/auth.validator.js";

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

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
    const user = await User.findOne({ email: input.email }).select("+passwordHash");

    const hashToCompare = user?.passwordHash || DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(input.password, hashToCompare);

    if (!user || !isPasswordValid) {
      throw ApiError.unauthenticated("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    const refreshToken = jwt.sign({ sub: user._id.toString() }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
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
   */
  static async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    if (!refreshToken) {
      throw ApiError.unauthenticated("Refresh token is required", "UNAUTHENTICATED");
    }

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    } catch {
      throw ApiError.unauthenticated("Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
    }

    if (!decoded.sub) {
      throw ApiError.unauthenticated("Malformed refresh token", "INVALID_REFRESH_TOKEN");
    }

    const user = await User.findById(decoded.sub).lean<IUserDocument>();
    if (!user) {
      throw ApiError.unauthenticated("User account no longer exists", "UNAUTHENTICATED");
    }

    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    return { accessToken };
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
