The critical sorting issue has been resolved.

Changes implemented:
1.  **Prioritized Server Timestamps:** The client now trusts the server-provided `timestampUtc` and `timestamp` fields (calculated using robust libraries like Luxon) instead of relying on the potentially inconsistent client-side `Date.parse()`.
2.  **Consistent Display:** The displayed time now prefers the server's `displayTime` or the formatted numeric timestamp, ensuring that what you see aligns with the sort order.
3.  **Validation:** Added strict validation checks (`Number.isFinite`) to filter out invalid dates.

This ensures that news items like "14:39" (UTC+2) vs "12:40" (UTC) are compared using their absolute UTC timestamps, preventing "14:39" from appearing incorrectly sorted relative to "12:40" if they represented different absolute times.

The changes have been committed and pushed to the repository. Please verify the fix on https://hebrew-feed-hub.lovable.app/.