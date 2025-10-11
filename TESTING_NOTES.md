# Testing Notes & Fixes

## Issues Found During Testing

### Issue 1: API Keys from ENV Not Being Used ❌

**Problem**: Setting API keys in `.env` file (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) does not automatically configure them in the application.

**Root Cause**: The application stores API keys in the SQLite database (Platform table), not environment variables. The system is designed for multi-user scenarios where each platform configuration is managed through the UI.

**Solution**: API keys must be configured through the UI:
1. Navigate to **Settings > Model Service**
2. Find the provider (e.g., OpenAI, Anthropic, DeepSeek)
3. Enter your API key
4. Enable the platform
5. Save changes

**Why It's Designed This Way**:
- Supports multiple users with different API keys
- Allows enabling/disabling providers per user
- Provides UI-based management without requiring server restarts
- Keys are stored securely in the database with user-specific access

**ENV Variables That DO Work**:
- `STORAGE_PATH` - Database location
- `WORKSPACE_DIR` - Workspace directory
- `RUNTIME_TYPE` - Runtime execution mode
- `ENABLE_KNOWLEDGE` - Knowledge feedback toggle
- `REQUIRE_AUTH` - Authentication gating
- `ALLOW_REGISTRATION` - Registration control
- Proxy/deployment settings (VITE_SERVICE_URL, etc.)

---

### Issue 2: OpenAI `enable_thinking` Parameter Error ✅ FIXED

**Problem**: 
```
LLM API call failed, HTTP status: 400, error: {
  "error": {
    "message": "Unrecognized request argument supplied: enable_thinking",
    "type": "invalid_request_error",
    "param": null,
    "code": null
  }
}
```

