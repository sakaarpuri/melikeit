# Project Notes

## Signup/Auth fixes completed
- Kept email/password auth as the primary flow and did not force Google OAuth.
- Updated signup messaging to a definite confirmation state (no “may be sent” wording).
- Added password requirement: minimum 6 characters with at least one number or symbol.
- Improved signup UX so after submit, the form switches to a confirmation message state.
- Kept sign-in password handling clean (only browser-managed autofill, no app-side persistence).
- Updated auth email template behavior to support styled HTML and a clickable confirmation link.
- Targeted confirmation flow to land users directly into the app after verify/login.

## User settings/profile fixes completed
- Replaced email-first identity display with name-first display (`full_name`) in UI.
- Added a clickable user settings entry point from the sidebar profile area.
- Added settings actions for:
  - Edit name
  - Change password
- Enforced password strength guidance in settings updates (same baseline as signup).
- Kept sign-out separate and accessible.
- Updated sidebar profile placement to show avatar + name in the requested location.

## Supabase schema dependency addressed
- Resolved app-breaking issue tied to missing table metadata: `public.sections` not found.
- Required setup step documented: run project schema SQL in Supabase SQL Editor, then refresh.
