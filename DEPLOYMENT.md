# Static Export Deployment Guide

This Next.js application is configured for static export (`output: 'export'`), which generates static HTML, CSS, and JavaScript files that can be deployed to any static hosting service.

## Building for Production

```bash
pnpm run build:static
```

This creates an `out/` directory with all static files ready for deployment.
The `.htaccess` file is automatically copied to handle routing with the `/moodboard-manager/` base path.

## Deployment Options

### 1. Netlify

The project includes `public/_redirects` for Netlify configuration.

**Deploy steps:**
1. Build the project: `pnpm build`
2. Deploy the `out/` directory to Netlify
3. The `_redirects` file will automatically handle client-side routing

Or use Netlify CLI:
```bash
pnpm build
netlify deploy --prod --dir=out
```

### 2. Vercel

The project includes `public/vercel.json` for Vercel configuration.

**Deploy steps:**
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect Next.js and build the project
3. The `vercel.json` configuration handles routing

Or use Vercel CLI:
```bash
pnpm build
vercel --prod
```

### 3. Firebase Hosting

The project includes `firebase.json` for Firebase configuration.

**Deploy steps:**
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize (if not already): `firebase init hosting`
4. Build and deploy:
```bash
pnpm build
firebase deploy --only hosting
```

### 4. GitHub Pages

**Deploy steps:**
1. Build the project: `pnpm build`
2. Push the `out/` directory to the `gh-pages` branch

Or use a GitHub Action to automate deployment.

### 5. AWS S3 + CloudFront

**Deploy steps:**
1. Build the project: `pnpm build`
2. Upload the `out/` directory to an S3 bucket
3. Configure CloudFront with the following:
   - Origin: Your S3 bucket
   - Default Root Object: `index.html`
   - Error Pages: Configure 404 to return `/404.html` with 404 status

### 6. Any Static Web Server

For Apache with base path (`.htaccess`):
The project automatically includes a `.htaccess` file configured for the `/moodboard-manager/` base path.
After running `pnpm run build:static`, the `.htaccess` file is automatically copied to the `out/` directory.

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

For Nginx with base path (`nginx.conf`):
```nginx
location /moodboard-manager/ {
  alias /path/to/your/out/;
  try_files $uri $uri/ /moodboard-manager/404.html;
  index index.html;
}
```

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
1. Ensure your hosting platform is configured to serve `/404.html` for unknown routes
2. Check that all files from the `out/` directory are deployed
3. Verify that the `_redirects` or equivalent configuration file is deployed
4. Clear browser cache and test in incognito mode
