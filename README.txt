KYLE CONTROL CENTER — V2.0 CENTRALIZED AI REFRESH

PURPOSE
This version removes the normal need to visit every project conversation and generate separate update files.

NORMAL WORKFLOW
1. In the central Control Center ChatGPT conversation, say:
   Update Control Center.
2. ChatGPT reviews the latest available project context and creates ONE Control Center AI refresh JSON file.
3. Download that one file.
4. On the Control Center dashboard, click Import AI Refresh.
5. Preview:
   GREEN = project has new/changed information.
   BROWN = project matched but nothing changed.
6. Click Apply Refresh once.

That is the normal update path.

V2.0 FEATURES
- One dashboard-level Import AI Refresh button.
- One refresh file can update multiple projects.
- Project matching uses project names and aliases; the JSON does not need localStorage IDs.
- Existing project fields not included in the refresh are preserved.
- Changed project cards stay GREEN after the refresh.
- Unchanged/stale project cards stay BROWN after the refresh.
- Last refresh summary shows changed / unchanged / unmatched counts.
- Existing JSON backup/import remains intact.
- Existing localStorage key remains unchanged, so current browser data is preserved.
- Per-project MD import is removed from the interface.

FILES TO REPLACE
- index.html
- styles.css
- app.js
- README.txt

INSTALL
1. Keep your latest JSON backup.
2. Replace these four files in the local GitHub control-center folder.
3. Commit.
4. Push origin.
5. Reload the GitHub Pages site.

IMPORTANT
The AI refresh file is a partial merge, not a full backup. It only changes fields included in the refresh and leaves everything else alone.
