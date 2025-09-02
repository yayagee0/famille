import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// Load Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FB_API_KEY,
  authDomain: process.env.VITE_FB_AUTH_DOMAIN,
  projectId: process.env.VITE_FB_PROJECT_ID,
  storageBucket: process.env.VITE_FB_STORAGE_BUCKET,
  appId: process.env.VITE_FB_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Question bank
const questions = [
  // FUN
  {
    text: "Favorite color?",
    category: "fun",
    type: "multiple-choice",
    options: ["Red", "Blue", "Green", "Yellow", "Purple", "Black"],
    allowOther: true,
    sentenceTemplate: "🖌️ My favorite color is {answer}.",
  },
  {
    text: "Favorite fruit?",
    category: "fun",
    type: "multiple-choice",
    options: ["Apple", "Banana", "Mango", "Orange"],
    allowOther: true,
    sentenceTemplate: "🍎 I enjoy eating {answer}.",
  },
  {
    text: "Favorite cartoon?",
    category: "fun",
    type: "multiple-choice",
    options: ["Tom & Jerry", "SpongeBob", "Doraemon", "Pokémon"],
    allowOther: true,
    sentenceTemplate: "📺 I love watching {answer}.",
  },
  {
    text: "Favorite meal of the day?",
    category: "fun",
    type: "multiple-choice",
    options: ["Breakfast", "Lunch", "Dinner", "Snack"],
    allowOther: false,
    sentenceTemplate: "🍽️ My favorite meal of the day is {answer}.",
  },
  {
    text: "Favorite sport?",
    category: "fun",
    type: "multiple-choice",
    options: ["Football", "Basketball", "Swimming", "Running"],
    allowOther: true,
    sentenceTemplate: "🏀 My favorite sport is {answer}.",
  },
  {
    text: "Favorite superhero?",
    category: "fun",
    type: "multiple-choice",
    options: ["Spider-Man", "Batman", "Superman", "Iron Man"],
    allowOther: true,
    sentenceTemplate: "🦸 My hero is {answer}.",
  },
  {
    text: "Favorite app/game?",
    category: "fun",
    type: "multiple-choice",
    options: ["Roblox", "Minecraft", "YouTube", "TikTok"],
    allowOther: true,
    sentenceTemplate: "🎮 My favorite app/game is {answer}.",
  },
  {
    text: "Favorite season?",
    category: "fun",
    type: "multiple-choice",
    options: ["Winter", "Spring", "Summer", "Autumn"],
    allowOther: false,
    sentenceTemplate: "🍂 My favorite season is {answer}.",
  },

  // DAILY LIFE
  {
    text: "Morning or night person?",
    category: "daily",
    type: "multiple-choice",
    options: ["Morning", "Night"],
    allowOther: false,
    sentenceTemplate: "🌙 I’m more of a {answer} person.",
  },
  {
    text: "Best weekend activity?",
    category: "daily",
    type: "multiple-choice",
    options: ["Reading", "Playing outside", "Watching TV", "Family trip"],
    allowOther: true,
    sentenceTemplate: "🎉 On weekends, I enjoy {answer}.",
  },
  {
    text: "Favorite school subject?",
    category: "daily",
    type: "multiple-choice",
    options: ["Math", "Science", "Art", "Sports"],
    allowOther: true,
    sentenceTemplate: "📘 My favorite school subject is {answer}.",
  },
  {
    text: "Do you like books, TV, or games more?",
    category: "daily",
    type: "multiple-choice",
    options: ["Books", "TV", "Games"],
    allowOther: false,
    sentenceTemplate: "📚 I enjoy {answer} the most.",
  },
  {
    text: "Indoor or outdoor fun?",
    category: "daily",
    type: "multiple-choice",
    options: ["Indoor", "Outdoor"],
    allowOther: false,
    sentenceTemplate: "🏡 I prefer {answer} activities.",
  },
  {
    text: "First thing you do in the morning?",
    category: "daily",
    type: "open-ended",
    sentenceTemplate: "⏰ First thing in the morning, I {answer}.",
  },

  // FAMILY
  {
    text: "Best thing about family time?",
    category: "family",
    type: "multiple-choice",
    options: ["Games", "Food", "Talking", "Trips"],
    allowOther: true,
    sentenceTemplate: "👪 The best part of family time is {answer}.",
  },
  {
    text: "Who do you resemble more?",
    category: "family",
    type: "multiple-choice",
    options: ["Mom", "Dad", "Both", "Neither"],
    allowOther: false,
    sentenceTemplate: "🧑‍🤝‍🧑 I resemble {answer} the most.",
  },
  {
    text: "What makes you feel cared for?",
    category: "family",
    type: "multiple-choice",
    options: ["Hugs", "Listening", "Surprises", "Helping"],
    allowOther: true,
    sentenceTemplate: "🤲 I feel cared for when {answer}.",
  },
  {
    text: "Favorite family tradition?",
    category: "family",
    type: "open-ended",
    sentenceTemplate: "🎊 My favorite family tradition is {answer}.",
  },
  {
    text: "Funniest family moment?",
    category: "family",
    type: "open-ended",
    sentenceTemplate: "😂 Funniest family moment: {answer}.",
  },
  {
    text: "One thing you love about your sibling(s)?",
    category: "family",
    type: "open-ended",
    sentenceTemplate: "❤️ One thing I love about my sibling(s) is {answer}.",
  },

  // VALUES
  {
    text: "Which matters most?",
    category: "values",
    type: "multiple-choice",
    options: ["Honesty", "Kindness", "Bravery", "Humility"],
    allowOther: false,
    sentenceTemplate: "💖 The value I care about most is {answer}.",
  },
  {
    text: "If you had a superpower, how would you use it?",
    category: "values",
    type: "multiple-choice",
    options: ["Protect others", "Heal", "Share food", "Stop fights"],
    allowOther: true,
    sentenceTemplate: "⚡ If I had a superpower, I’d use it to {answer}.",
  },
  {
    text: "What makes a person 'good'?",
    category: "values",
    type: "open-ended",
    sentenceTemplate: "🌟 A good person is someone who {answer}.",
  },
  {
    text: "What do you admire most about your parents?",
    category: "values",
    type: "open-ended",
    sentenceTemplate: "💐 I admire my parents because {answer}.",
  },

  // DREAMS
  {
    text: "Where would you love to travel?",
    category: "dreams",
    type: "multiple-choice",
    options: ["Beach", "Mountains", "City", "Desert"],
    allowOther: true,
    sentenceTemplate: "✈️ I’d love to travel to the {answer}.",
  },
  {
    text: "What do you want to be when you grow up?",
    category: "dreams",
    type: "multiple-choice",
    options: ["Doctor", "Teacher", "Engineer", "Artist"],
    allowOther: true,
    sentenceTemplate: "🎓 When I grow up, I want to be a {answer}.",
  },
  {
    text: "If you could change one thing in the world?",
    category: "dreams",
    type: "multiple-choice",
    options: ["End hunger", "Stop wars", "Save animals", "Protect Earth"],
    allowOther: true,
    sentenceTemplate: "🌍 If I could change the world, I’d {answer}.",
  },
  {
    text: "What dream pet would you have?",
    category: "dreams",
    type: "multiple-choice",
    options: ["Dog", "Cat", "Bird", "Horse"],
    allowOther: true,
    sentenceTemplate: "🐾 My dream pet is a {answer}.",
  },
  {
    text: "What would your dream house look like?",
    category: "dreams",
    type: "open-ended",
    sentenceTemplate: "🏡 My dream house would be {answer}.",
  },

  // HOBBIES
  {
    text: "What hobby makes you happiest?",
    category: "hobbies",
    type: "multiple-choice",
    options: ["Drawing", "Sports", "Cooking", "Music"],
    allowOther: true,
    sentenceTemplate: "🎨 My favorite hobby is {answer}.",
  },
  {
    text: "What’s something new you’d like to learn?",
    category: "hobbies",
    type: "multiple-choice",
    options: ["Coding", "Cooking", "Drawing", "Sports"],
    allowOther: true,
    sentenceTemplate: "📚 I’d like to learn {answer}.",
  },
  {
    text: "Do you prefer drawing, building, or sports?",
    category: "hobbies",
    type: "multiple-choice",
    options: ["Drawing", "Building", "Sports"],
    allowOther: false,
    sentenceTemplate: "🛠️ I enjoy {answer} the most.",
  },
  {
    text: "What’s your hidden talent?",
    category: "hobbies",
    type: "open-ended",
    sentenceTemplate: "✨ My hidden talent is {answer}.",
  },
  {
    text: "Which activity makes you lose track of time?",
    category: "hobbies",
    type: "open-ended",
    sentenceTemplate: "⏳ I lose track of time when I {answer}.",
  },

  // PERSONALITY
  {
    text: "Are you more shy or outgoing?",
    category: "personality",
    type: "multiple-choice",
    options: ["Shy", "Outgoing"],
    allowOther: false,
    sentenceTemplate: "🙂 I’m more {answer}.",
  },
  {
    text: "Do you prefer quiet or busy places?",
    category: "personality",
    type: "multiple-choice",
    options: ["Quiet", "Busy"],
    allowOther: false,
    sentenceTemplate: "🔊 I prefer {answer} places.",
  },
  {
    text: "What makes you laugh the most?",
    category: "personality",
    type: "open-ended",
    sentenceTemplate: "😂 What makes me laugh most is {answer}.",
  },
  {
    text: "What makes you feel proud?",
    category: "personality",
    type: "open-ended",
    sentenceTemplate: "🌟 I feel proud when {answer}.",
  },
  {
    text: "What cheers you up when sad?",
    category: "personality",
    type: "open-ended",
    sentenceTemplate: "💖 When I feel sad, {answer} cheers me up.",
  },
  {
    text: "If you were an animal, which would you be?",
    category: "personality",
    type: "multiple-choice",
    options: ["Lion", "Cat", "Dog", "Bird"],
    allowOther: true,
    sentenceTemplate: "🐾 If I were an animal, I’d be a {answer}.",
  },
];

// Seeder
async function seedQuestions() {
  const colRef = collection(db, "questions");
  for (const q of questions) {
    await addDoc(colRef, {
      ...q,
      createdAt: serverTimestamp(),
    });
    console.log(`✅ Added: ${q.text}`);
  }
  console.log("🎉 Question bank seeded successfully.");
}

seedQuestions().catch(console.error);
