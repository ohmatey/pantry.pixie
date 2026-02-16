# Running Tests

## Prerequisites

Most tests require PostgreSQL to be running. The quickest way to set this up locally:

```bash
# Start PostgreSQL via Docker
docker run -d \
  --name pantry-pixie-test-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=pantry_pixie_test \
  -p 5432:5432 \
  postgres:16-alpine

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pantry_pixie_test"

# Run tests
bun test
```

## Test Organization

- **Unit tests** (`*.unit.test.ts`) - Test individual functions/modules
- **E2E tests** (`*.e2e.test.ts`) - Test HTTP API endpoints with real server
- **Playwright tests** (`e2e-tests/*.spec.ts.skip`) - Browser automation tests (currently disabled)

## In CI

The GitHub Actions workflow automatically:
1. Starts PostgreSQL service
2. Sets DATABASE_URL
3. Runs migrations
4. Executes all tests

Tests that require DATABASE_URL will fail locally if PostgreSQL is not running.
