---
description: Start development environment with DevContainer
allowed-tools: Bash
---

# Start Development Environment

Start the full development environment using DevContainer.

## Instructions

Run the following command:

```bash
./tools/contract up
```

This will:
1. Start all services (web, api, db) via docker-compose.worktree.yml
2. Wait for DevContainer to be ready
3. Install dependencies in DevContainer
4. Display access points

## Related Commands

- `./tools/contract up:logs` - View logs
- `./tools/contract up:stop` - Stop environment
- `./tools/contract up:status` - Show container status
