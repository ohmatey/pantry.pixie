# Contributing to Pantry Pixie

First off, thanks for considering a contribution! We're building something special, and we need people like you to help make it real.

## Code of Conduct

We're committed to providing a welcoming and inspiring community for all. Please read and follow our [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check the issue list as you might find out that you don't need to create one. When you create a bug report, include as many details as possible:

- **Use a clear, descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate those steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead**
- **Include screenshots or screen recordings if possible**
- **Include your environment** (OS, Bun version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear, descriptive title**
- **Detailed description of the suggested enhancement**
- **Possible implementation steps**
- **Why this enhancement would be useful**
- **List of related applications or features if applicable**

### Pull Requests

**Process:**
1. Fork the repo and create your branch from `main`
2. Make your changes
3. Ensure tests pass and code is formatted
4. Write or update tests for new functionality
5. Update documentation as needed
6. Submit a pull request with a clear description of changes

**Guidelines:**
- Keep PRs focused — one feature or fix per PR
- Write clear commit messages (see below)
- Add tests for any new functionality
- Update type definitions if schemas change
- Follow existing code style and conventions

### Code Style

We use TypeScript with strict mode enabled. Here are the key conventions:

**TypeScript:**
```typescript
// Use const by default
const myFunction = () => {
  // Implementation
};

// Type everything explicitly
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Use explicit return types
async function fetchUser(id: string): Promise<User> {
  // Implementation
}
```

**Naming:**
- `camelCase` for variables, functions, methods
- `PascalCase` for classes, interfaces, types
- `UPPER_SNAKE_CASE` for constants
- Use descriptive names — `getUserById` not `getUser2`

**Organization:**
- Group related imports together (external → internal → types)
- One class/interface per file (with exceptions for closely related types)
- Keep files under 300 lines where possible
- Use barrel exports in `index.ts` files

**Comments:**
- Comment the "why", not the "what"
- Use JSDoc for public APIs
- Keep comments up-to-date with code changes

### Commit Messages

We follow conventional commits. Format your messages like:

```
type(scope): description

Body paragraph explaining the change. Why was this change needed?
What problem does it solve? Any considerations or trade-offs?

Closes #123
```

**Types:**
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation changes
- `style:` Code formatting (no logic changes)
- `refactor:` Code reorganization (no behavior changes)
- `test:` Adding or updating tests
- `chore:` Dependencies, build config, etc.

**Examples:**
```
feat(chat): add intent classification for budget questions

Adds new intent type `budget_question` to classify user
messages about spending. Uses keyword matching for MVP,
will be upgraded to ML model in Q2.

Closes #42

fix(core): correct off-by-one in list pagination

Lists were returning n+1 items due to incorrect limit
calculation. Fixed by adjusting offset logic.

docs(readme): update quick start section

Added Windows Subsystem for Linux compatibility note.
