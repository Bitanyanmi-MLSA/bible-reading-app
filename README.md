# Reading Room

A small, dependency-free web app that expands Bible references into complete passages. It uses the public-domain World English Bible by default and also offers the King James Version.

## Run locally

From this directory, start a local web server:

```powershell
py -m http.server 4173
```

Then open <http://localhost:4173>.

## Use

- Enter one reference, such as `John 3:16-18` or `Psalm 23`.
- Enter up to five references, separated by a new line or semicolon.
- Choose a translation, then select **Open the reading**.
- Copy or print the returned passages.

The app fetches passage text from [bible-api.com](https://bible-api.com). References are sent to that service to retrieve the requested verses. The app does not require an account or store a reading history.

## Scope

This project is a static site and has no backend. It is published on GitHub Pages.
