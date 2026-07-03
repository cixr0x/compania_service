After finishing implementing any change, commit and push.

## Fixed Local Ports

Use the fixed Codex startup commands for local development:

- Backend service: from `backend/`, run `npm run dev:codex`
- Frontend UI: from `frontend/`, run `npm run dev:codex`
- Backend URL: `http://127.0.0.1:3000/api`
- Frontend URL: `http://127.0.0.1:5174`

Do not choose another port automatically. If one of these ports is busy, report the owning process and ask before stopping it or using a different port.

Do not run DDL or DML SQL commands without user confirmation.

## Deployment

When the user requests a deployment, deploy through Git by default:

- Verify local changes are committed and pushed to the remote branch first.
- On the VM, pull the latest changes from the repository checkout.
- Build and restart/reload services from the VM checkout.
- Do not deploy by copying local files directly unless the user explicitly asks for that fallback.

## Frontend UI Direction

Use Ant Design as the default UI framework for frontend application work. Prefer Ant Design components, layout primitives, feedback components, and design tokens over custom controls or one-off CSS.

Future UI development must follow Ant Design's enterprise product guidance:

- Design values: Natural, Certain, Meaningful, and Growing.
- Design patterns should preserve consistency, reduce unnecessary custom design, and use reusable page, component, and business-module patterns.
- Data display should prioritize information importance, operation frequency, and association. Tables are the default for structured operational data; keep table cells readable, use `-` for empty values, keep status/time/action cells on one line where possible, and include sorting, search/filtering, paging, and loading/empty states when useful.
- Data entry should use clear labels, good defaults, structured formats, and validation feedback close to the field. Do not add per-field helper descriptions unless the user explicitly asks for them.
- Feedback should be necessary, immediate, and proportionate. Use non-blocking feedback for routine states and stronger dialogs only for important/actionable failures.
- Keep enterprise screens dense but readable. Avoid marketing-style hero layouts, decorative cards, and custom visual effects that do not help the user's operational workflow.
