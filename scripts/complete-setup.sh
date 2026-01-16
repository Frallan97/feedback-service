#!/bin/bash

# Complete Setup Script for Fullstack-Starter Template
# This script copies remaining files from nordic-options-hub

set -e

NORDIC_HUB="../nordic-options-hub"
FULLSTACK_STARTER="."

echo "🚀 Completing fullstack-starter setup..."

# Check if nordic-options-hub exists
if [ ! -d "$NORDIC_HUB" ]; then
    echo "❌ Error: nordic-options-hub not found at $NORDIC_HUB"
    exit 1
fi

# Frontend - Copy remaining config files
echo "📦 Copying frontend configuration files..."
cp "$NORDIC_HUB/frontend/package.json" "$FULLSTACK_STARTER/frontend/package.json"
cp "$NORDIC_HUB/frontend/tsconfig.json" "$FULLSTACK_STARTER/frontend/tsconfig.json"
cp "$NORDIC_HUB/frontend/vite.config.ts" "$FULLSTACK_STARTER/frontend/vite.config.ts"
cp "$NORDIC_HUB/frontend/tailwind.config.js" "$FULLSTACK_STARTER/frontend/tailwind.config.js"
cp "$NORDIC_HUB/frontend/index.html" "$FULLSTACK_STARTER/frontend/index.html"
cp "$NORDIC_HUB/frontend/postcss.config.js" "$FULLSTACK_STARTER/frontend/postcss.config.js" 2>/dev/null || true

# Frontend - Copy Dockerfiles
echo "🐳 Copying frontend Docker files..."
cp "$NORDIC_HUB/frontend/Dockerfile" "$FULLSTACK_STARTER/frontend/Dockerfile"
cp "$NORDIC_HUB/frontend/Dockerfile.dev" "$FULLSTACK_STARTER/frontend/Dockerfile.dev"
cp "$NORDIC_HUB/frontend/nginx.conf" "$FULLSTACK_STARTER/frontend/nginx.conf"

# Frontend - Copy main entry files
echo "📝 Copying frontend source files..."
cp "$NORDIC_HUB/frontend/src/main.tsx" "$FULLSTACK_STARTER/frontend/src/main.tsx"
cp "$NORDIC_HUB/frontend/src/index.css" "$FULLSTACK_STARTER/frontend/src/index.css"

# Frontend - Copy auth context and components
echo "🔐 Copying authentication components..."
cp "$NORDIC_HUB/frontend/src/context/AuthContext.tsx" "$FULLSTACK_STARTER/frontend/src/context/AuthContext.tsx"
cp "$NORDIC_HUB/frontend/src/components/auth/ProtectedRoute.tsx" "$FULLSTACK_STARTER/frontend/src/components/auth/ProtectedRoute.tsx"
cp "$NORDIC_HUB/frontend/src/components/auth/UserMenu.tsx" "$FULLSTACK_STARTER/frontend/src/components/auth/UserMenu.tsx"

# Frontend - Copy utilities
cp "$NORDIC_HUB/frontend/src/lib/utils.ts" "$FULLSTACK_STARTER/frontend/src/lib/utils.ts"

# Frontend - Copy UI components (shadcn)
echo "🎨 Copying UI components..."
if [ -d "$NORDIC_HUB/frontend/src/components/ui" ]; then
    cp -r "$NORDIC_HUB/frontend/src/components/ui" "$FULLSTACK_STARTER/frontend/src/components/"
fi

# Frontend - Copy pages (Login, NotFound)
cp "$NORDIC_HUB/frontend/src/pages/Login.tsx" "$FULLSTACK_STARTER/frontend/src/pages/Login.tsx"
cp "$NORDIC_HUB/frontend/src/pages/NotFound.tsx" "$FULLSTACK_STARTER/frontend/src/pages/NotFound.tsx" 2>/dev/null || true

# Helm charts
echo "☸️  Copying Helm charts..."
if [ -d "$NORDIC_HUB/charts/options" ]; then
    cp -r "$NORDIC_HUB/charts/options/"* "$FULLSTACK_STARTER/charts/fullstack-starter/"
    # Update Chart.yaml
    sed -i 's/name: options/name: fullstack-starter/g' "$FULLSTACK_STARTER/charts/fullstack-starter/Chart.yaml" 2>/dev/null || \
    sed -i '' 's/name: options/name: fullstack-starter/g' "$FULLSTACK_STARTER/charts/fullstack-starter/Chart.yaml" 2>/dev/null || true
fi

# GitHub Actions
echo "🔧 Copying GitHub Actions workflow..."
if [ -d "$NORDIC_HUB/.github/workflows" ]; then
    cp "$NORDIC_HUB/.github/workflows/build-push.yml" "$FULLSTACK_STARTER/.github/workflows/build-push.yml"
fi

echo "✅ Setup complete!"
echo ""
echo "⚠️  Manual steps required:"
echo "  1. Review and update frontend/package.json (remove trading-specific deps)"
echo "  2. Update Helm values.yaml (image names, ingress host)"
echo "  3. Update GitHub Actions workflow (image names)"
echo "  4. Create frontend pages: Dashboard.tsx, Items.tsx"
echo "  5. Create frontend components: layout/*, items/*"
echo "  6. Create frontend App.tsx and api-client.ts"
echo "  7. Create backend controllers: auth_controller.go, item_controller.go"
echo "  8. Create backend router: handlers/router.go"
echo "  9. Create database migrations (6 files)"
echo ""
echo "See README.md for detailed instructions!"
