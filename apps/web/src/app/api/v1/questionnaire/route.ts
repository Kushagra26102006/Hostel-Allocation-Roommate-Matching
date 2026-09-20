import { apiHandler } from "@/lib/api/handler.js";
import type { QuestionnaireDefinition } from "@hostelhub/domain";

const QUESTIONNAIRE_DEFINITION: QuestionnaireDefinition = {
  version: 1,
  title: "Hostel Roommate Compatibility Questionnaire",
  items: [
    {
      key: "sleep",
      label: "Sleep Schedule & Lights Out",
      category: "ordinal",
      min: 1,
      max: 5,
      options: [
        { label: "Early bird (Lights out by 10 PM)", value: 1 },
        { label: "Moderate early (10 PM - 11:30 PM)", value: 2 },
        { label: "Balanced (11:30 PM - 1 AM)", value: 3 },
        { label: "Late owl (1 AM - 2:30 AM)", value: 4 },
        { label: "Night owl (2:30 AM+)", value: 5 },
      ],
    },
    {
      key: "study",
      label: "Room Study Habits",
      category: "ordinal",
      min: 1,
      max: 5,
      options: [
        { label: "Complete silence required in room", value: 1 },
        { label: "Quiet study mostly", value: 2 },
        { label: "Low background noise fine", value: 3 },
        { label: "Study with music/podcasts", value: 4 },
        { label: "Group study / active discussion in room", value: 5 },
      ],
    },
    {
      key: "tidiness",
      label: "Room Tidiness & Cleanliness",
      category: "ordinal",
      min: 1,
      max: 5,
      options: [
        { label: "Extremely neat (Everything organized daily)", value: 1 },
        { label: "Tidy", value: 2 },
        { label: "Moderate cleanliness", value: 3 },
        { label: "Casual tidiness", value: 4 },
        { label: "Relaxed / Messy room fine", value: 5 },
      ],
    },
    {
      key: "noise",
      label: "Noise & Music Tolerance",
      category: "ordinal",
      min: 1,
      max: 5,
      options: [
        { label: "Headphones only at all times", value: 1 },
        { label: "Low volume speakers fine occasionally", value: 2 },
        { label: "Moderate noise fine during day", value: 3 },
        { label: "High music tolerance", value: 4 },
        { label: "Loud environment fine", value: 5 },
      ],
    },
    {
      key: "guests",
      label: "Guest Frequency in Room",
      category: "ordinal",
      min: 1,
      max: 5,
      options: [
        { label: "No visitors inside room", value: 1 },
        { label: "Rare visitors (study group only)", value: 2 },
        { label: "Occasional weekend visitors", value: 3 },
        { label: "Frequent daytime guests", value: 4 },
        { label: "Open door policy", value: 5 },
      ],
    },
    {
      key: "temperature",
      label: "Room Temperature Preference",
      category: "ordinal",
      min: 1,
      max: 5,
      options: [
        { label: "Cold (AC set 18°C-20°C)", value: 1 },
        { label: "Cool (21°C-23°C)", value: 2 },
        { label: "Moderate (24°C-25°C)", value: 3 },
        { label: "Warm (Fan only / 26°C+)", value: 4 },
        { label: "No AC / Natural ventilation", value: 5 },
      ],
    },
    {
      key: "social",
      label: "Social Energy in Room",
      category: "ordinal",
      min: 1,
      max: 5,
      options: [
        { label: "Introverted (Quiet personal space)", value: 1 },
        { label: "Mostly private", value: 2 },
        { label: "Balanced social interactions", value: 3 },
        { label: "Social & talkative", value: 4 },
        { label: "Extroverted (Constantly socializing)", value: 5 },
      ],
    },
    {
      key: "sharing",
      label: "Sharing Personal Items (Books, Snacks)",
      category: "ordinal",
      min: 1,
      max: 5,
      options: [
        { label: "Strictly personal items only", value: 1 },
        { label: "Ask before borrowing anything", value: 2 },
        { label: "Share study materials / minor items", value: 3 },
        { label: "Generous sharing", value: 4 },
        { label: "Fully shared room items", value: 5 },
      ],
    },
    {
      key: "smoking",
      label: "Smoking & Vaping Preference",
      category: "categorical",
      allowDealBreaker: true,
      options: [
        { label: "Non-smoker (Strictly non-smoking room)", value: "non_smoker" },
        { label: "Smoker / Vaper", value: "smoker" },
      ],
    },
  ],
};

export const GET = apiHandler(
  {
    public: true,
    operationId: "getQuestionnaireDefinition",
    summary: "Get compatibility questionnaire definition schema",
  },
  async () => {
    return QUESTIONNAIRE_DEFINITION;
  },
);
