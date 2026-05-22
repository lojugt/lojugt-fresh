# Loju Fresh Web Application (`lojugt-fresh`)

A Deno Fresh web application that serves and renders markdown notes published directly from an Obsidian vault.

This repository is the frontend component of the Loju ecosystem. The Obsidian plugin used to publish notes is hosted in the [lojugt-plugin](https://github.com/lojugt/lojugt-plugin) repository.

## Use Case

This web application enables seamless, instant publishing of personal markdown notes directly from a local Obsidian vault to a public website. The server exposes a secure ingest API endpoint (`/api/ingest`) that receives JSON payloads from the Obsidian plugin. When the plugin pushes new, updated, or deleted notes, they are immediately stored or removed in Deno KV. The Deno Fresh app then dynamically retrieves and renders these notes on the fly, eliminating any build delay.

## Project Vision & Inspiration

Together, these repositories form **Loju**, a custom, lightweight, edge-native note-publishing pipeline. The project is inspired by traditional static-site-generator publishing setups (like Hugo, Jekyll, or Astro) and official Obsidian Publish, but aims for a zero-build, dynamic, database-driven approach. By utilizing Deno Fresh for speedy server-side rendering and Deno KV for lightweight, edge-native storage, it avoids slow rebuilds or full site redeploys, replacing them with instant database updates. Visually, the site features a bold, graphic aesthetic with Korean/Japanese-inspired headings (`Do Hyeon` and `Dela Gothic One`) and a clean monospace body font (`JetBrains Mono`).

## Development

```bash
# Start the local development server
deno task start
```