# Nexus Frontend

An AI chat and knowledge-management application built with Expo for Android, iOS, and the web.

## Features

- **AI Chat** — Real-time SSE chat powered by DeepSeek, with multiple conversations.
- **AI Note Generation** — Generate structured Markdown notes, titles, and tags from a conversation.
- **Document Management** — Browse, view, create, and categorize notes.
- **Authentication** — Registration, login, automatic token refresh, and JWT access/refresh tokens.

## Technology Stack

| Category | Technology |
|------|------|
| Framework | Expo SDK 56 + React Native 0.85 |
| Routing | Expo Router with file-based, type-safe routes |
| State management | Zustand |
| HTTP | Axios with automatic token refresh |
| Animation | react-native-reanimated 4.3 |
| Icons | react-native-svg 15 |
| Markdown | react-native-markdown-display |
| Language | TypeScript 6.0 in strict mode |

## Quick Start

```bash
cd app

# Install dependencies
npm install

# Start web development mode
npx expo start --web

# Start Android
npx expo start --android

# Start iOS (macOS and Xcode required)
npx expo start --ios
```

> Start the backend before developing the frontend. See the [backend setup guide](../backend/SETUP.md).

## Project Structure

```text
app/
├── assets/                      # Images and Expo icon assets
├── src/
│   ├── app/                     # Expo Router pages
│   │   ├── (auth)/              # Login and registration pages
│   │   └── (app)/               # Authenticated chat, documents, and profile pages
│   ├── components/              # Reusable UI components
│   ├── services/                # API services and token storage
│   ├── stores/                  # Zustand stores
│   ├── types/                   # TypeScript type definitions
│   ├── hooks/                   # Custom hooks
│   ├── mocks/                   # Local mock data
│   ├── constants/               # Theme constants
│   └── global.css               # Global styles for web
├── app.json                     # Expo configuration
├── package.json
└── tsconfig.json
```

## Conventions

- Path aliases: `@/*` maps to `./src/*`; `@/assets/*` maps to `./assets/*`.
- Platform-specific files: `*.web.tsx` overrides `*.tsx` for web builds.
- Every page and component must support Android, iOS, and the web.
- Use `USE_MOCKS` in `chat.store.ts` to switch to local mock data during development.
- Configure the API URL with `EXPO_PUBLIC_API_URL` in `.env`.

## Related Documentation

- [Backend README](../backend/README.md) — API endpoints, technology stack, and deployment.
- [Development Setup](../backend/SETUP.md) — Integration, Docker configuration, and troubleshooting.
