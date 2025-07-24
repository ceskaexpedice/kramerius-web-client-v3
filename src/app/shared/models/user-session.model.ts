export interface UserSession {
  uid: string;
  authenticated: boolean;
  licenses: string[];
  session: Record<string, any>;
  roles: string[];
}
