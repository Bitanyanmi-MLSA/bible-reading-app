# Reading Room

A small, dependency-free installable web app that expands Bible references into complete passages. The public-domain World English Bible is bundled for offline use; the King James Version is available when online.

## Run locally

From this directory, start a local web server (service workers do not work from a `file://` URL):

```powershell
py -m http.server 4173
```

Then open <http://localhost:4173>.

## Use

- Enter one reference, such as `John 3:16-18` or `Psalm 23`.
- Enter up to five references, separated by a new line or semicolon.
- Choose a translation, then select **Open the reading**.
- Copy or print the returned passages.
- The World English Bible works offline after the app has finished loading once. On supported browsers, choose **Install app** (or the browser's install option) to add it to your device.

## Offline availability

The first visit needs an internet connection so the app can download and cache its files and the complete World English Bible. Once the header says **Offline reading ready**, the WEB can be searched without an internet connection. If the browser is offline before the first visit completes, it cannot install or retrieve the app. KJV lookup still requires internet access.

On iPhone or iPad, use the browser's **Share → Add to Home Screen** option after visiting the site online. On desktop and supported Android browsers, use **Install app** or the browser's install option.

## Scripture data and attribution

The bundled World English Bible is public domain. The verse data is derived from [eBible.org's World English Bible](https://ebible.org/web/) and the [TehShrike/world-english-bible](https://github.com/TehShrike/world-english-bible) JSON source. `node scripts/build-offline-bible.mjs` regenerates the bundled dataset from the pinned upstream revision. The online KJV option uses [Bible API](https://bible-api.com).

## Scope

This project is a static site and has no backend. It is published on GitHub Pages. After the first online visit, the app shell and offline WEB data are stored on your device by the service worker.
