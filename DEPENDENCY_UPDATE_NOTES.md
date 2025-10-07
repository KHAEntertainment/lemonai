# NPM Dependency Update Notes

## Summary

This document outlines the npm dependencies that could not be safely updated automatically due to potential breaking changes. These updates require manual review and testing before implementation.

**Update Status (as of 2025-10-07):**
- ✅ **Root package:** Reduced from 76 to 68 vulnerabilities
- ✅ **Frontend package:** Reduced from 15 to 8 vulnerabilities
- ✅ **Safe updates applied:** All patch and minor version updates completed
- ⚠️ **Remaining issues:** 76 total vulnerabilities requiring manual attention

---

## Root Package (`/package.json`)

### Critical Priority - 68 Vulnerabilities Remaining

#### 1. electron-forge (CRITICAL - 12 Critical, Multiple High/Moderate)
**Current:** `5.2.4` (deprecated)  
**Available:** `2.0.0` or migrate to `@electron-forge/cli`  
**Severity:** Critical  

**Issues:**
- Package is deprecated and has moved to `@electron-forge/cli`
- Contains multiple critical vulnerabilities in dependencies:
  - babel-traverse (arbitrary code execution)
  - babel-core, babel-register (critical vulnerabilities)
  - xmldom (multiple critical vulnerabilities)
  - lodash (prototype pollution, command injection)
  - aws-sdk (prototype pollution)
  - form-data (unsafe random function)
  - Many others

**Recommendation:**
```bash
# Remove old package
npm uninstall electron-forge

# Install new package
npm install --save-dev @electron-forge/cli@latest
```

**Notes:** This is a namespace change, not a version downgrade. API should be similar but requires testing all Electron build/package scripts.

---

#### 2. electron (MODERATE - 2 Vulnerabilities)
**Current:** `29.2.0`  
**Recommended:** `29.4.6` or latest stable  
**Severity:** Moderate  

**Issues:**
- Heap Buffer Overflow in NativeImage (CVE in 29.0.0-alpha.1 to 29.3.3)
- ASAR Integrity Bypass via resource modification (all versions < 35.7.5)

**Recommendation:**
```bash
npm install electron@29.4.6
# Or for latest
npm install electron@latest
```

**Testing Required:**
- Verify all Electron app functionality
- Test ASAR packaging
- Check native module compatibility

---

#### 3. nodemon (HIGH - Multiple Vulnerabilities)
**Current:** `1.19.1`  
**Available:** `3.1.10`  
**Severity:** High  

**Issues:**
- Depends on vulnerable versions of:
  - chokidar (high severity)
  - braces (uncontrolled resource consumption)
  - update-notifier (high severity)
  - micromatch (ReDoS)

**Recommendation:**
```bash
npm install --save-dev nodemon@latest
```

**Testing Required:**
- Verify dev server auto-reload functionality
- Test file watching patterns
- Check compatibility with existing nodemon.json config

---

#### 4. Major Version Updates Available

##### 4.1 Koa Framework Packages (Breaking Changes Expected)
**koa**
- Current: `^2.7.0` → Available: `3.0.1`
- Breaking changes in v3

**koa-router**  
- Current: `^7.4.0` → Available: `14.0.0` (MAJOR jump)
- **Performance Note:** Current version has 10x+ slower performance issue
- Highly recommended to upgrade

**koa-logger**
- Current: `^3.2.0` → Available: `4.0.0`

**koa-onerror**
- Current: `^4.1.0` → Available: `5.0.1`

**koa-convert**
- Current: `^1.2.0` → Available: `2.0.0`

**Recommendation:** Update all Koa packages together and test thoroughly.
```bash
npm install koa@latest koa-router@latest koa-logger@latest koa-onerror@latest koa-convert@latest
```

**Testing Required:**
- All API endpoints
- Error handling middleware
- Logging functionality
- Static file serving
- Authentication/authorization flows

---

##### 4.2 Testing Libraries
**chai**
- Current: `^4.3.4` → Available: `6.2.0`
- Breaking changes in v5 and v6

**sinon**
- Current: `^20.0.0` → Available: `21.0.0`
- Minor breaking changes possible

**Recommendation:**
```bash
npm install --save-dev chai@latest sinon@latest
```

**Testing Required:** Run full test suite after update

---

##### 4.3 Utility Libraries
**uuid**
- Current: `^11.1.0` → Available: `13.0.0`
- API changes in v12+

**marked**
- Current: `^15.0.12` → Available: `16.4.0`
- Breaking changes in v16

**dotenv**
- Current: `^16.5.0` → Available: `17.2.3`
- Breaking changes in v17

**pino** (logging)
- Current: `^9.6.0` → Available: `10.0.0`
- Breaking changes in v10

**fast-xml-parser**
- Current: `^4.5.3` → Available: `5.3.0`
- Breaking changes in v5

**Recommendation:** Update one at a time and test:
```bash
npm install uuid@latest
npm install marked@latest
npm install dotenv@latest
npm install pino@latest
npm install fast-xml-parser@latest
```

---

## Frontend Package (`/frontend/package.json`)

### Moderate Priority - 8 Vulnerabilities Remaining

#### 1. xlsx (HIGH - NO FIX AVAILABLE) ⚠️
**Current:** `0.18.5`  
**Required for fix:** `0.20.2+`  
**Severity:** High (2 vulnerabilities)

**Issues:**
- Prototype Pollution (GHSA-4r6h-8v6p-xvw6) - CVSS 7.8
- Regular Expression Denial of Service (GHSA-5pgg-2g8v-p4x9) - CVSS 7.5

