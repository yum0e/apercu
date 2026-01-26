export interface AppState {
  diffContent: string;
  scrollY: number;
  dimensions: { width: number; height: number };
  status: "running" | "exiting";
}

export function createInitialState(diffContent: string): AppState {
  return {
    diffContent,
    scrollY: 0,
    dimensions: { width: 80, height: 24 },
    status: "running",
  };
}
