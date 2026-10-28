/**
 * Style for a text column's cells: the column gets `percent` of the table's width and its `ellipsis` text truncates to
 * fit, so the table shrinks with the window instead of scrolling sideways (the Design System table never wraps text).
 * Columns without it (statuses, dates, actions) keep their content's width.
 */
export const textColumn = (percent: number) => ({ width: `${percent}%`, maxWidth: 0 });

export const stopRowClick = (e: React.MouseEvent) => e.stopPropagation();
