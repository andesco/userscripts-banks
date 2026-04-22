# Scotiabank: Reverse Transaction Order

Scotiabank displays transactions oldest-first with no way to sort them. The script reverses the list on page load so the newest transactions appear first, and makes the Date column header clickable to toggle sort direction, with a chevron indicating the current order.

The transaction table loads asynchronously. The script detects it via a `MutationObserver` on the `<tbody>` and falls back to polling, then re-applies the header setup whenever the data is replaced (e.g. when switching accounts). Sorting is a pure DOM operation — rows are removed and re-inserted in reverse order — which doesn’t interact with React’s internal state.
