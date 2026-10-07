KYLE CONTROL CENTER — V2.0.1 RECOVERY FIX

WHAT THIS FIXES
V2 could open with zero project cards if the browser's saved project state was missing or had already been reset.

V2.0.1 changes the centralized AI Refresh so it can CREATE missing project cards from the single refresh file.

NORMAL WORKFLOW
1. Say "Update Control Center" in the central ChatGPT conversation.
2. Download the ONE AI Refresh JSON file.
3. Click Import AI Refresh.
4. Preview all projects.
5. Click Apply Refresh once.

If the dashboard is empty:
- The same AI Refresh file recreates the missing project cards.
- No manual Add Project work is required.

VISUAL STATE
- GREEN = new or changed during the most recent refresh.
- BROWN = recognized but unchanged/stale.

FILES TO REPLACE
- index.html
- styles.css
- app.js
- README.txt
