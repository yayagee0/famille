export const birthdays = [
  { email: "nilezat@gmail.com", name: "Ghassan", date: "1981-08-31" },
  { email: "abdessamia.mariem@gmail.com", name: "Mariem", date: "1990-01-30" },
  { email: "yazidgeemail@gmail.com", name: "Yazid", date: "2014-03-28" },
  { email: "yahyageemail@gmail.com", name: "Yahya", date: "2017-10-23" }
];

export function getNextBirthday(today: Date = new Date()) {
  const currentYear = today.getFullYear();
  
  // Calculate the next birthday for each family member
  const upcomingBirthdays = birthdays.map(birthday => {
    const birthDate = new Date(birthday.date);
    
    // Try this year first
    let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
    
    // If birthday already passed this year, use next year
    if (nextBirthday < today) {
      nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
    }
    
    return {
      ...birthday,
      nextDate: nextBirthday,
      daysUntil: Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    };
  });
  
  // Sort by days until and return the closest one
  upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
  return upcomingBirthdays[0];
}