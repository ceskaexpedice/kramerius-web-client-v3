# Authentication System Usage Guide

This authentication system implements OAuth2/OpenID Connect flow with automatic token management.

## How It Works

1. **Login Flow**:
   - User clicks login button anywhere in the app
   - System saves the current route and redirects to OAuth provider
   - After authentication, user is redirected back to `/auth/callback`
   - Callback component exchanges authorization code for tokens
   - User is redirected back to their original location

2. **Automatic Token Management**:
   - Access tokens are automatically attached to all API calls
   - Tokens are refreshed automatically when they expire
   - User is logged out if refresh fails

## Usage Examples

### Basic Login
```typescript
// In any component
constructor(private authService: AuthService) {}

login() {
  this.authService.login(); // Will redirect and return to current page
}

// Or specify a return URL
loginWithReturn() {
  this.authService.login('/dashboard');
}
```

### Check Authentication Status
```typescript
// In any component
constructor(private authService: AuthService) {}

ngOnInit() {
  // Subscribe to authentication state
  this.authService.isAuthenticated$.subscribe(isAuth => {
    console.log('User authenticated:', isAuth);
  });

  // Get user info
  this.authService.user$.subscribe(user => {
    console.log('Current user:', user);
  });
}
```

### Protect Routes with AuthGuard
```typescript
// In your routing configuration
{
  path: 'protected',
  component: ProtectedComponent,
  canActivate: [AuthGuard]
}
```

### Manual Token Management
```typescript
// Check if user is authenticated
if (this.authService.hasValidToken()) {
  // User is logged in
}

// Get access token manually
const token = this.authService.getAccessToken();

// Logout
this.authService.logout();
```

### Using NgRx Store
```typescript
// In any component with store
constructor(private store: Store) {}

login() {
  this.store.dispatch(AuthActions.login({ returnUrl: '/dashboard' }));
}

logout() {
  this.store.dispatch(AuthActions.logout());
}

// Select auth state
isAuthenticated$ = this.store.select(selectIsAuthenticated);
user$ = this.store.select(selectUser);
authError$ = this.store.select(selectAuthError);
```

## Configuration

The authentication system uses these endpoints:
- Login: `${API_URL}/auth/login`
- Token exchange: `${API_URL}/auth/token`
- User info: `${API_URL}/auth/user`

The callback URL is automatically set to: `${window.location.origin}/auth/callback`

## Security Notes

- Tokens are stored in localStorage
- All API calls automatically include Authorization header
- Expired tokens are automatically refreshed
- Users are logged out if token refresh fails
- Auth endpoints are excluded from token attachment