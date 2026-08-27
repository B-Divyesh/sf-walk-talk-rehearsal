export interface Prompt {
  id: string;
  text: string;
  createdAt: number;
  lastPracticedAt?: number;
  nextDueAt?: number;
  repetitions: number;
}

export interface Deck {
  id: string;
  name: string;
  context: string;
  language: string;
  createdAt: number;
  updatedAt: number;
  prompts: Prompt[];
}

export interface Take {
  id: string;
  promptId: string;
  deckId: string;
  promptText: string;
  createdAt: number;
  durationMs: number;
  nextReplayAt: number;
  mimeType: string;
  audio: Blob;
}

export interface Settings {
  gapSeconds: number;
  textOnly: boolean;
  autoAdvance: boolean;
  outdoorReminderSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  gapSeconds: 20,
  textOnly: false,
  autoAdvance: false,
  outdoorReminderSeen: false,
};
