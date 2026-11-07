<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Keep unregistered field IDs as session-only provider options, separate from mapped household records; unknown IDs must remain queued until a coordinator registers a real household, preventing fabricated locations and expenses.
- Keep document fixtures and validation in a browser-safe module separate from the workbench; sample results must never be represented as actual AI extraction.
- Apply shared household, expense, and impact-total changes in one pure reducer so batched approvals cannot diverge or double-count households.
- Use TanStack server functions, not Supabase Edge Functions, for future app-internal document analysis; this stack requires server-only credential boundaries.
- Keep drizzle.config.ts pointed at the generated schema and migration directory so draft migration checks can run without database credentials.
- Keep the donor dashboard at / and staff tools on separate routes; mount the shared Nido provider in the root so navigation preserves session updates. Route separation alone is not access control.
- Format public household identifiers through the shared public-households helper rather than displaying names; keep underlying record keys unchanged so existing deliveries and expenses stay linked.
- Keep donor community photos in CommunityPhotos with bilingual alternative text and image files stored in the repo (so local runs show them); show full images without linking identifiable faces to household records.
- Public household search uses the browser-safe public-household-search helper and searches only ID and vereda, so private names cannot be discovered through filtering.
- Anonymous database household reads must use the public_households view or explicitly granted columns; names, coordinates and notes are staff-only. Household changes use private data-free notifications instead of raw realtime row payloads to avoid leaking private columns.
- Database approvals use security-invoker transactional functions so expenses, items, household needs and cost totals commit together and duplicate receipts cannot double-count.
