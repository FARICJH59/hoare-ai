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
  [key: string]: unknown;
};

export type ToolResult = {
  agent: string;
  action: string;
  output: string;
  payload: ToolPayload;
};

export type ToolHandler = (payload: ToolPayload) => Promise<ToolResult>;
