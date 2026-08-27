# Security Policy

## Supported versions

Only the latest published version of `main` receives security fixes.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private security advisory or contact
the maintainer directly with a description, impact assessment, and reproduction
steps.

## Scope notes

This is a browser front-end for the PixivFlow backend API:

- it contains no secrets — authentication tokens are held by the backend;
- it talks only to the configured PixivFlow backend URL;
- areas worth attention: XSS via user-provided strings rendered as HTML, and
  WebSocket origin validation.
