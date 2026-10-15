/** Search the displayed label while leaving selection and its ID to Select. */
export const entitySelectSearch = {
  filterOption: (input: string, option?: { label?: unknown }) =>
    String(option?.label ?? '').toLowerCase().includes(input.trim().toLowerCase()),
}
