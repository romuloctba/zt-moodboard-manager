# Integration Tests

This directory contains integration tests that verify cross-repository interactions and cascade operations.

## Structure

```
integration/
├── database/           # Database layer integration tests
│   ├── cascadeDelete.test.ts    # Cascade delete operations (DI-001 to DI-013)
│   ├── duplicate.test.ts        # Duplicate operations (DI-014 to DI-026)
│   └── consistency.test.ts      # Cross-repository consistency (DI-027 to DI-034)
└── sync/               # Sync integration tests
    └── syncService.test.ts      # Sync operations (SY-001, SY-004)
```

### Storage Layer Integration (SI-001 to SI-005)

Storage layer integration tests require browser APIs (Canvas, OPFS) not available in Node.js/vitest:
- **SI-001, SI-003**: Moved to E2E tests (Playwright) - require real browser
- **SI-002, SI-005**: Already covered by unit tests (imageRepository.test.ts, fileStorage.test.ts)
- **SI-004**: Removed - navigator.storage.estimate() doesn't provide file-level granularity

## Key Differences from Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| Scope | Single function/method | Multiple repositories working together |
| Database | Real (fake-indexeddb) | Real (fake-indexeddb) |
| Mocking | Mock dependencies | Minimal mocking (only external services) |
| Focus | Isolated behavior | Cross-cutting concerns |

## Running Integration Tests

```bash
# Run all integration tests
pnpm test src/__tests__/integration

# Run specific category
pnpm test src/__tests__/integration/database
pnpm test src/__tests__/integration/storage
pnpm test src/__tests__/integration/sync
```

## Test Naming Convention

Tests follow the TEST_CASES.md naming scheme:
- `DI-xxx`: Database Integration
- `SI-xxx`: Storage Integration
- `SY-xxx`: Sync Integration
