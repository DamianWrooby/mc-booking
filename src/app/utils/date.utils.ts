export const pad = (n: number) => String(n).padStart(2, '0');

/** Converts a Date to a local "YYYY-MM-DD" string without UTC conversion. */
export const toLocalDateStr = (d: Date): string =>
	`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parses a "YYYY-MM-DD" (or ISO) string as a local midnight Date. */
export const parseLocalDate = (str: string): Date => {
	const [year, month, day] = str.split('T')[0].split('-').map(Number);
	return new Date(year, month - 1, day);
};
