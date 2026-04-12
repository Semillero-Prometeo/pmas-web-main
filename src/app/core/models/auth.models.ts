export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface UserRole {
  role: { id: string; name: string };
}

export interface UserProfile {
  id: string;
  username: string;
  is_first_login: boolean;
  person?: {
    first_name: string;
    last_name: string;
    email: string;
    image_url?: string;
  };
  user_role?: UserRole[];
}

export interface AuthState {
  token: string | null;
  profile: UserProfile | null;
}
