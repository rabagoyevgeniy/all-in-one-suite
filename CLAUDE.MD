# All-in-One Suite

## Project Goal
This repository is a platform that will combine multiple tools and services into a unified system.

Main objectives:
- build scalable services
- integrate AI agents
- automate workflows
- support modular architecture

## Architecture Overview

Planned modules:

backend/
Core API services and business logic

dashboard/
Admin interface and analytics

mobile/
Mobile application client

ai-agents/
Autonomous AI agents assisting development and operations

scripts/
Utility scripts and automation tools

## Development Rules

Claude should:

- keep architecture modular
- avoid large monolithic files
- prefer simple readable code
- document complex logic
- explain structural changes

## Code Style

Prefer:

- TypeScript
- Python for services
- modular design
- clear function naming

Avoid:

- unnecessary dependencies
- duplicated logic

## Claude Workflow

Before editing code Claude must:

1. Analyze repository structure
2. Propose solution
3. Implement minimal safe change
4. Explain modification
5. Suggest commit message

## Commit Format

Use conventional commits.

Examples:

feat: add authentication service  
fix: resolve login validation bug  
refactor: simplify routing logic