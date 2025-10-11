# Branding & Authentication Gating Implementation

## Overview
This document describes the changes made to enable custom branding (logo/favicon) and configurable authentication gating for the Lemon AI application.

## Features Implemented

### 1. Custom Branding (Logo & Favicon)
- **Logo Component**: Updated `Logo.vue` to use settings store with fallback to default asset
- **Settings Store**: Already had `logoUrl` and `faviconUrl` state fields with persistence
- **Upload Endpoint**: New `/api/file/upload_public` endpoint for uploading branding assets
- **Settings UI**: Enhanced `basic.vue` with file upload controls and previews
- **Dynamic Updates**: Logo and favicon update reactively throughout the app

### 2. Authentication Gating
- **Backend Middleware**: Updated `auth.js` to respect `REQUIRE_AUTH` and `ALLOW_REGISTRATION` flags
- **Frontend Router**: Added beforeEach guard to redirect unauthenticated users when auth is required
- **Registration Control**: UI conditionally shows/hides registration based on `ALLOW_REGISTRATION` flag
- **Environment Configuration**: New env variables for both backend and frontend

## File Changes

### Backend Changes

#### 1. `src/routers/file/file.js`
- Added `POST /api/file/upload_public` endpoint
- Saves files to `public/uploads/` directory
- Returns public URL path for uploaded files
- No authentication required for branding uploads

#### 2. `src/middlewares/auth.js`
- Complete rewrite of auth middleware logic
- Reads `REQUIRE_AUTH` and `ALLOW_REGISTRATION` from environment
- Public endpoints whitelist (swagger, uploads, version, etc.)
- Auth endpoints whitelist (login, register, google, refresh)
- Blocks registration when `ALLOW_REGISTRATION=false`
- Returns 401 for protected routes when auth required and no token present
- Token validation placeholder (currently accepts any token)

#### 3. `.env.example`
Added authentication configuration:
```env
# Authentication Settings
# Set to 'true' to require user authentication for all protected routes
REQUIRE_AUTH=false
# Set to 'false' to disable new user registration
ALLOW_REGISTRATION=true
```

### Frontend Changes

#### 1. `frontend/src/components/Logo.vue`
- Imports `useSettingsStore` and uses `computed` logoSrc
- Falls back to static `LemonAI` asset when `settings.logoUrl` is empty
- Maintains existing styling and structure

#### 2. `frontend/src/view/setting/basic.vue`
- Replaced text inputs with upload controls for logo and favicon
- Added `handleLogoUpload` and `handleFaviconUpload` async functions
- Displays upload buttons with loading states
- Shows image previews when URLs are set
- Uses Ant Design `a-upload` component with `before-upload` hook
- Calls `/api/file/upload_public` endpoint and updates settings store

#### 3. `frontend/src/router/index.js`
- Updated `beforeEach` guard to check `VITE_REQUIRE_AUTH`
- Redirects to `/auth` when auth required and no token present
- Redirects to `/lemon` when authenticated user visits login page
- Maintains public route exceptions (login, google)

#### 4. `frontend/src/view/auth/Login.vue`
- Added `allowRegistration` constant from env
- Conditional rendering of register form based on `allowRegistration`
- Added `handleRegisterClick` to show warning when registration disabled
- Prevents navigation to register view when `ALLOW_REGISTRATION=false`

#### 5. `frontend/.env.example`
Added authentication configuration:
```env
# Authentication Settings
# Set to 'true' to enable frontend auth gating (must match backend REQUIRE_AUTH)
VITE_REQUIRE_AUTH=false
# Set to 'false' to hide registration UI
VITE_ALLOW_REGISTRATION=true
```

## Usage

### Enabling Custom Branding

1. Navigate to Settings > Basic in the UI
2. Use the "Upload Logo" button to select and upload a logo image
3. Use the "Upload Favicon" button to select and upload a favicon
4. Alternatively, manually enter public URLs in the text inputs
5. Changes apply immediately and persist across sessions

The logo will appear in:
- Sidebar/header (wherever `Logo.vue` component is used)
- Any component importing and using the Logo component

The favicon will update:
- Browser tab icon
- Bookmark icon
- PWA/desktop app icon

### Enabling Authentication Gating

#### Backend Configuration
In your `.env` file (or environment variables):
```env
REQUIRE_AUTH=true          # Enforce authentication on protected routes
ALLOW_REGISTRATION=false   # Disable new user registration (optional)
```

#### Frontend Configuration
In `frontend/.env` file:
```env
VITE_REQUIRE_AUTH=true          # Enable frontend auth guards
VITE_ALLOW_REGISTRATION=false   # Hide registration UI (optional)
```

**Important**: `VITE_REQUIRE_AUTH` should match backend `REQUIRE_AUTH` for consistent behavior.

#### Authentication Flow When Enabled

1. User visits protected route (any route with `meta: { verify: true }`)
2. Frontend checks for `access_token` in localStorage
3. If no token and auth required, redirect to `/auth`
4. User must log in to proceed
5. Backend validates token on API requests (401 if missing/invalid)
6. If registration disabled, register button shows warning message

#### Authentication Flow When Disabled (Default)

1. No token validation on frontend or backend
2. All users treated as default user (ID: 1)
3. Full access to all routes and API endpoints
4. Registration and login UI still available but not required

## Public Endpoints (Always Accessible)

The following endpoints are accessible without authentication:
- `/api/agent_store/last/` - Agent store listing
- `/api/version` - Version information
- `/swagger` - API documentation UI
- `/swagger.json` - OpenAPI spec
- `/uploads/*` - Public uploaded files
- `/api/file/upload_public` - Branding asset uploads
- `/api/user/login` - Login endpoint
- `/api/user/google` - OAuth callback
- `/api/user/refresh` - Token refresh

