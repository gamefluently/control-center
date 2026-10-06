KYLE CONTROL CENTER — V1

WHAT THIS IS
A simple static project-control dashboard for GitHub Pages.
No backend. No database. No login. No npm. No build step.

FILES
- index.html
- styles.css
- app.js

GITHUB PAGES SETUP
1. Create a new GitHub repository (example: control-center).
2. Upload all three files to the repository root.
3. Commit the files.
4. Open repository Settings → Pages.
5. Under Build and deployment:
   Source: Deploy from a branch
   Branch: main
   Folder: / (root)
6. Save.
7. Open the GitHub Pages URL after GitHub finishes publishing.

HOW SAVING WORKS
- Edits save automatically in the browser you are using.
- Laptop, iPad, and iPhone DO NOT automatically sync.
- Use "Export Backup" to download the JSON state.
- Use "Import Backup" on another device to move that state there.
- The site warns you if you have never exported a backup or the last backup is 7+ days old.

AI HANDOFF
- Open one project and use "Copy AI Context" or "Download MD".
- From the main dashboard, "Copy All AI Context" gives a short summary of every project.
- Paste that text into ChatGPT, Claude, Gemini, or another AI when you need to resume work.

IMPORTANT
The JSON backup is your portable source of truth.
Browser localStorage is only the working copy.


PRIVACY / SAFETY
- The public code contains no personal project data.
- Your project data lives only in this browser's localStorage unless you export it.
- JSON backups should be treated as private files.
- If an older public repo contained personal starter data inside app.js, delete that repo and recreate it with this cleaned version to remove that history from the normal public repository.
