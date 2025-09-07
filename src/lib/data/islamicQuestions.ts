import { allahQuestions } from './allah';
import { prophetQuestions } from './prophet';
import { quranQuestions } from './quran';
import { prayerQuestions } from './prayer';
import { lifeDeathQuestions } from './lifeDeath';
import { akhlaqQuestions } from './akhlaq';
import { identityQuestions } from './identity';

export const islamicQuestions = [
	...allahQuestions,
	...prophetQuestions,
	...quranQuestions,
	...prayerQuestions,
	...lifeDeathQuestions,
	...akhlaqQuestions,
	...identityQuestions
];
