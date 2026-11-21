# 10: Release automation

**What to build:** Merging Conventional Commits to `main` leads to automated releases. release-please opens release PRs, maintains the changelog, creates GitHub Releases, and a deploy job publishes to npm through trusted publishing (no token). Mirror the `eslint-config-envylabs` release setup.

**Blocked by:** 01

**Status:** ready-for-human

- [ ] release-please config and manifest under `.github/`: `release-type: node`, `bump-minor-pre-major: true`, `bump-patch-for-minor-pre-major: false`, package name `@envylabs/url-to`, no component in tags, changelog at the root `CHANGELOG.md`
- [ ] The manifest starts at `0.0.0` (matching package metadata), so the first `feat` release is `0.1.0`
- [ ] A release workflow on push to `main`: the release-please job (contents, issues and pull-requests write) plus a deploy job that runs only when a release is created, with `id-token: write`, Node from `.tool-versions`, the npm registry URL, `npm ci --ignore-scripts`, build, `npm publish`
- [ ] The npm CLI used for publishing is new enough for trusted publishing
- [ ] No commit-message or PR-title check (Conventional Commits are kept by convention)
- [ ] **Human step:** publish a `0.0.0` placeholder by hand (`npm publish --access public`) so the package exists, then attach the trusted publisher for `envylabs/url-to` and its release workflow on npmjs.com or with `npm trust`

## Comments

- 2026-11-21: Implemented on `feat/url-to` in c1b34dd. Remaining human step: publish the `0.0.0` placeholder by hand (`npm publish --access public`), then attach the trusted publisher for `envylabs/url-to` and `release-please.yml` on npmjs.com or with `npm trust`.
