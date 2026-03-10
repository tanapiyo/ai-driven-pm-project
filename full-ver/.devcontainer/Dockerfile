FROM node:25

ARG TZ
ENV TZ="$TZ"

ARG CLAUDE_CODE_VERSION=latest
ARG PNPM_VERSION=9.15.0

# ==============================================================================
# Node.js Monorepo Development Container
# Optimized for pnpm workspace with TypeScript/React projects
# ==============================================================================

# Install base development tools and firewall dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  curl \
  wget \
  gh \
  # Firewall/network tools (required for outbound restrictions)
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  # Editors
  nano \
  vim \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable corepack and install pnpm
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist shell history
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set DEVCONTAINER environment variable
ENV DEVCONTAINER=true

# Create workspace and config directories
RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

# Install git-delta for better diffs
ARG GIT_DELTA_VERSION=0.18.2
RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  dpkg -i "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  rm "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb"

# ==============================================================================
# Terraform CLI
# https://developer.hashicorp.com/terraform/install
# ==============================================================================
ARG TERRAFORM_VERSION=1.11.2
RUN ARCH=$(dpkg --print-architecture) && \
  wget -q "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${ARCH}.zip" \
       -O /tmp/terraform.zip && \
  unzip /tmp/terraform.zip -d /usr/local/bin && \
  rm /tmp/terraform.zip && \
  terraform --version

# ==============================================================================
# AWS CLI v2
# https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-linux.html
# ==============================================================================
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "x86_64" ]; then AWS_ARCH="x86_64"; \
  elif [ "$ARCH" = "aarch64" ]; then AWS_ARCH="aarch64"; \
  else echo "Unsupported architecture: $ARCH" && exit 1; fi && \
  wget -q "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" \
       -O /tmp/awscliv2.zip && \
  unzip /tmp/awscliv2.zip -d /tmp && \
  /tmp/aws/install && \
  rm -rf /tmp/awscliv2.zip /tmp/aws && \
  aws --version

# Set up non-root user
USER node

# Install global npm packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# pnpm store directory for monorepo optimization
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN mkdir -p $PNPM_HOME

# Set zsh as default shell
ENV SHELL=/bin/zsh

# Set default editor
ENV EDITOR=nano
ENV VISUAL=nano

# Setup zsh with oh-my-zsh and powerlevel10k
ARG ZSH_IN_DOCKER_VERSION=1.2.0
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -x

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Copy firewall initialization script
COPY init-firewall.sh /usr/local/bin/
COPY allowlist.domains /usr/local/etc/devcontainer/

# Copy git wrapper to prevent --no-verify
# Place in /usr/local/bin which comes before /usr/bin in PATH
COPY git-wrapper.sh /usr/local/bin/git
RUN chmod +x /usr/local/bin/git

# Setup firewall script permissions (requires root)
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall

# Switch back to non-root user
USER node
