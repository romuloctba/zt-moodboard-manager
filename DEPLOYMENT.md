# Deployment Guide

This Next.js application supports two deployment modes:

1. **Static Export** - For Apache/static hosting (no Node.js required)
2. **Standard Build** - For Node.js servers (Vercel, self-hosted, etc.)

---

## Option 1: Static Export (Apache Server)

Use this when deploying to an Apache web server or any static file hosting.

### Building for Static Export

```bash
pnpm run build:static
```

This creates an `out/` directory with all static files ready for deployment.
The `.htaccess` file is automatically copied to handle routing with the `/moodboard-manager/` base path.

### Deployment to Apache Server

#### Prerequisites

- Apache server with `mod_rewrite` enabled
- Access to upload files to your web server

#### Deploy Steps

1. Build the static export:
   ```bash
   pnpm run build:static
   ```

2. Upload the contents of the `out/` directory to your server's `/moodboard-manager/` folder

3. Ensure the `.htaccess` file is included (it's automatically copied during build)

### .htaccess Configuration

The project includes a pre-configured `.htaccess` file:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /moodboard-manager/
  
  # Don't rewrite files or directories that exist
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to 404.html within the base path
  RewriteRule ^(.*)$ /moodboard-manager/404.html [L]
</IfModule>
```

This configuration:
- Enables URL rewriting for client-side routing
- Serves existing static files directly
- Redirects all other requests to `404.html` which handles client-side navigation

---

## Option 2: Standard Next.js Build (Node.js Server)

Use this when deploying to platforms that support Node.js (Vercel, Railway, self-hosted, etc.).

### Building for Node.js

```bash
pnpm run build
```

This creates a standard Next.js build in the `.next/` directory.

### Running the Production Server

```bash
pnpm run start
```

The app will be served at the root path (`/`) without the `/moodboard-manager/` base path.

### Platform Deployment

- **Vercel**: Connect your repository and deploy automatically
- **Self-hosted**: Run `pnpm build && pnpm start` behind a reverse proxy (Nginx, Caddy, etc.)
- **Docker**: Create a Dockerfile with Node.js and run the production server

---

## Build Mode Differences

| Feature | Static Export (`build:static`) | Standard Build (`build`) |
|---------|-------------------------------|-------------------------|
| Output | `out/` directory (HTML/CSS/JS) | `.next/` directory |
| Base Path | `/moodboard-manager/` | `/` (root) |
| Server Required | No (static files only) | Yes (Node.js) |
| Deployment | Apache, Nginx, S3, etc. | Vercel, Node.js server |

---

## How Client-Side Routing Works

This application uses IndexedDB (client-side database) for data storage. Because data doesn't exist at build time:

1. Only placeholder routes are pre-rendered during build
2. The custom `404.html` page handles all non-pre-rendered routes
3. Once the 404 page loads, it redirects to the requested route
4. Client-side React components then load data from IndexedDB
5. The user sees their content seamlessly

This approach provides:
- ✅ True static file deployment
- ✅ No server required
- ✅ Works with any static hosting
- ✅ Full PWA capabilities
- ✅ Offline support via Service Worker

## Development

To test the static export locally:

```bash
pnpm build
npx serve out
```

Then open `http://localhost:3000` in your browser.

## Notes

- **Dynamic routes**: `/projects/[id]` and `/projects/[id]/characters/[id]` are handled client-side
- **Data persistence**: All data is stored in IndexedDB (browser storage)
- **PWA**: The app works offline thanks to the service worker
- **No API calls**: Everything runs in the browser

## Troubleshooting

If routes don't work after deployment:

1. **Verify `mod_rewrite` is enabled** on your Apache server
2. **Check `.htaccess` is uploaded** - some FTP clients hide dotfiles by default
3. **Ensure `AllowOverride All`** is set in your Apache configuration for the directory
4. **Clear browser cache** and test in incognito mode
5. **Check file permissions** - files should be readable by the web server
