# Code Conventions

Follow these conventions to maintain consistency across the codebase. All code must pass **ESLint** and **Prettier** checks.

## Naming Conventions

### Files & Directories

| Type        | Convention                 | Example              |
| ----------- | -------------------------- | -------------------- |
| Directories | kebab-case                 | `my-directory-name/` |
| Classes     | PascalCase                 | `MyClassName.ts`     |
| Interfaces  | PascalCase with `I` prefix | `IUserService.ts`    |
| Assets      | kebab-case                 | `my-asset-name.png`  |

### Code Elements

**Classes & Properties:**

- Omit `public` keyword (it's the default)
- Prefix private/protected members with underscore: `_myPrivateMethod()`
- Use `readonly` for immutable properties after initialization

**Events:**

- Use kebab-case: `user-logged-in`, `data-updated`
- Separate namespaces with colons: `local-avatar:jump`, `profile:update-gender`

**Entities:**

- Use PascalCase: `LocalAvatar`, `MainCamera`
- For dynamic names, use consistent patterns: `LocalAvatar_${variant}`

## Best Practices

### 1. Private/Protected Members

Always prefix private and protected members with an underscore (`_`) to clearly distinguish them from public APIs.

```ts
class Player {
  // ❌ Bad
  private health: number = 100;

  // ✅ Good
  private _health: number = 100;
}
```

### 2. Use Accessors Over Methods

Prefer `get`/`set` accessors for simple property access instead of explicit getter/setter methods.

```ts
class Counter {
  private _value: number = 0;

  // ❌ Bad
  getValue(): number {
    return this._value;
  }

  // ✅ Good
  get value(): number {
    return this._value;
  }
}
```

**Reference:** [TypeScript Accessors](https://www.typescriptlang.org/docs/handbook/classes.html#accessors)

### 3. Minimize Object Instantiation

Reuse temporary objects in performance-critical code to reduce memory allocation and garbage collection pressure.

```ts
// Create reusable temporary at module level
const _tempVec = new pc.Vec3();

// ❌ Bad - Creates new object every call
function getScaledLength(v: pc.Vec3, scale: number): number {
  return new pc.Vec3().copy(v).mulScalar(scale).length();
}

// ✅ Good - Reuses temporary object
function getScaledLength(v: pc.Vec3, scale: number): number {
  return _tempVec.copy(v).mulScalar(scale).length();
}
```

**When to use:**

- ✅ Hot paths (functions called every frame)
- ✅ Physics calculations
- ✅ Animation updates
- ❌ Initialization code
- ❌ User-triggered events

**Caution:** Only use for frequently-called functions where performance matters. Benchmark to verify the optimization is necessary.

## Enforcement

- **Pre-commit hooks** run ESLint and Prettier automatically
- **CI/CD pipeline** checks code style on all pull requests
- **IDE setup** recommended: Install ESLint and Prettier extensionss