**Problem:** No fix available in the version range compatible with current setup.

**Options:**
1. **Replace with alternative:** Consider `exceljs` or `sheetjs-ce` 
2. **Upgrade to latest xlsx:** May have breaking changes
3. **Accept risk:** If xlsx is only used for trusted files

**Recommendation:**
```bash
# Option 1: Try upgrading (test thoroughly)
npm install xlsx@latest

# Option 2: Alternative library
npm uninstall xlsx
npm install exceljs
```

**Migration Required:** If switching libraries, update all Excel file handling code.

---

#### 2. vite-plugin-svg-icons (MODERATE - Downgrade Required)
**Current:** `2.0.1`  
**Safe Version:** `0.1.0`  
**Severity:** Moderate

**Issues:**
- Depends on vulnerable svg-baker (micromatch, postcss, braces vulnerabilities)

**Recommendation:**
```bash
npm install vite-plugin-svg-icons@0.1.0
```

**OR consider alternatives:**
```bash
npm uninstall vite-plugin-svg-icons
npm install vite-plugin-svgr  # Already installed, might be redundant
```

**Testing Required:**
- SVG icon loading
- Build process
- Check for API changes between versions

---

#### 3. vite (MODERATE - Major Version Update)
**Current:** `5.4.11`  
**Available:** `7.1.9`  
**Severity:** Moderate

**Issues:**
- Depends on vulnerable esbuild (GHSA-67mh-4wv8-2f99)
- Multiple low-severity issues with file serving

**Recommendation:**
```bash
# Conservative approach - update to latest v5.x
npm install vite@^5.4.20

# OR upgrade to v6.x (moderate breaking changes)
npm install vite@^6.latest

# OR upgrade to v7.x (more breaking changes)
npm install vite@^7.latest
```

**Testing Required:**
- Dev server functionality
- Build process
- Hot module replacement
- Plugin compatibility

---

#### 4. Major Version Updates Available

##### 4.1 State Management
**pinia**
- Current: `^2.2.6` → Available: `3.0.3`
- Breaking changes in v3

**pinia-plugin-persistedstate**
- Current: `^3.2.3` → Available: `4.5.0`
- Breaking changes in v4

**Recommendation:**
```bash
npm install pinia@latest pinia-plugin-persistedstate@latest
```

**Testing Required:**
- All state management
- Persistent state functionality
- Store modules

---

##### 4.2 Utilities
**uuid**
- Current: `^11.1.0` → Available: `13.0.0`
- API changes in v12+

**marked**
- Current: `^15.0.8` → Available: `16.4.0`
- Breaking changes in v16

**html2pdf.js**
- Current: `^0.10.3` → Available: `0.12.1`
- Minor version update, likely safe

**Recommendation:**
```bash
npm install uuid@latest marked@latest html2pdf.js@latest
```

---

## Update Strategy

### Phase 1: Critical Security Issues (Do First)
1. ✅ **Completed:** Safe patch/minor updates
2. **electron-forge** → Migrate to `@electron-forge/cli`
3. **electron** → Update to `29.4.6` or `35.7.5+`
4. **nodemon** → Update to `3.1.10`

### Phase 2: High Priority (Do Soon)
1. **Frontend xlsx** → Find alternative or upgrade
2. **Root koa-router** → Critical performance issue, update to v12+
3. **vite-plugin-svg-icons** → Downgrade or replace
4. **vite** → Update to latest stable

### Phase 3: Major Framework Updates (Plan Carefully)
1. **Koa ecosystem** → Update all packages together
2. **Pinia** → Update state management
3. **Testing libraries** → Update chai, sinon
4. **Utility libraries** → Update uuid, marked, etc.

### Phase 4: DevDependencies
1. Other build tools
2. Development utilities

---

## Testing Checklist

Before deploying any updates:

### Backend Testing
- [ ] All API endpoints functional
- [ ] Database operations working
- [ ] Authentication/authorization
- [ ] Error handling
- [ ] Logging functionality
- [ ] Test suite passes
- [ ] Docker build successful

### Frontend Testing  
- [ ] Application builds successfully
- [ ] All routes accessible
- [ ] State management working
- [ ] File uploads/downloads
- [ ] Excel file handling
- [ ] SVG icons loading
- [ ] Hot module replacement
- [ ] Production build optimized

### Electron Testing (if applicable)
- [ ] App packages correctly
- [ ] Native modules work
- [ ] ASAR integrity
- [ ] Auto-update functionality

---

## Commands Reference

### Check for updates
```bash
# Root
cd /workspace
npm outdated

# Frontend
cd /workspace/frontend
npm outdated
```

### Audit vulnerabilities
```bash
# Root
npm audit
npm audit --json

# Frontend
cd frontend
npm audit
npm audit --json
```

### Update specific package
```bash
npm install package-name@latest
npm install package-name@^version
```

### Run tests
```bash
# Root
npm test

# Frontend
cd frontend
npm run build
npm run dev
```

---

## Notes

- All safe updates (patch/minor) have been applied
- Breaking changes require careful testing
- Some packages (like electron-forge) have been deprecated and require migration
- The xlsx library has no compatible fix - consider alternatives
- Update dependencies incrementally, testing after each change
- Keep package-lock.json in version control to track changes

---

## Resources

- [Electron Forge Migration Guide](https://www.electronforge.io/)
- [Koa v3 Migration](https://github.com/koajs/koa/blob/master/History.md)
- [Vite Migration Guides](https://vitejs.dev/guide/migration.html)
- [Pinia v3 Changelog](https://github.com/vuejs/pinia/blob/v2/packages/pinia/CHANGELOG.md)