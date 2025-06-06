#!/usr/bin/env bash
# Setup script to install dependencies using Bun.
# Runs in prebuild environment before network access is disabled.

set -euo pipefail

# Install all dependencies defined in package.json (including Next.js)
echo "Installing packages with bun..."
bun install

