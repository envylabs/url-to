# AGENTS.md

`@envylabs/url-to`: typed, validated construction of known paths and URLs.

## Invariants

Every change keeps these public promises:

- ESM-only, with no CommonJS build ([ADR 0002](docs/adr/0002-standard-schema-and-own-uri-template-engine.md)).
- TypeScript 5.5 is the minimum supported version ([README Installation](README.md#installation)).
- Error messages never include Route Parameter values ([README Errors](README.md#errors)).

## Dependencies

The package has no runtime dependencies. Add one only with a clear need, and say why in the PR.

## Contributing rules

[`CONTRIBUTING.md`](CONTRIBUTING.md) holds the rules for humans and agents alike: [Tests](CONTRIBUTING.md#tests), [Commits](CONTRIBUTING.md#commits) and [Style](CONTRIBUTING.md#style). Run every check in its [Checks table](CONTRIBUTING.md#checks) before calling a change done.

Never add LLM attribution, such as `Co-Authored-By` trailers or "Generated with Claude Code", to commits or PRs. They carry only the human author's name.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `envylabs/url-to` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