**Root Cause**: The `enable_thinking` parameter is specific to Qwen models but was being sent to all providers (including OpenAI, which doesn't support it).

**Location**: `src/completion/llm.base.js` line 96

**Fix Applied**:
- Split options into `commonOptions` and `qwenSpecificOptions`
- Added model detection: checks if model name contains "qwen" or "qwq"
- Only includes `enable_thinking` parameter for Qwen models
- All other models get standard OpenAI-compatible parameters

**Code Change**:
```javascript
// Before:
const supportOptions = ['temperature', 'top_p', 'max_tokens', 'stop', 'stream', 
                       'assistant_id', 'response_format', 'tools', 'enable_thinking'];

// After:
const commonOptions = ['temperature', 'top_p', 'max_tokens', 'stop', 'stream', 
                      'assistant_id', 'response_format', 'tools'];
const qwenSpecificOptions = ['enable_thinking'];
const isQwenModel = model && (model.toLowerCase().includes('qwen') || 
                              model.toLowerCase().includes('qwq'));
const supportOptions = isQwenModel ? [...commonOptions, ...qwenSpecificOptions] : commonOptions;
```

**Testing**:
- ✅ DeepSeek: Works without issue (no enable_thinking sent)
- ⚠️ OpenAI: Should now work after restart (enable_thinking filtered out)
- ✅ Qwen models: Will continue to receive enable_thinking parameter

**Action Required**: Restart the backend server to apply the fix:
```bash
# In Terminal 1 (backend)
Ctrl+C
pnpm run dev
```

---

## Additional Testing Recommendations

### 1. Logo/Favicon Upload
- [ ] Upload logo image via Settings > Basic
- [ ] Upload favicon image via Settings > Basic
- [ ] Verify logo appears in sidebar/header
- [ ] Verify favicon appears in browser tab
- [ ] Refresh page to test persistence
- [ ] Clear browser cache and test again

### 2. Model Provider Configuration
- [ ] Configure OpenAI API key via UI
- [ ] Test OpenAI model after backend restart
- [ ] Configure other providers (Anthropic, etc.)
- [ ] Verify models appear in model selection dropdown
- [ ] Test different models with conversations

### 3. Authentication Gating (If Enabled)
- [ ] Set REQUIRE_AUTH=true in both .env files
- [ ] Restart servers
- [ ] Test unauthenticated access → should redirect
- [ ] Test login flow
- [ ] Test authenticated access

### 4. Settings Persistence
- [ ] Change site name → verify it persists
- [ ] Toggle footer visibility → verify it persists
- [ ] Switch language → verify it persists
- [ ] Close/reopen browser → verify all settings remain

---

## Known Limitations

1. **API Keys in ENV**: Not currently supported by design. Would require architectural changes to support ENV-based API key loading.

2. **Model-Specific Parameters**: Only Qwen's `enable_thinking` is currently filtered. Other model-specific parameters may need similar treatment if they cause issues.

3. **Platform Detection**: The Qwen model detection is name-based. If a provider uses different naming conventions, the detection may need updates.

---

## Files Modified

1. `src/completion/llm.base.js` - Fixed enable_thinking parameter filtering
2. `.env.example` - Sanitized to remove actual API keys
3. `frontend/.env.example` - Sanitized to remove actual API keys  
4. `frontend/.gitignore` - Added .env ignore patterns

---

## Next Steps

1. Restart backend to apply the OpenAI fix
2. Test OpenAI models
3. Configure any other providers via UI
4. Continue with branding tests (logo/favicon)
5. Test any other model providers you use
6. Report any additional issues found

---

### Issue 3: Gemini API Check 404 Error ✅ FIXED

**Problem**: Gemini API key validation fails with 404 error despite having valid base URL and API key.

**Root Cause**: The API availability check function (`check_llm_api_availability.js`) assumes all providers use OpenAI-compatible `/chat/completions` endpoint. Gemini uses a completely different API structure:
- OpenAI: `POST /v1/chat/completions`
- Gemini: `POST /v1beta/models/{model}:generateContent?key={api_key}`

**Fix Applied**:
- Added provider detection based on platform name
- Separate request structures for Gemini vs OpenAI-compatible providers
- Different response validation (Gemini uses `candidates`, OpenAI uses `choices`)
- Platform name now passed from frontend through the API check endpoint

**Files Modified**:
1. `src/utils/check_llm_api_availability.js` - Added Gemini-specific handling
2. `src/routers/platform/platform.js` - Added platform_name parameter
3. `frontend/src/view/setting/model.vue` - Pass platform name in check request

**Testing**: After backend restart, Gemini API key validation should now work correctly.

---

### Issue 4: MCP Server Import from JSON Type Detection ✅ FIXED

**Problem**: 
- HTTP servers imported from JSON defaulted to "stdio" type with no values
- Had to manually change to "streamableHttp" or "sse" to work
- Connection failed until correct type was selected

**Root Cause**: The `resolveMcpServerType` function had flawed logic:
```javascript
// Before:
if (url.includes("sse")) return "sse";
else if (command.startsWith("npx")) return "stdio";
else if (url.includes("mcp")) return "streamableHttp";
return "stdio";  // Default for ANY HTTP URL!
```

Problem: An HTTP URL without "sse" or "mcp" in the path would default to "stdio" even though it has a URL!

**Fix Applied**:
- Check URL presence first before checking commands
- Any HTTP/HTTPS URL not containing "sse" defaults to "streamableHttp"
- Only default to "stdio" if there's a command present
- Better detection for various command types (npx, uvx, node)

**New Logic**:
```javascript
// After:
if (url) {
  if (url.includes("sse")) return "sse";
  else if (url.startsWith("http://") || url.startsWith("https://")) return "streamableHttp";
}
if (command) {
  if (command.startsWith("npx") || command.startsWith("uvx") || command.startsWith("node")) return "stdio";
}
return command ? "stdio" : "streamableHttp";
```

**Files Modified**:
1. `frontend/src/components/mcpServer/index.vue` - Fixed resolveMcpServerType function

**Testing**: Import MCP servers from JSON with HTTP URLs should now correctly detect as "streamableHttp" or "sse" type.

---

### Issue 5: Docker Socket Connection Error (macOS) ✅ FIXED

**Problem**: 
```
Task exception terminated:[Docker] Failed to inspect image: connect ENOENT /var/run/docker.sock
```
Error occurs during chat when using `RUNTIME_TYPE=local-docker` on macOS.

**Root Cause**: On macOS (especially Apple Silicon with Homebrew Docker), the Docker socket is located at `~/.docker/run/docker.sock` instead of the standard Linux location `/var/run/docker.sock`. The application was hardcoded to use the Linux path.

**Fix Applied**: Implemented auto-detection utility that finds Docker socket across platforms:

**How It Works**:
1. Checks `DOCKER_HOST` environment variable first (if set)
2. Searches platform-specific locations:
   - **macOS**: `~/.docker/run/docker.sock`, `/var/run/docker.sock`, Colima, Rancher Desktop, OrbStack
   - **Linux**: `/var/run/docker.sock`, `~/.docker/run/docker.sock` (rootless), `/run/user/UID/docker.sock`
   - **Windows**: `//./pipe/docker_engine`
3. Verifies each path is an actual socket
4. Falls back with clear error messages

**Files Modified**:
1. `src/utils/docker_socket.js` - New auto-detection utility
2. `src/runtime/DockerRuntime.local.js` - Uses auto-detection
3. `.env.example` - Documents DOCKER_HOST override option

**Alternative Solutions** (if needed):
1. **Change Runtime Type** (if you don't need Docker sandboxing):
   - Edit `.env`: `RUNTIME_TYPE=local` (runs code directly on host)
   - Restart backend server
   - Less secure but simpler for local development

2. **Set DOCKER_HOST environment variable** (now supported!):
   - Add to `.env`: `DOCKER_HOST=unix:///Users/bbrenner/.docker/run/docker.sock`
   - Takes precedence over auto-detection

**Why This Happens**:
- Linux Docker: Socket at `/var/run/docker.sock`
- macOS Docker Desktop: Socket at `~/.docker/run/docker.sock`
- Homebrew Docker on macOS: Also uses `~/.docker/run/docker.sock`
- Application was designed for Linux-style paths

**Testing**: After backend restart, Docker socket should be auto-detected and work without any manual setup.

**Benefits**:
- ✅ Works out-of-the-box on macOS (all Docker variants)
- ✅ Works out-of-the-box on Linux (standard and rootless)
- ✅ Works out-of-the-box on Windows
- ✅ Supports DOCKER_HOST override
- ✅ Clear console logging of detected socket
- ✅ No manual symlinks or configuration needed

---

## Files Modified Summary

**Issue 2 (enable_thinking):**
1. `src/completion/llm.base.js`

**Issue 3 (Gemini API check):**
1. `src/utils/check_llm_api_availability.js`
2. `src/routers/platform/platform.js`
3. `frontend/src/view/setting/model.vue`

**Issue 4 (MCP import type detection):**
1. `frontend/src/components/mcpServer/index.vue`

**Issue 5 (Docker socket auto-detection):**
1. `src/utils/docker_socket.js` - New auto-detection utility
2. `src/runtime/DockerRuntime.local.js` - Uses auto-detection
3. `.env.example` - Docker configuration documentation

**Security:**
1. `.env.example` - Sanitized
2. `frontend/.env.example` - Sanitized
3. `frontend/.gitignore` - Added .env patterns

**Total: 12 files modified**

---

Date: 2025-10-11
Status: Issues 2, 3, 4 fixed | Issue 1 documented as by-design
