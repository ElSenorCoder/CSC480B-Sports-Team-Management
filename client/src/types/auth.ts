export type UserRole = "administrator" | "coach" | "player";

export type LoginCredentials = {
  identifier: string;
  password: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type LoginResponse = {
  token: string;
  expiresIn?: number;
  user: AuthUser;
};
