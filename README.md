# Validator Monorepo

A modern monorepo containing a React frontend and Node.js/Express backend.

## Project Structure

```
validator/
├── packages/
│   ├── frontend/    # React application with Vite
│   └── backend/     # Node.js/Express API server
└── package.json     # Workspace root configuration
```

## Getting Started

### Prerequisites

- Node.js (see `.nvmrc` for version)
- npm 7+ (for workspace support)

### Installation

```bash
npm install
```

### Development

Start both frontend and backend in development mode:

```bash
npm run start:dev
```

### Available Scripts

- `npm run bootstrap` - Install dependencies for all packages
- `npm run start:dev` - Start all packages in development mode
- `npm run lint` - Run linting across all packages

## Packages

- **frontend** - React application built with Vite
- **backend** - Express API server with CORS support
