const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Find the Docker socket path for the current system
 * Checks multiple locations based on platform and common Docker installations
 * 
 * Priority order:
 * 1. DOCKER_HOST environment variable
 * 2. Platform-specific search paths (in order of likelihood)
 * 3. Fallback to standard path
 * 
 * @returns {string} Path to Docker socket
 */
function findDockerSocket() {
  // 1. Check DOCKER_HOST environment variable first
  if (process.env.DOCKER_HOST) {
    const match = process.env.DOCKER_HOST.match(/unix:\/\/(.+)/);
    if (match) {
      const socketPath = match[1];
      if (fs.existsSync(socketPath)) {
        console.log('[Docker] Using socket from DOCKER_HOST:', socketPath);
        return socketPath;
      } else {
        console.warn('[Docker] DOCKER_HOST specified but socket not found:', socketPath);
      }
    }
  }

  // 2. Platform-specific search paths
  const platform = os.platform();
  let searchPaths = [];

  if (platform === 'win32') {
    // Windows uses named pipe for Docker
    console.log('[Docker] Windows detected, using named pipe');
    return '//./pipe/docker_engine';
  } else if (platform === 'darwin') {
    // macOS - check multiple common Docker installation locations
    searchPaths = [
      path.join(os.homedir(), '.docker', 'run', 'docker.sock'),     // Docker Desktop (Homebrew/Official)
      '/var/run/docker.sock',                                        // Standard path (with symlink)
      path.join(os.homedir(), '.colima', 'default', 'docker.sock'), // Colima
      path.join(os.homedir(), '.rd', 'docker.sock'),                // Rancher Desktop
      path.join(os.homedir(), '.orbstack', 'run', 'docker.sock'),   // OrbStack
    ];
  } else {
    // Linux - check standard and rootless Docker locations
    searchPaths = [
      '/var/run/docker.sock',                                        // Standard Docker
      path.join(os.homedir(), '.docker', 'run', 'docker.sock'),     // Rootless Docker
      `/run/user/${process.getuid()}/docker.sock`,                  // Rootless Docker (alternative)
    ];
  }

  // 3. Try each path in order
  for (const socketPath of searchPaths) {
    try {
      if (fs.existsSync(socketPath)) {
        // Verify it's actually a socket
        const stats = fs.statSync(socketPath);
        if (stats.isSocket()) {
          console.log('[Docker] Found socket at:', socketPath);
          return socketPath;
        }
      }
    } catch (err) {
      // Skip paths that can't be accessed
      continue;
    }
  }

  // 4. Fallback to most likely path based on platform
  const fallback = platform === 'darwin' 
    ? path.join(os.homedir(), '.docker', 'run', 'docker.sock')
    : '/var/run/docker.sock';
  
  console.warn('[Docker] No socket found in search paths, falling back to:', fallback);
  console.warn('[Docker] If Docker is installed, ensure it is running or set DOCKER_HOST environment variable');
  
  return fallback;
}

/**
 * Get Docker connection options for dockerode
 * 
 * @returns {Object} Docker connection options
 */
function getDockerOptions() {
  return {
    socketPath: findDockerSocket()
  };
}

module.exports = { 
  findDockerSocket,
  getDockerOptions
};
