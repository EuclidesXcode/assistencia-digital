// Authentication and Authorization Models

export interface LoginCredentials {
  email: string;
  password: string;
  branchId: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  branchId: string;
  role: string;
  photoUrl?: string;
  permissions: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface PasswordResetRequest {
  email: string;
  branchId: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileDTO {
  name?: string;
  email?: string;
  photoUrl?: string;
}
