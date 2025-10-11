# Docker Socket Auto-Detection Improvement

## Current Issue

The code in `src/runtime/DockerRuntime.local.js` (lines 10-17) hardcodes Docker socket paths:

```javascript
let dockerOptions = {};
if (os.platform() === 'win32') {
  dockerOptions.socketPath = '//./pipe/docker_engine';
} else {
  // Linux/macOS: 使用默认的 Unix socket
  dockerOptions.socketPath = '/var/run/docker.sock';  // ❌ Doesn't work on macOS!
}
```

**Problem**: macOS (especially with Homebrew Docker) uses `~/.docker/run/docker.sock`, not `/var/run/docker.sock`.

---

## Proposed Solution: Auto-Detection with Fallbacks

### Implementation Steps

#### 1. Create a Docker Socket Finder Utility

**File**: `src/utils/docker_socket.js`

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Find the Docker socket path for the current system
 * @returns {string} Path to Docker socket
 */
function findDockerSocket() {
  // 1. Check DOCKER_HOST environment variable first
  if (process.env.DOCKER_HOST) {
    const match = process.env.DOCKER_HOST.match(/unix:\/\/(.+)/);
    if (match && fs.existsSync(match[1])) {
      console.log('[Docker] Using socket from DOCKER_HOST:', match[1]);
      return match[1];
    }
  }

  // 2. Platform-specific search paths
  const platform = os.platform();
  let searchPaths = [];

  if (platform === 'win32') {
    // Windows named pipe
    return '//./pipe/docker_engine';
  } else if (platform === 'darwin') {
    // macOS - multiple possible locations
    searchPaths = [
      path.join(os.homedir(), '.docker', 'run', 'docker.sock'),  // Homebrew/Desktop
      '/var/run/docker.sock',                                      // Standard (with symlink)
      path.join(os.homedir(), '.colima', 'default', 'docker.sock'), // Colima
      path.join(os.homedir(), '.rd', 'docker.sock'),               // Rancher Desktop
    ];
  } else {
    // Linux
    searchPaths = [
      '/var/run/docker.sock',                                      // Standard
      path.join(os.homedir(), '.docker', 'run', 'docker.sock'),   // Rootless Docker
    ];
  }

  // 3. Try each path in order
  for (const socketPath of searchPaths) {
    if (fs.existsSync(socketPath)) {
      console.log('[Docker] Found socket at:', socketPath);
      return socketPath;
    }
  }

  // 4. Fallback to standard path (will fail, but let Docker lib handle the error)
  const fallback = platform === 'darwin' 
    ? path.join(os.homedir(), '.docker', 'run', 'docker.sock')
    : '/var/run/docker.sock';
  
  console.warn('[Docker] No socket found, falling back to:', fallback);
  return fallback;
}

module.exports = { findDockerSocket };
```

#### 2. Update DockerRuntime.local.js

**File**: `src/runtime/DockerRuntime.local.js`

```javascript
// Line 1-9 stays the same
const { findDockerSocket } = require('@src/utils/docker_socket');

// Replace lines 10-17 with:
const dockerOptions = {
  socketPath: findDockerSocket()
};
const docker = new Docker(dockerOptions);
```

#### 3. Update DockerRuntime.js (if it also uses Docker)

Check if `src/runtime/DockerRuntime.js` also needs the same update.

#### 4. Add ENV Variable Support

Update `.env.example` to document the option:

```bash
# Docker Configuration (optional)
# Specify custom Docker socket path if auto-detection fails
# Examples:
#   macOS Homebrew: DOCKER_HOST=unix:///Users/yourusername/.docker/run/docker.sock
#   Linux rootless:  DOCKER_HOST=unix:///run/user/1000/docker.sock
#   Colima:         DOCKER_HOST=unix:///Users/yourusername/.colima/default/docker.sock
# DOCKER_HOST=unix:///path/to/docker.sock
```

---

## Benefits

1. **No Manual Setup**: Works out-of-the-box on macOS, Linux, and Windows
2. **Flexible**: Supports multiple Docker installations (Docker Desktop, Colima, Rancher Desktop, rootless Docker)
3. **ENV Override**: Users can specify custom paths via `DOCKER_HOST`
4. **Backwards Compatible**: Existing setups with symlinks continue to work
5. **Better Errors**: Clear console messages about which socket is being used

---

## Testing Plan

### macOS Testing
- [ ] Docker Desktop (Homebrew install)
- [ ] Docker Desktop (official installer)
- [ ] Colima
- [ ] Rancher Desktop
- [ ] With DOCKER_HOST env variable

### Linux Testing
- [ ] Standard Docker (system-wide)
- [ ] Rootless Docker
- [ ] With DOCKER_HOST env variable

### Windows Testing
- [ ] Docker Desktop
- [ ] WSL2 backend

---

## Migration Path for Users

### For Current Users (with symlink):
- No action needed
- Symlink will be detected and used
- Can remove symlink after update if desired

### For New Users:
- Just install Docker
- Application finds socket automatically
- No symlink or manual configuration needed

### For Edge Cases:
- Set `DOCKER_HOST` in `.env` file
- Takes precedence over auto-detection

---

## Alternative: Symlink Creation Script

If you prefer NOT to modify the code, you could create a setup script:

**File**: `scripts/setup_docker_socket.sh`

```bash
#!/bin/bash

# Detect macOS Docker socket and create symlink if needed
if [[ "$(uname)" == "Darwin" ]]; then
  SOCKET_PATH="$HOME/.docker/run/docker.sock"
  
  if [ -e "$SOCKET_PATH" ]; then
    echo "Found macOS Docker socket at: $SOCKET_PATH"
    
    if [ ! -e "/var/run/docker.sock" ]; then
      echo "Creating symlink: /var/run/docker.sock -> $SOCKET_PATH"
      sudo mkdir -p /var/run
      sudo ln -sf "$SOCKET_PATH" /var/run/docker.sock
      echo "✓ Symlink created"
    else
      echo "✓ /var/run/docker.sock already exists"
    fi
  else
    echo "⚠ Docker socket not found at: $SOCKET_PATH"
    echo "Make sure Docker Desktop is installed and running"
  fi
fi
```

Then add to Makefile:

```makefile
setup-docker:
	@bash scripts/setup_docker_socket.sh
```

Users run: `make setup-docker`

---

## Recommended Approach

**Option 1 (Better)**: Implement auto-detection utility
- More robust
- Works everywhere
- No manual setup
- ~30 minutes of work

**Option 2 (Simpler)**: Setup script + documentation
- Quick to implement
- Requires manual step
- Works for most users
- ~10 minutes of work

**Option 3 (Current)**: Keep symlink approach + document it
- Already done
- Users must know to create symlink
- Less discoverable

---

## Implementation Estimate

**Auto-Detection Utility**: 
- Create utility file: 10 min
- Update DockerRuntime files: 5 min  
- Testing on macOS: 10 min
- Documentation: 5 min
- **Total: ~30 minutes**

**Setup Script**:
- Create script: 5 min
- Update Makefile: 2 min
- Documentation: 3 min
- **Total: ~10 minutes**

---

## Recommendation

Implement **Option 1 (Auto-Detection)** because:
1. Best user experience
2. Covers all Docker variants
3. Future-proof
4. Minimal ongoing maintenance
5. Users never have to think about socket paths

The current symlink works, but auto-detection is more professional and prevents issues for other users.
