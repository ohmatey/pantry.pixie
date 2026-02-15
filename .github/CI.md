# Continuous Integration & Deployment

This document describes the CI/CD setup for Pantry Pixie.

## Workflows

### 1. CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Jobs:**

1. **Lint & Type Check**
   - Runs ESLint
   - Runs TypeScript type checking
   - Fast feedback on code quality

2. **Test**
   - Spins up PostgreSQL 16 container
   - Runs database migrations
   - Executes test suite with Bun
   - Generates coverage report
   - Uploads to Codecov (optional)

3. **Build**
   - Builds all 4 packages (core, sdk, cli, web)
   - Verifies build artifacts exist
   - Runs after lint and test pass

4. **Security**
   - Runs `bun pm audit` for dependency vulnerabilities
   - Continues on error (non-blocking)

5. **All Checks Passed**
   - Meta job that verifies all previous jobs succeeded
   - Used as required status check for branch protection

**Environment Variables:**
- `BUN_VERSION`: 1.3.9
- `DATABASE_URL`: PostgreSQL connection for tests
- `JWT_SECRET`: Test JWT secret
- `NODE_ENV`: test

---

### 2. PR Checks Workflow (`pr-checks.yml`)

**Triggers:**
- Pull request opened, synchronized, or reopened

**Jobs:**

1. **PR Title Validation**
   - Enforces conventional commit format
   - Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
   - Scope is optional

2. **Documentation Check**
   - Warns if source code changed but no docs updated
   - Non-blocking reminder
   - Helps maintain documentation quality

3. **Bundle Size Check**
   - Builds packages and reports sizes
   - Helps track bundle bloat
   - Informational only (non-blocking)

4. **Commit Message Lint**
   - Checks all commits in PR follow conventional format
   - Warns on non-compliant messages
   - Non-blocking

5. **PR Summary Comment**
   - Posts automated comment with check results
   - Provides quick visibility of PR health

---

### 3. Release Workflow (`release.yml`)

**Triggers:**
- Git tags matching `v*.*.*` (e.g., `v1.0.0`)
- Manual workflow dispatch with version input

**Jobs:**

1. **Verify Build**
   - Full CI validation (lint, type check, build, test)
   - Ensures release quality

2. **Docker Image Build & Push**
   - Multi-stage build for optimized production image
   - Multi-platform: linux/amd64, linux/arm64
   - Pushes to GitHub Container Registry (ghcr.io)
   - Tags: version, major.minor, major, sha
   - Uses GitHub Actions cache for faster builds

3. **GitHub Release**
   - Automatically generates changelog from commits
   - Creates GitHub release with notes
   - Marks pre-releases (e.g., `v1.0.0-beta.1`)

4. **Production Deployment**
   - Placeholder for deployment automation
   - Only runs on version tags (not manual dispatch)
   - Requires `production` environment approval in GitHub

**Permissions:**
- `contents: write` — Create releases
- `packages: write` — Push Docker images

---

## Dependency Management

### Dependabot (`dependabot.yml`)

**NPM Dependencies:**
- Weekly updates on Mondays at 09:00
- Groups minor and patch updates together
- Separates dev dependency updates
- Labels: `dependencies`, `automated`
- Commit message prefix: `chore`

**GitHub Actions:**
- Weekly updates on Mondays at 09:00
- Labels: `ci`, `dependencies`, `automated`
- Commit message prefix: `ci`

**Configuration:**
- Max 10 open PRs at a time
- Conventional commit format enforced
- Auto-labels for easy filtering

---

## Branch Protection

Recommended settings for `main` branch:

- ✅ Require status checks to pass before merging
  - Required checks: `All Checks Passed`, `PR Title Validation`
- ✅ Require branches to be up to date before merging
- ✅ Require linear history
- ✅ Do not allow bypassing the above settings
- ⚠️ Optional: Require pull request reviews (1+ approvers)
- ⚠️ Optional: Require signed commits

---

## Secrets

Required GitHub Secrets:

1. **GITHUB_TOKEN** — Automatically provided by GitHub Actions
   - Used for: Creating releases, pushing Docker images, commenting on PRs

2. **CODECOV_TOKEN** (optional)
   - Used for: Uploading code coverage to Codecov
   - Set at: Settings → Secrets → Actions → New repository secret

Future secrets (for deployment):

3. **DEPLOY_SSH_KEY** — SSH key for production server
4. **OPENAI_API_KEY** — OpenAI API key for production
5. **DATABASE_URL** — Production database connection
6. **JWT_SECRET** — Production JWT signing secret

---

## Docker

### Multi-Stage Build

The `Dockerfile` uses a 4-stage build process:

1. **base** — Sets working directory and base image
2. **deps** — Installs all dependencies (including dev)
3. **builder** — Builds all packages
4. **runner** — Production image with only runtime dependencies

**Optimizations:**
- Non-root user (`bunuser`)
- Multi-platform support (amd64, arm64)
- Layer caching for faster builds
- Minimal runtime image
- Health check endpoint

### Docker Compose

`docker-compose.yml` provides:
- PostgreSQL 16 database
- Pantry Pixie web server
- Automatic health checks
- Named volumes for data persistence
- Custom network

**Usage:**
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

---

## Local Development

### Running CI Locally

You can run CI checks locally before pushing:

```bash
# Lint
bun run lint

# Type check
bun run type-check

# Tests (requires PostgreSQL)
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pantry_pixie_test"
export JWT_SECRET="test-secret"
bun test

# Build
bun run build

# Security audit
bun pm audit
```

### Testing Docker Build

```bash
# Build image
docker build -t pantry-pixie:test .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="test" \
  -e OPENAI_API_KEY="sk-test" \
  pantry-pixie:test

# Check health
curl http://localhost:3000/health
```

---

## Troubleshooting

### CI Failures

**Lint errors:**
- Run `bun run lint` locally
- Fix or disable rules in `.eslintrc.json`
- Use `// eslint-disable-next-line` for exceptions

**Type errors:**
- Run `bun run type-check` locally
- Fix type issues in your IDE
- Check `tsconfig.json` for strict mode settings

**Test failures:**
- Ensure PostgreSQL is running locally
- Check `DATABASE_URL` environment variable
- Review test output for specific failures
- Run `bun test --watch` for interactive debugging

**Build failures:**
- Check package dependencies
- Verify TypeScript compilation
- Review build output for specific errors

### Docker Issues

**Build fails:**
- Check Dockerfile syntax
- Verify all file paths exist
- Review `.dockerignore` for excluded files

**Container won't start:**
- Check environment variables
- Review logs: `docker logs <container-id>`
- Verify database connection
- Check health endpoint

**Image too large:**
- Review `.dockerignore` exclusions
- Check for unnecessary dependencies
- Use `docker images` to inspect size

---

## Best Practices

1. **Conventional Commits**
   - Use format: `type(scope): description`
   - Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
   - Enables automated changelogs

2. **Pull Request Titles**
   - Same format as commits
   - Used for squash merge commit messages
   - Enforced by `pr-checks.yml`

3. **Testing**
   - Write tests for new features
   - Maintain or improve code coverage
   - Use descriptive test names

4. **Documentation**
   - Update README.md when features change
   - Update CLAUDE.md for architecture changes
   - Keep inline code comments current

5. **Versioning**
   - Follow Semantic Versioning (semver)
   - Tag format: `v{major}.{minor}.{patch}`
   - Pre-releases: `v1.0.0-beta.1`, `v1.0.0-rc.1`

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Bun Documentation](https://bun.sh/docs)
