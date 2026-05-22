# Developer & Agent Guidelines

## CRITICAL: SIGN-IN LOCK

**DO NOT MODIFY the Sign In / Authentication features.**
- The existing Authentication and Sign-In flow, user profile headers, authentication overlays, and integration modules are fully completed, thoroughly tested, and finalized.
- Any attempts to rewrite, replace, modify, or reorganize files related to Firebase Auth or User Profile headers (Sign-In buttons/dialogs) are **STRICTLY PROHIBITED**.
- Preserve all existing auth states, states matching `currentUser`, `/firestore.rules` (auth restrictions), and corresponding Firebase Auth lifecycle listeners completely.
