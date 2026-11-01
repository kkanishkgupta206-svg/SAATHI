// Client-side crisis keywords detector for immediate user safety response
const CRISIS_KEYWORDS = [
  // English
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  'want to die',
  'wanna die',
  'better off dead',
  'take my life',
  'end it all',
  'self harm',
  'cut myself',
  'hang myself',
  'hurt myself',
  'dont want to live',
  "don't want to live",
  'no reason to live',
  'poison myself',
  'overdose',
  // Hindi Latin / Hinglish
  'mar jaana',
  'mar jana',
  'marne ka mann',
  'jeena nahi',
  'jeena nahi chahta',
  'jeena nahi chahti',
  'jaan de dunga',
  'jaan de dungi',
  'mar jaunga',
  'mar jaungi',
  'khudkushi',
  'aatmahatya',
  'atmahatya',
  'zindagi khatam',
  'jindagi khatam',
  // Hindi Devanagari
  'आत्महत्या',
  'खुदकुशी',
  'मर जाना',
  'जीना नहीं',
  'मरना चाहता',
  'मरना चाहती',
  'जान देना',
];

export function checkIsCrisis(message: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}
