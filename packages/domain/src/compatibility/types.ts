export type OrdinalItemKey =
  | "sleep"
  | "study"
  | "tidiness"
  | "noise"
  | "guests"
  | "temperature"
  | "social"
  | "sharing";

export type CategoricalItemKey = "smoking";

export type QuestionnaireItemKey = OrdinalItemKey | CategoricalItemKey;

export interface QuestionnaireAnswerItem {
  value: number | string; // Ordinal 1-5 or Categorical string
  importance: number; // Importance rating 1-3
  dealBreaker?: boolean; // Optional deal-breaker flag
}

export type QuestionnaireAnswers = Partial<Record<QuestionnaireItemKey, QuestionnaireAnswerItem>>;

export const ITEM_WEIGHTS: Record<QuestionnaireItemKey, number> = {
  sleep: 1.0,
  study: 0.9,
  tidiness: 0.9,
  noise: 0.8,
  guests: 0.6,
  temperature: 0.5,
  social: 0.5,
  sharing: 0.4,
  smoking: 1.0,
};

export interface QuestionnaireDefinitionItem {
  key: QuestionnaireItemKey;
  label: string;
  category: "ordinal" | "categorical";
  options?: Array<{ label: string; value: number | string }>;
  min?: number;
  max?: number;
  allowDealBreaker?: boolean;
}

export interface QuestionnaireDefinition {
  version: number;
  title: string;
  items: QuestionnaireDefinitionItem[];
}
