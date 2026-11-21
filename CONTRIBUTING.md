# Contributing

Thanks for helping with `@envylabs/url-to`. This guide covers setting up a development environment and running the checks CI runs. For using the library, see the [README](README.md).

## Setup with the Dev Container (recommended)

The repository includes a [Dev Container](https://containers.dev) with the pinned Node.js version, the GitHub CLI, Claude Code and the project's editor extensions. Dependencies are installed with `npm ci` when the container is created.

You need:

- Docker or a compatible container runtime.
- VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension, or another tool that supports Dev Containers.

Open the repository and choose **Reopen in Container**. Once it's running, sign in to the GitHub CLI, which the project uses for issue tracking:

```sh
gh auth login
```

You only need to do this once. The sign-in is kept in a volume, so it survives container rebuilds.

## Setup without the container

1. Install the Node.js version listed in [`.tool-versions`](.tool-versions), for example with [asdf](https://asdf-vm.com) or [mise](https://mise.jdx.dev).
2. Install dependencies from the lockfile:

   ```sh
   npm ci
   ```

VS Code recommends the same editor extensions the container installs.

## Checks

CI runs these checks on every push and pull request. Run them locally before pushing:

| Check                            | Command                   |
| -------------------------------- | ------------------------- |
| Lint                             | `npm run lint`            |
| Typecheck                        | `npm run typecheck`       |
| Typecheck against TypeScript 5.5 | `npm run typecheck:ts5.5` |
| Test                             | `npm test`                |
| Build                            | `npm run build`           |
| publint                          | `npm run check:publint`   |
| Are the Types Wrong              | `npm run check:attw`      |

publint inspects the build output, so run `npm run build` first. `npm run check:package` runs both package checks.

CI also runs the tests on every Node.js version the package supports (22, 24 and 26). The other checks run on the version in `.tool-versions`.

## Changing the Node.js version

The Dev Container's Node.js version (the `FROM` line in `.devcontainer/Dockerfile`) and `.tool-versions` must change together. A test in `test/devcontainer.test.ts` fails if they disagree, so `npm test` catches a missed update.
