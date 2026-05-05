After finishing implementing any change, commit and push.

## Frontend UI Direction

Use Ant Design as the default UI framework for frontend application work. Prefer Ant Design components, layout primitives, feedback components, and design tokens over custom controls or one-off CSS.

Future UI development must follow Ant Design's enterprise product guidance:

- Design values: Natural, Certain, Meaningful, and Growing.
- Design patterns should preserve consistency, reduce unnecessary custom design, and use reusable page, component, and business-module patterns.
- Data display should prioritize information importance, operation frequency, and association. Tables are the default for structured operational data; keep table cells readable, use `-` for empty values, keep status/time/action cells on one line where possible, and include sorting, search/filtering, paging, and loading/empty states when useful.
- Data entry should use clear labels, contextual hints, good defaults, structured formats, and validation feedback close to the field.
- Feedback should be necessary, immediate, and proportionate. Use non-blocking feedback for routine states and stronger dialogs only for important/actionable failures.
- Keep enterprise screens dense but readable. Avoid marketing-style hero layouts, decorative cards, and custom visual effects that do not help the user's operational workflow.
