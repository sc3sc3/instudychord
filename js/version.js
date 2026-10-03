// Single source of truth for the app version. Bump it whenever ANY shell file changes: it is shown next
// to the title and names the service-worker cache, so installed copies (cache-first) pick up the update.
// Plain script (not an ES module) so both the page (<script>) and sw.js (importScripts) can load it.
self.APP_VERSION = 'v25';
