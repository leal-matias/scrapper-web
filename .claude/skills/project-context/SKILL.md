---
name: project-context
description: Deep architectural knowledge for scrapper-web — bootstrap state, qubika-agentic-framework integration options, AI tooling gitignore conventions, and decisions required before development begins. Load when scaffolding the project or deciding on tech stack.
disable-model-invocation: false
version: 3.0
---

# Project Context: scrapper-web

A web scraping project (`scrapper-web`) in **bootstrap phase** — the repository exists with only `README.md` and `.gitignore`. No application source code has been written yet.

## When to Use This Skill

- First time setting up the project for development
- Deciding on tech stack, runtime, or framework
- Understanding how `qubika-agentic-framework` should be referenced as a dependency
- Preserving or extending the established `.gitignore` AI tooling conventions
- Planning the directory structure before writing first source files
- Onboarding a new contributor to a pre-code-phase project

## Architecture Deep Dive

### Current State

The repository contains exactly two tracked files:

| File | Contents |
|------|----------|
| `README.md` | Single line: `# scrapper-web` — no description |
| `.gitignore` | AI tool temp dirs + `qubika-agentic-framework/` exclusion |

The `qubika-agentic-framework/` directory **exists on disk locally** but is **excluded from version control**. It is a sibling-style local dependency, actively developed alongside this project.

### Key Architectural Decisions Still Required

| Decision | Status | Impact |
|----------|--------|--------|
| Backend language / runtime | ❓ Undecided | Drives manifest, directory structure, test tooling |
| Web scraping library | ❓ Undecided | Playwright, Puppeteer, Scrapy, Colly, etc. |
| Data storage | ❓ Undecided | PostgreSQL, MongoDB, flat files, S3 |
| API surface | ❓ Undecided | REST, GraphQL, CLI-only, or none |
| `qubika-agentic-framework` integration method | ❓ Undecided | Affects manifest, CI, and contributor setup |

## qubika-agentic-framework Relationship

The framework is present locally at `qubika-agentic-framework/` but gitignored. Three integration patterns are possible:

### Option A — Local Workspace Dependency (Recommended for active co-development)

If both repos are developed concurrently, use a workspace link so changes in the framework reflect immediately:

**Node.js (pnpm):**
```jsonc
// package.json at root
{
  "workspaces": [".", "qubika-agentic-framework"]
}
```

**Python (uv):**
```toml
# pyproject.toml
[tool.uv.sources]
qubika-agentic-framework = { path = "./qubika-agentic-framework", editable = true }
```

- ✅ Immediate reflection of framework changes
- ⚠️ Contributors must clone/copy the framework directory themselves

### Option B — Published Package (Recommended once framework is stable)

```bash
# After publishing:
npm install @qubika/agentic-framework
# or
pip install qubika-agentic-framework
```

- ✅ Clean dependency management, works for all contributors out of the box
- ⚠️ Requires publishing cycle for framework changes

### Option C — Git Submodule

```bash
git submodule add <framework-repo-url> qubika-agentic-framework
```

- ✅ Framework version is pinned per-commit
- ⚠️ **Conflict**: the current `.gitignore` explicitly lists `qubika-agentic-framework/` — this entry MUST be removed before adding as a submodule, or git will refuse to track it

> **Gotcha for Option C:** Running `git submodule add` against a path that appears in `.gitignore` will fail silently or produce unexpected behavior. Always remove the `.gitignore` entry first:
>
> ```bash
> # Remove from .gitignore, then:
> git submodule add https://github.com/qubika/qubika-agentic-framework qubika-agentic-framework
> git add .gitignore .gitmodules qubika-agentic-framework
> git commit -m "Add qubika-agentic-framework as submodule"
> ```

## AI Tooling Conventions

The `.gitignore` establishes a consistent convention for AI-assisted development with two toolchains:

### Claude Code
| Directory | Purpose |
|-----------|---------|
| `.claude-temp/` | Working scratch space during file generation |
| `.claude-backups/` | Pre-destructive-operation snapshots |

### Codex / Cursor
| Directory | Purpose |
|-----------|---------|
| `.codex-temp/` | Working scratch space for Codex/Cursor |
| `.codex-backups/` | Pre-operation backup snapshots |

**Why these are gitignored:** AI tool artifacts are ephemeral, machine-specific, and often large. Committing them would pollute git history and cause unnecessary diffs for collaborators.

