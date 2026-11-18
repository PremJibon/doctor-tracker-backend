export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  jti?: string;
  iss?: string;
  aud?: string;
}
