#!/usr/bin/env bash
set -euo pipefail
# Install dependencies using Bun before network cutoff
bun install --frozen-lockfile --no-progress
