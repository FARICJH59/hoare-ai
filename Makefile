.PHONY: dev build test lint format type-check clean install docker-up docker-down help

## ── Development ──────────────────────────────────────────────────────────────

dev: ## Start development server
	npm run dev

build: ## Compile TypeScript
	npm run build

build-all: ## Build all workspaces with Turbo
	npm run build:all

## ── Quality ───────────────────────────────────────────────────────────────────

test: ## Run test suite
	npm test

test-all: ## Run tests across all workspaces
	npm run test:all

lint: ## Lint TypeScript files
	npm run lint

lint-fix: ## Lint and auto-fix TypeScript files
	npm run lint:fix

format: ## Format code with Prettier
	npm run format

type-check: ## Run TypeScript type checker without emitting
	npm run type-check

## ── Setup ─────────────────────────────────────────────────────────────────────

install: ## Install all dependencies (including workspaces)
	npm install

## ── Docker ────────────────────────────────────────────────────────────────────

docker-up: ## Start services with Docker Compose
	docker-compose up -d

docker-down: ## Stop Docker Compose services
	docker-compose down

docker-build: ## Build Docker images
	docker-compose build

## ── Maintenance ───────────────────────────────────────────────────────────────

clean: ## Remove build artefacts
	npm run clean

## ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
