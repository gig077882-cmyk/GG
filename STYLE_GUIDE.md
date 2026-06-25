# Telemost Style Guide

This document defines the coding standards for the Telemost project.

## Languages

- **Comments and JSDoc:** English.
- **UI strings shown to users:** Russian.
- **Variable/function names:** English.

## Formatting

- Indent with 2 spaces.
- Use Unix line endings (`LF`).
- Files are encoded as UTF-8 without BOM.
- Always add a trailing newline.
- Use single quotes for strings unless double quotes are required (e.g., HTML attributes).

## Naming

- `camelCase` for variables, functions, methods, and properties.
- `PascalCase` for classes and constructors.
- `SCREAMING_SNAKE_CASE` for constants and enums.
- `kebab-case` for file names.

## Comments

- Use JSDoc for every exported function and module-level constant.
- Include `@param`, `@returns`, and `@typedef` where applicable.
- Use `//` for inline explanations and `/* */` for section headers when needed.

## Code Organization

### Backend (`src/server/`)

Each module has a single responsibility:

- `config.js` — environment variables and validation.
- `constants.js` — numeric limits and magic values.
- `storage.js` — SQLite helpers.
- `rooms.js` — room state and lifecycle.
- `participants.js` — participant state inside rooms.
- `signaling.js` — WebSocket connection handling.
- `ice.js` — ICE server configuration endpoint.
- `files.js` — file upload and download endpoints.
- `index.js` — server bootstrap.

### Frontend (`public/js/`)

Each module has a single responsibility:

- `main.js` — application entry point and top-level event wiring.
- `state.js` — global state object and constants.
- `dom.js` — DOM element references and helper functions.
- `api.js` — HTTP API wrappers.
- `ws.js` — WebSocket connection and message dispatch.
- `webrtc.js` — RTCPeerConnection, offers, answers, ICE handling.
- `audio.js` — microphone, audio context, noise suppression.
- `video.js` — camera and screen-share video sources.
- `chat.js` — chat UI and file messages.
- `demo.js` — screen-demo window and viewport controls.
- `commands.js` — CMD-style command parser and handlers.
- `theme.js` — color theme settings.
- `storage.js` — localStorage helpers.
- `mobile.js` — mobile tab/panel behavior.
- `utils.js` — formatting, validation, and ID helpers.

## Error Handling

- Prefer early returns.
- Wrap optional DOM access in null checks.
- Log user-facing errors with `log()` on the client and `console.error()` on the server.

## Dependencies

- Server: Express and `ws` only.
- Browser: no build-time dependencies; ES modules loaded with `<script type="module">`.
