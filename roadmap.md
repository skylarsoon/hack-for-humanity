# Nido database setup

- [x] Create requested schema, atomic approval functions, public-safe reads and private document storage; use private data-free household notifications instead of exposing raw household rows.
- [x] Seed eight households, five expenses, eleven links, five items and nineteen needs from existing app data.
- [x] Verify live permissions, category totals, twelve isolated PostgreSQL approval tests and regenerated types.
- [x] Enable email sign-in.
- [ ] Disable public signup: user must turn on Disable sign-up under More → Users → Auth settings because current unrelated hosted settings cannot be safely read.
- [ ] Create coordinator@nidoabierto.org: user must choose a password securely under More → Users → Add user → Create new user.

## Workbench document review

- [x] Replace the donor portrait photo with the newly uploaded community group photo and verify it displays.

- [x] Add typed sample results, 1.5-second progress, handwriting warnings, and document-specific duplicate review.
- [x] Validate PNG/JPG uploads and clearly distinguish unavailable real analysis from sample fallback data.
- [x] Keep approval updates atomic across households, ledger, and totals; cover rules with tests.
- [x] Verify sample and fallback approval flows without changing dashboard or field-crew presentation.
- [x] Real photo analysis connected to Gemini through Lovable Cloud.
Future scope: connect existing in-memory screens to permanent saving; not part of this schema-only request.