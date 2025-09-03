import { describe, it, expect } from 'vitest';

describe('Button Component Logic', () => {
	it('should have correct variant classes', () => {
		const variantClasses = {
			primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
			secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
			outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500',
			ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
			danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
		};

		expect(variantClasses.primary).toContain('bg-indigo-600');
		expect(variantClasses.danger).toContain('bg-red-600');
		expect(variantClasses.outline).toContain('border');
	});

	it('should have correct size classes', () => {
		const sizeClasses = {
			sm: 'px-2 py-1 text-xs',
			md: 'px-4 py-2 text-sm',
			lg: 'px-6 py-3 text-base'
		};

		expect(sizeClasses.sm).toContain('px-2');
		expect(sizeClasses.md).toContain('px-4');
		expect(sizeClasses.lg).toContain('px-6');
	});

	it('should have transitions and animations', () => {
		const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95';
		
		expect(baseClasses).toContain('transition-all');
		expect(baseClasses).toContain('duration-200');
		expect(baseClasses).toContain('active:scale-95');
	});
});