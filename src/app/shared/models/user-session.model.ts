import { SessionDetails } from './session-details.model';

export interface UserSession {
  uid: string;
  authenticated: boolean;
  email: string;
  name: string;
  licenses: string[];
  session: SessionDetails;
  roles: string[];
}
