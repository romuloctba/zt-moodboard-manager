# Integration Tests

This directory contains integration tests that verify cross-repository interactions and cascade operations.

## Structure

```
integration/
├── database/           # Database layer integration tests
│   ├── cascadeDelete.test.ts    # Cascade delete operations (DI-001 to DI-013)
│   └── duplicate.test.ts        # Duplicate operations (DI-014 to DI-026)
├── storage/            # Storage layer integration tests
│   └── imageFlow.test.ts        # Image upload/delete flow (SI-001 to SI-005)
└── sync/               # Sync integration tests
    └── syncFlow.test.ts         # Sync operations (SY-001 to SY-012)
```

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
