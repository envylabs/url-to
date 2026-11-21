# The Node.js version is kept in sync with .tool-versions and enforced by
# test/devcontainer.test.ts.
FROM node:26.13.1-trixie

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash-completion \
    ca-certificates \
    curl \
    less \
    perl \
    sudo \
  && rm -rf /var/lib/apt/lists/*

RUN echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node \
  && chmod 0440 /etc/sudoers.d/node

# System-level git defaults, leaving the user config free for the host's
# identity.
RUN make -C /usr/share/doc/git/contrib/diff-highlight \
  && install -m 0755 /usr/share/doc/git/contrib/diff-highlight/diff-highlight /usr/local/bin/diff-highlight \
  && git config --system alias.l "log --oneline --graph --decorate" \
  && git config --system core.pager "diff-highlight | less" \
  && git config --system interactive.diffFilter diff-highlight

# Mount points for the Claude Code and GitHub CLI config volumes, owned by node
# so the volumes start with the right owner.
RUN mkdir -p /home/node/.claude /home/node/.config/gh \
  && chown -R node:node /home/node/.claude /home/node/.config

USER node