**Preserve this convention** when updating `.gitignore` — these four entries should always remain excluded regardless of tech stack changes.

## Critical Workflows

### Bootstrapping the Project (First Commit of Real Code)

Perform these steps in order once the tech stack is decided:

1. **Initialize manifest**
   - Node.js: `npm init -y` or `pnpm init`
   - Python: `uv init` or `poetry new scrapper-web`
   - Go: `go mod init github.com/qubika/scrapper-web`

2. **Link qubika-agentic-framework** — choose one of the three options documented above

3. **Scaffold directory structure** — establish `src/` (or equivalent), `tests/`, `docs/`

4. **Add quality tooling**
   - Node.js: ESLint + Prettier (`npm install -D eslint prettier`)
   - Python: Ruff (`uv add --dev ruff`)
   - Go: `golangci-lint`

5. **Configure test runner** — Jest, pytest, `go test`, etc.

6. **Add CI/CD workflow** at `.github/workflows/ci.yml`

7. **Update `README.md`** — add project description, prerequisites, setup instructions, usage examples

8. **Update CLAUDE.md** — fill in actual tech stack, real file placement patterns, and real commands

### Extending the .gitignore

When adding new tooling, follow the existing comment-block style:

```
# AI Agentic Framework files
.claude-temp/
.codex-temp/
.claude-backups/
.codex-backups/
qubika-agentic-framework/

# Node.js (add when applicable)
node_modules/
dist/
.env

# Python (add when applicable)
__pycache__/
.venv/
*.pyc
```

## Multi-File Change Checklists

### When adding source code for the first time

- [ ] Decide and document tech stack decision (update CLAUDE.md `## Tech Stack`)
- [ ] Create language manifest (`package.json`, `pyproject.toml`, `go.mod`, etc.)
- [ ] Create `src/` (or equivalent) directory with initial entry point
- [ ] Decide on `qubika-agentic-framework` integration method and link it
- [ ] Add linter/formatter config (`.eslintrc`, `ruff.toml`, `.golangci.yml`)
- [ ] Create `.env.example` if any runtime config is needed
- [ ] Add `.github/workflows/ci.yml` for CI
- [ ] Update `README.md` with description, prerequisites, setup, usage
- [ ] Update `CLAUDE.md` File Placement Guide and Essential Commands with real values
- [ ] Update this `SKILL.md` with actual architecture patterns once code exists

### When setting up the test suite

- [ ] Install test framework matching chosen language
- [ ] Create `tests/` or `__tests__/` directory (or co-location pattern)
- [ ] Add at least one smoke test validating the framework integration
- [ ] Add `test` script to manifest
- [ ] Document test strategy in this SKILL.md under a new `## Testing Strategy` section
- [ ] Add test step to CI workflow

### When a new contributor clones the repo

- [ ] Clone this repo: `git clone <url>`
- [ ] Separately obtain/clone `qubika-agentic-framework` into the project root (until Option B is chosen)
- [ ] Follow README setup instructions (once they exist)
- [ ] Verify AI tooling temp dirs (`claude-temp/`, `.codex-temp/`) are gitignored in local env

## Conventions Deep Dive

### Naming Convention

`scrapper-web` uses **kebab-case** — apply consistently to:
- Directory names
- npm package name (e.g., `"name": "scrapper-web"` in package.json)
- Python project name (e.g., `name = "scrapper-web"` in pyproject.toml)
- Docker image tags, CI job names, environment variable prefixes (`SCRAPPER_WEB_*`)

**Rationale:** Kebab-case is the convention for repository names on GitHub/GitLab and npm package names; using it everywhere removes ambiguity about casing when referencing the project.

### AI Tooling Isolation Philosophy

The four AI tooling directories are gitignored rather than committed because:
1. **They're ephemeral** — regenerated on each tool invocation
2. **They're machine-specific** — paths and content differ per developer
3. **They're potentially large** — backup snapshots can accumulate GB of data
4. **They're not source of truth** — the source files themselves are the artifact, not the tool's working state

This is a deliberate engineering choice to keep git history clean and diffs meaningful.

### qubika-agentic-framework as Sibling (Current Pattern)

Keeping the framework as a gitignored sibling directory (rather than a submodule or installed package) is a **co-development pattern** — it signals that the framework and this application are being built together, with the framework evolving to support the application's needs. Once the framework API stabilizes, migrate to Option B (published package) to simplify contributor onboarding.