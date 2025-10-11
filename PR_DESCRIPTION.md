# Pull Request: Branding, Authentication Gating, and Quality-of-Life Improvements

## Summary

This PR implements custom branding support (logo/favicon), optional authentication gating, and several critical bug fixes and quality-of-life improvements discovered during testing.

## Features Added

### 1. Custom Branding Support 🎨
- **Logo Upload**: Upload custom logo via Settings > Basic
- **Favicon Upload**: Upload custom favicon with real-time browser tab updates
- **Settings Persistence**: Branding stored in Pinia store with persistence
- **Fallback Handling**: Gracefully falls back to default assets when custom branding not set
- **Backend Endpoint**: New `/api/file/upload_public` for public asset uploads

**Files**:
- `frontend/src/components/Logo.vue` - Dynamic logo with settings store integration
- `frontend/src/view/setting/basic.vue` - File upload UI with previews
- `src/routers/file/file.js` - Public upload endpoint

### 2. Optional Authentication Gating 🔐
- **Configurable Auth**: Toggle authentication requirements via environment variables
- **Registration Control**: Enable/disable user registration
- **Route Protection**: Frontend guards redirect unauthenticated users
- **Backend Middleware**: 401 responses for protected routes when auth required
- **Public Endpoints**: Whitelist for swagger, uploads, version checks

**Environment Variables**:
```bash
# Backend
REQUIRE_AUTH=false          # Set to 'true' to require authentication
ALLOW_REGISTRATION=true     # Set to 'false' to disable registration

# Frontend
VITE_REQUIRE_AUTH=false     # Should match backend setting
VITE_ALLOW_REGISTRATION=true
```

**Files**:
- `src/middlewares/auth.js` - Complete rewrite with environment-based gating
- `frontend/src/router/index.js` - Auth guards
- `frontend/src/view/auth/Login.vue` - Registration UI gating
- `.env.example` + `frontend/.env.example` - Documentation

### 3. Docker Socket Auto-Detection 🐳
- **Cross-Platform**: Auto-detects Docker socket on macOS, Linux, Windows
- **Multiple Docker Variants**: Supports Docker Desktop, Colima, Rancher Desktop, OrbStack, rootless Docker
- **DOCKER_HOST Support**: Respects environment variable override
- **Graceful Fallback**: Clear error messages when socket not found
- **No Manual Setup**: Works out-of-the-box, no symlinks needed

**Files**:
- `src/utils/docker_socket.js` - New auto-detection utility
- `src/runtime/DockerRuntime.local.js` - Uses auto-detection
- `.env.example` - DOCKER_HOST documentation

## Bug Fixes

### Issue 2: OpenAI `enable_thinking` Parameter Error ✅
**Problem**: Qwen-specific `enable_thinking` parameter was sent to all LLM providers, causing 400 errors from OpenAI.

**Fix**: Model-based parameter filtering

**File**: `src/completion/llm.base.js`

### Issue 3: Gemini API Check 404 Error ✅
**Problem**: API validation assumed OpenAI-compatible `/chat/completions` endpoint, which Gemini doesn't have.

**Fix**: Provider-aware API checking with Gemini-specific endpoint and response validation

**Files**:
- `src/utils/check_llm_api_availability.js`
- `src/routers/platform/platform.js`
- `frontend/src/view/setting/model.vue`

### Issue 4: MCP Server Import Type Detection ✅
**Problem**: HTTP MCP servers imported from JSON defaulted to "stdio" type, requiring manual correction.

**Fix**: Improved type detection logic prioritizing URL-based detection

**File**: `frontend/src/components/mcpServer/index.vue`

## Security Improvements

### Environment File Sanitization
- `.env.example` restored to clean template (no API keys)
- `frontend/.env.example` restored to clean template
- `frontend/.gitignore` updated with `.env` patterns
- Actual `.env` files properly ignored by git

## Documentation

### New Files
- `CHANGES_BRANDING_AUTH.md` - Comprehensive feature documentation
- `TESTING_NOTES.md` - All bugs found, fixes applied, testing checklists
- `DOCKER_SOCKET_FIX_PROPOSAL.md` - Technical design for Docker auto-detection
- `PR_DESCRIPTION.md` - This file

## Testing

All changes tested on macOS (Apple Silicon) with:
- Docker Desktop (Homebrew installation)
- Multiple LLM providers (OpenAI, DeepSeek, Gemini)
- MCP server imports
- Logo/favicon uploads
- Auth gating enabled/disabled

### Test Checklist
- ✅ Logo upload and display with persistence
- ✅ Favicon upload and browser tab update
- ✅ Settings fallback to defaults when not set
- ✅ OpenAI models work without `enable_thinking` error
- ✅ DeepSeek continues working (no regression)
- ✅ Docker socket auto-detected on macOS
- ✅ MCP HTTP servers import with correct type
- ✅ Auth gating blocks unauthenticated access
- ✅ Registration can be disabled
- ✅ Frontend build successful
- ✅ Backend starts without errors

## Breaking Changes

**None** - All changes are backward compatible and opt-in via configuration.

## Files Changed

**Total: 5 new + 15 modified = 20 files**

### New Files (5)
1. `src/utils/docker_socket.js`
2. `CHANGES_BRANDING_AUTH.md`
3. `TESTING_NOTES.md`
4. `DOCKER_SOCKET_FIX_PROPOSAL.md`
5. `PR_DESCRIPTION.md`

### Modified Files (15)
1. `src/completion/llm.base.js`
2. `src/middlewares/auth.js`
3. `src/routers/file/file.js`
4. `src/routers/platform/platform.js`
5. `src/runtime/DockerRuntime.local.js`
6. `src/utils/check_llm_api_availability.js`
7. `frontend/src/components/Logo.vue`
8. `frontend/src/components/mcpServer/index.vue`
9. `frontend/src/view/setting/basic.vue`
10. `frontend/src/view/auth/Login.vue`
11. `frontend/src/view/setting/model.vue`
12. `frontend/src/router/index.js`
13. `.env.example`
14. `frontend/.env.example`
15. `frontend/.gitignore`

## Performance Impact

**Minimal**: 
- Docker socket detection runs once at startup
- Logo/favicon changes are client-side only
- Auth middleware has early returns for public routes

---

**Ready for Review** ✅
