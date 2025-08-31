// src/lib/console-filter.ts
const IGNORE_PATTERNS = [/__Secure-YEC/, /googleads\.g\.doubleclick\.net/];

const origError = console.error;
console.error = (...args) => {
	if (IGNORE_PATTERNS.some((p) => args.some((a) => typeof a === 'string' && p.test(a)))) {
		return; // ignore harmless external error
	}
	origError(...args);
};
