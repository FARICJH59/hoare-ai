export type ToolPayload = {
  task?: string;
  service?: string;
  dataset?: string;
  algorithm?: string;
  robot?: string;
  model?: string;
  entity?: string;
  resource?: string;
  component?: string;
  issue?: string;
  // carbon tool fields
  company?: string;
  sector?: string;
  projectType?: string;
  location?: string;
  // energy tool fields
  facility?: string;
  region?: string;
  loadProfile?: string;
  gridStatus?: string;
  [key: string]: unknown;
};

export type ToolResult = {
  agent: string;
  action: string;
  output: unknown;
  payload: ToolPayload;
};

export type ToolHandler = (payload: ToolPayload) => Promise<ToolResult>;
