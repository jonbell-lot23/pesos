#!/bin/bash

# PESOS Setup Script
# Ensures Bun is installed and the project is ready for development

set -e

echo "🔧 Setting up PESOS development environment..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "📦 Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    
    # Add Bun to PATH for current session
    export PATH="$HOME/.bun/bin:$PATH"
    
    # Source bashrc to ensure PATH is updated
    if [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc"
    fi
    
    echo "✅ Bun installed successfully"
else
    echo "✅ Bun is already installed ($(bun --version))"
fi

# Verify bunx is available
if ! command -v bunx &> /dev/null; then
    echo "❌ bunx not found in PATH. Please restart your terminal or run: source ~/.bashrc"
    exit 1
fi

# Install dependencies
echo "📦 Installing project dependencies..."
bun install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
bunx prisma generate

echo "🎉 Setup complete! You can now run:"
echo "  bun run dev     # Start development server"
echo "  bun run build   # Build for production"
echo "  bun run test    # Run tests"