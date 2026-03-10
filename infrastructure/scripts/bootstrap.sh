#!/usr/bin/env bash
# Embedo — First-time development setup
# Usage: bash infrastructure/scripts/bootstrap.sh

set -e

echo "🚀 Setting up Embedo development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 20+ required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm required. Run: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }

echo "✅ Prerequisites OK"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy env file
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo "📝 Created .env.local — fill in your API keys before continuing"
else
  echo "✅ .env.local already exists"
fi

# Start infrastructure
echo "🐳 Starting Postgres + Redis..."
docker compose -f infrastructure/docker/docker-compose.yml up -d
sleep 3

# Update DATABASE_URL for local dev
if grep -q "DATABASE_URL=postgresql://postgres.\[project-ref\]" .env.local; then
  sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgresql://embedo:embedo_dev@localhost:5432/embedo|g' .env.local
  echo "✅ DATABASE_URL set to local Postgres"
fi

if grep -q "REDIS_URL=redis://localhost" .env.local; then
  echo "✅ REDIS_URL already set"
else
  echo "REDIS_URL=redis://localhost:6379" >> .env.local
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
pnpm db:generate

# Run migrations
echo "🗄️ Running database migrations..."
pnpm db:migrate

# Seed demo data
echo "🌱 Seeding demo data..."
pnpm db:seed

echo ""
echo "✅ Embedo setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your API keys (ElevenLabs, Twilio, Anthropic, etc.)"
echo "  2. Run: pnpm dev"
echo ""
echo "Available services when running:"
echo "  API Gateway:      http://localhost:3000"
echo "  Landing Page:     http://localhost:3010"
echo "  Admin Platform:   http://localhost:3011"
echo "  Prisma Studio:    pnpm db:studio"
echo "  Redis Commander:  docker compose --profile tools up"
