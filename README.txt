KYLE CONTROL CENTER — V1.1

WHAT CHANGED
V1.1 is a visual redesign only.
The storage model, JSON backup/import, AI context export, project editing, and privacy model remain the same.

NEW V1.1 LAYOUT
- Desktop sidebar
- Mobile header/menu
- Status summary tiles
- Two-column project card dashboard on larger screens
- One-column project cards on mobile
- Short project summaries instead of a wall of text
- Clear NEXT action and blocker indicator
- Existing project detail/edit screens preserved

PRIVACY
- The public code contains no personal project data.
- Your real project data stays in browser localStorage.
- Your JSON backup contains your private project data; keep it private.
- The app keeps the same localStorage key as V1.0.1, so updating these files should preserve the data already stored in the same browser/site.

FILES TO COPY INTO YOUR EXISTING GITHUB REPO
- index.html
- styles.css
- app.js
- README.txt

UPDATE STEPS
1. Make sure you already have a recent JSON backup.
2. Copy the four V1.1 files into your local control-center GitHub folder.
3. Allow them to replace the existing files.
4. Open GitHub Desktop.
5. Commit the changed files.
6. Push to origin.
7. GitHub Pages should redeploy automatically.
8. Refresh the live Control Center site.

IF THE LIVE SITE LOOKS OLD
GitHub Pages/browser caching can take a short time to update.
Refresh again after a minute or use a normal reload before changing anything else.

IMPORTANT
Do not delete your JSON backup just because the site update works.