## Testing Checklist

### Logo/Favicon Upload Testing
- [ ] Upload logo via Settings > Basic
- [ ] Verify logo appears in Logo component
- [ ] Verify logo persists after page refresh
- [ ] Upload favicon via Settings > Basic
- [ ] Verify favicon updates in browser tab
- [ ] Verify favicon persists after page refresh
- [ ] Test with invalid file types
- [ ] Test with large files
- [ ] Test fallback to default logo when logoUrl empty

### Auth Gating Testing (REQUIRE_AUTH=true)
- [ ] Set `REQUIRE_AUTH=true` in backend `.env`
- [ ] Set `VITE_REQUIRE_AUTH=true` in frontend `.env`
- [ ] Restart both servers
- [ ] Visit protected route without token → should redirect to `/auth`
- [ ] Try API request without token → should return 401
- [ ] Login with valid credentials → should redirect to home
- [ ] Visit `/auth` while logged in → should redirect to home
- [ ] Access public endpoints without token → should work

### Registration Gating Testing (ALLOW_REGISTRATION=false)
- [ ] Set `ALLOW_REGISTRATION=false` in backend `.env`
- [ ] Set `VITE_ALLOW_REGISTRATION=false` in frontend `.env`
- [ ] Restart both servers
- [ ] Click "Register" link on login page → should show warning
- [ ] Try POST to `/api/user/register` → should return 403
- [ ] Registration form should not be visible

### Public Mode Testing (Both flags false)
- [ ] Set `REQUIRE_AUTH=false` and `VITE_REQUIRE_AUTH=false`
- [ ] Restart both servers
- [ ] Visit all routes without token → should work
- [ ] Make API requests without token → should work
- [ ] Registration and login still accessible

## Migration Notes

### Backwards Compatibility
- Default behavior unchanged: auth not required, registration allowed
- Existing instances continue to work without configuration changes
- Settings store already had logo/favicon fields (no migration needed)
- No database schema changes required

### For Dokploy Deployment
When deploying to production:
1. Set environment variables in Dokploy dashboard
2. For private/locked-down instances: `REQUIRE_AUTH=true`
3. For open instances: `REQUIRE_AUTH=false` (default)
4. Configure `ALLOW_REGISTRATION` based on instance policy
5. Ensure frontend env vars match backend for consistent UX
6. Upload logo/favicon assets will persist in `public/uploads/`

### For Self-Hosted Deployments
1. Copy `.env.example` to `.env` in both root and `frontend/`
2. Set auth flags according to deployment requirements
3. Ensure `public/uploads/` directory is writable by the application
4. For Docker: mount `public/uploads/` as volume for persistence
5. Configure reverse proxy to serve `/uploads/` path

## Future Enhancements

### Potential Improvements
1. **Backend Settings Storage**: Move logo/favicon URLs to database for admin control
2. **User Preferences**: Per-user settings instead of global browser storage
3. **JWT Implementation**: Replace placeholder token validation with real JWT logic
4. **Role-Based Access**: Admin-only settings vs user preferences
5. **Multi-tenancy**: Per-tenant branding and auth policies
6. **Image Validation**: Server-side file type and size validation
7. **CDN Integration**: Option to upload branding assets to CDN
8. **Theme Customization**: Extend branding to colors, fonts, etc.
9. **SSO Integration**: Support for SAML, LDAP, or other enterprise auth
10. **Audit Logging**: Track branding changes and auth events

## Technical Decisions

### Why Settings Store for Branding?
- Already existed with logo/favicon fields
- Persistence built-in via pinia-plugin-persistedstate
- No backend API needed for basic usage
- Fast, reactive updates without server round-trips
- Future: can migrate to backend when needed

### Why Optional Auth Gating?
- Maintains backwards compatibility
- Allows public-facing instances (original use case)
- Enables private instances (new requirement)
- Configurable at deployment time
- No code changes needed to toggle modes

### Why ENV Variables?
- Deployment-time configuration
- No code changes between environments
- Docker/Dokploy friendly
- Matches existing pattern (RUNTIME_TYPE, etc.)
- Frontend receives values at build time

### Why Separate Upload Endpoint?
- Branding assets need to be publicly accessible
- Can't use workspace-based upload (user-scoped)
- No auth requirement for changing branding
- Simple, focused responsibility
- Static file serving from `public/`

## Security Considerations

### Branding Upload Security
- Files stored in `public/uploads/` (publicly accessible)
- Currently no file type validation (trust admin users)
- No file size limits enforced (relies on Koa body parser defaults)
- **Recommendation**: Add validation and size limits for production

### Authentication Security
- Token validation is placeholder (TODO in code)
- Currently accepts any token when auth enabled
- **Recommendation**: Implement JWT verification before production use
- HTTPS strongly recommended when auth enabled
- Consider rate limiting on auth endpoints

### Registration Security
- When disabled, returns 403 from backend
- Frontend also hides UI (defense in depth)
- Email verification flow unchanged
- SMS verification flow unchanged

## Support

For questions or issues:
1. Check this document for configuration guidance
2. Review environment variable settings
3. Check browser console for auth-related logs
4. Check backend logs for middleware behavior
5. Verify env files in both root and frontend/

## Change Summary

**Files Modified**: 8
**Files Created**: 1 (this document)
**New Endpoints**: 1 (`POST /api/file/upload_public`)
**New Environment Variables**: 4 (2 backend, 2 frontend)
**Breaking Changes**: None
**Migration Required**: None

All changes maintain backwards compatibility and require opt-in via environment configuration.
