export function isExpired(date: Date, offset: number = 0) {
	return date.getTime() < (Date.now() + offset);
}
