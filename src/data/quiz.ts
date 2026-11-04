import type { QuizQuestion } from "@/types";

export const QUIZ: QuizQuestion[] = [
  {
    id: "slang-chilly-bin",
    topic: "Kiwi slang",
    question: "Your flatmate asks you to bring the chilly bin. What do you grab?",
    options: ["A rubbish bin", "A portable cooler box", "A warm jacket", "A rice cooker"],
    answer: 1,
    explain: "A chilly bin is a cooler box for drinks and food. Essential for beach days.",
  },
  {
    id: "slang-jandals",
    topic: "Kiwi slang",
    question: "What are jandals?",
    options: ["Flip-flops (slippers)", "Garden tools", "A type of sandwich", "Rain boots"],
    answer: 0,
    explain: "Jandals are flip-flops, the same rubber slippers you wear at home in Sri Lanka.",
  },
  {
    id: "slang-dairy",
    topic: "Kiwi slang",
    question: "Someone says 'I'm popping down to the dairy.' Where are they going?",
    options: ["A milk factory", "A farm", "A small corner shop", "The dentist"],
    answer: 2,
    explain: "A dairy is a corner shop that sells milk, bread, snacks and everyday basics, a bit like a local kade.",
  },
  {
    id: "slang-sweet-as",
    topic: "Kiwi slang",
    question: "Your manager replies 'Sweet as!' to your update. How do they feel?",
    options: ["Annoyed", "Confused", "Hungry", "Happy, it's all good"],
    answer: 3,
    explain: "'Sweet as' means great, no problem. It's a complete phrase; nothing is missing at the end.",
  },
  {
    id: "slang-togs",
    topic: "Kiwi slang",
    question: "What should you pack if a friend says to bring your togs?",
    options: ["Swimwear", "Hiking boots", "Party snacks", "A raincoat"],
    answer: 0,
    explain: "Togs are swimwear. Expect to hear it at the beach and the pool.",
  },
  {
    id: "slang-tramping",
    topic: "Kiwi slang",
    question: "What is tramping?",
    options: ["Busking in the street", "Hiking on a trail, often for days", "Travelling by train", "Moving house"],
    answer: 1,
    explain: "Tramping is hiking. New Zealand has huts and tracks across national parks for multi-day tramps.",
  },
  {
    id: "slang-smoko",
    topic: "Work",
    question: "On a work site, the crew stops for smoko. What's happening?",
    options: ["A fire drill", "A safety briefing", "A short tea or snack break", "End of the shift"],
    answer: 2,
    explain: "Smoko is a short work break for tea and a snack, whether or not anyone smokes.",
  },
  {
    id: "slang-bach",
    topic: "Kiwi slang",
    question: "Your colleague is going to their bach for the long weekend. What is a bach?",
    options: ["A music festival", "A small holiday home", "A sports club", "A boat"],
    answer: 1,
    explain: "A bach is a holiday home, often simple and near the beach. In parts of the South Island it's called a crib.",
  },
  {
    id: "slang-ute",
    topic: "Kiwi slang",
    question: "What is a ute?",
    options: ["A pickup truck", "A university course", "A tool belt", "A small boat"],
    answer: 0,
    explain: "A ute (utility vehicle) is a pickup truck, very common on farms and building sites.",
  },
  {
    id: "reo-kia-ora",
    topic: "Te reo Māori",
    question: "What does 'Kia ora' mean?",
    options: ["Goodbye forever", "Hello, and also thanks", "Excuse me", "Good night"],
    answer: 1,
    explain: "Kia ora is a te reo Māori greeting that means 'be well'. People use it for hello and thank you.",
  },
  {
    id: "reo-aotearoa",
    topic: "Te reo Māori",
    question: "Aotearoa is the Māori name for…",
    options: ["Auckland", "The South Island", "New Zealand", "Mount Cook"],
    answer: 2,
    explain: "Aotearoa is widely used for New Zealand. It is often translated as 'land of the long white cloud'.",
  },
  {
    id: "reo-tamaki",
    topic: "Te reo Māori",
    question: "Which city is Tāmaki Makaurau?",
    options: ["Wellington", "Christchurch", "Hamilton", "Auckland"],
    answer: 3,
    explain: "Tāmaki Makaurau is the Māori name for Auckland. Wellington is Te Whanganui-a-Tara and Christchurch is Ōtautahi.",
  },
  {
    id: "reo-wh",
    topic: "Te reo Māori",
    question: "How is the 'wh' in Whangārei usually pronounced?",
    options: ["Like 'w'", "Like 'f'", "Like 'h'", "It's silent"],
    answer: 1,
    explain: "In most of New Zealand 'wh' sounds close to an English 'f', so Whangārei sounds like 'Fahng-ah-ray'.",
  },
  {
    id: "reo-matariki",
    topic: "Te reo Māori",
    question: "Matariki is a public holiday that celebrates…",
    options: ["The Māori New Year", "The end of winter", "Queen's Birthday", "The first rugby test"],
    answer: 0,
    explain: "Matariki marks the Māori New Year, when the Matariki star cluster rises in mid-winter. It has been a public holiday since 2022.",
  },
  {
    id: "drive-side",
    topic: "Driving",
    question: "Which side of the road do New Zealanders drive on?",
    options: ["Right, like most of Europe", "Left, the same as Sri Lanka", "Either side on rural roads", "Right on motorways only"],
    answer: 1,
    explain: "NZ drives on the left, just like Sri Lanka, so the steering wheel will feel familiar.",
  },
  {
    id: "drive-licence",
    topic: "Driving",
    question: "How long can you usually drive on a valid overseas licence after arriving?",
    options: ["1 month", "6 months", "12 months", "Forever"],
    answer: 2,
    explain: "You can usually drive for up to 12 months from arrival on a current overseas licence (with an English translation if needed). After that you need an NZ licence.",
  },
  {
    id: "drive-speed",
    topic: "Driving",
    question: "What's the usual maximum speed on open roads unless signs say otherwise?",
    options: ["80 km/h", "100 km/h", "120 km/h", "No limit"],
    answer: 1,
    explain: "The default open road limit is 100 km/h. Many roads have lower limits, and a few expressways allow 110 km/h. Always follow the signs.",
  },
  {
    id: "life-emergency",
    topic: "Everyday life",
    question: "What number do you call for police, fire or ambulance?",
    options: ["119", "911", "111", "000"],
    answer: 2,
    explain: "Dial 111 in an emergency. Note that Sri Lanka's police emergency number, 119, won't work in NZ.",
  },
  {
    id: "life-tipping",
    topic: "Everyday life",
    question: "Is tipping expected at New Zealand cafés and restaurants?",
    options: ["Yes, 15% is standard", "Yes, 10% is added by law", "No, it isn't expected", "Only at lunchtime"],
    answer: 2,
    explain: "Tipping isn't expected in NZ. Prices include GST and staff are paid at least the minimum wage. A tip is a nice extra for great service.",
  },
  {
    id: "life-christmas",
    topic: "Everyday life",
    question: "What's the weather usually like at Christmas in New Zealand?",
    options: ["Snowy", "Summer", "Monsoon season", "Autumn"],
    answer: 1,
    explain: "Christmas falls in summer, so expect barbecues and beach trips. Winter runs from June to August.",
  },
  {
    id: "life-food-border",
    topic: "Everyday life",
    question: "You're packing spices and dried fish from home. What should you do at the NZ border?",
    options: ["Hide them in your suitcase", "Declare them on your arrival card", "Post them separately", "Eat them on the plane"],
    answer: 1,
    explain: "Declare all food. Officers may inspect it. Undeclared risk goods can mean an instant fine.",
  },
  {
    id: "rent-bond",
    topic: "Renting",
    question: "What's the most a landlord can ask for as a bond?",
    options: ["Four weeks' rent", "Two months' rent", "Six months' rent", "Whatever they like"],
    answer: 0,
    explain: "A bond can be at most four weeks' rent, and the landlord must lodge it with Tenancy Services.",
  },
  {
    id: "rent-advance",
    topic: "Renting",
    question: "How much rent in advance can a landlord ask for?",
    options: ["Up to 2 weeks", "Up to 2 months", "Up to 6 months", "A full year"],
    answer: 0,
    explain: "A landlord can't ask for more than two weeks' rent in advance.",
  },
  {
    id: "work-ird",
    topic: "Work",
    question: "What do you need before your first pay so you're taxed at the right rate?",
    options: ["A library card", "An IRD number", "A KiwiSaver PIN", "A driver licence"],
    answer: 1,
    explain: "Your IRD number is your tax number from Inland Revenue. Without one you'll be taxed at a higher 'no-notification' rate.",
  },
  {
    id: "work-holidays",
    topic: "Work",
    question: "After 12 months with the same employer, how much paid annual leave do you get at minimum?",
    options: ["1 week", "2 weeks", "4 weeks", "6 weeks"],
    answer: 2,
    explain: "After 12 months of continuous employment you're entitled to at least four weeks of paid annual holidays.",
  },
  {
    id: "work-sick",
    topic: "Work",
    question: "After six months in a job, how many days of paid sick leave do you get each year?",
    options: ["3 days", "5 days", "10 days", "None"],
    answer: 2,
    explain: "After six months of continuous employment, workers get 10 days of paid sick leave each year.",
  },
  {
    id: "work-agreement",
    topic: "Work",
    question: "Does your employment agreement in New Zealand have to be in writing?",
    options: ["Yes, always", "Only for jobs over 40 hours", "Only for permanent jobs", "No, a handshake is enough"],
    answer: 0,
    explain: "Every employee must have a written employment agreement, including casual and part-time workers.",
  },
];

export const QUIZ_ROUND_SIZE = 8;

/** Picks a round of questions, mixing topics, using a seed so rounds are reproducible in tests. */
export function pickRound(seed: number, size = QUIZ_ROUND_SIZE, pool: QuizQuestion[] = QUIZ): QuizQuestion[] {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(size, shuffled.length));
}
