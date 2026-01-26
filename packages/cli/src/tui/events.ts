export interface KeyInfo {
  name: string;
  ctrl: boolean;
  shift: boolean;
}

export type AppEvent =
  | { type: "KEYPRESS"; key: KeyInfo }
  | { type: "RESIZE"; width: number; height: number }
  | { type: "SCROLL"; delta: number }
  | { type: "EXIT" };
