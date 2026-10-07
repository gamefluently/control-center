KYLE CONTROL CENTER — V1.2

WHAT CHANGED
V1.2 adds Markdown project-update importing on top of the V1.1 dashboard.

NEW WORKFLOW
1. Open a project in Control Center.
2. Click Import MD Update.
3. Choose that project's Control Center update .md file.
4. Review the preview.
5. Click Apply Update.

RECOGNIZED FIELDS
- Status
- Objective
- Next Action
- Blockers
- Working
- Not Working / Not Working / Not Yet Verified
- Recently Completed / Completed
- Backlog / Deferred Work

The importer also understands a few existing aliases such as Current Objective, Immediate Priority, Current Issue, Current State, Current Status, and Current Direction.

SAFETY
- Importing an MD file does NOT immediately change anything.
- A preview is shown first.
- Only recognized fields are changed.
- Missing fields remain unchanged.
- Project name, type, and ID are never overwritten by the MD importer.
- The project Updated date changes only when you click Apply Update.
- Keep using Export Backup for the full private JSON backup.

PRIVACY
- The public GitHub code contains no project data.
- Your project data remains in this browser's localStorage.
- JSON backups and project update MD files may contain private information; keep them private.

FILES TO REPLACE
- index.html
- styles.css
- app.js
- README.txt

INSTALL
1. Keep a recent JSON backup.
2. Replace the four files in your local control-center GitHub folder.
3. Commit the four files in GitHub Desktop.
4. Push origin.
5. GitHub Pages redeploys automatically.
6. Reload the live site.

V1.2 keeps the same localStorage key as V1.1, so existing browser data should remain in place.
