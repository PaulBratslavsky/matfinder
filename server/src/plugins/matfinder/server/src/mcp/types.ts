import type { Core } from '@strapi/strapi';

export type Path = (string | number)[];

/** One MCP tool: its schemas, its admin action (see index.ts) and a handler that calls the services. */
export type ToolDef = {
  name: string;
  title: string;
  /** Hand-written: what the tool is for and when to use it. */
  description: string;
  write: boolean;
  input: any;
  output: any;
  /** Shown with RESULT_TOO_LARGE: how to ask for less. */
  shrinkHint: string;
  /** Maps a Document Service error path to the tool's input names (e.g. schedule → sessions). */
  mapPath?: (path: Path) => Path;
  run: (strapi: Core.Strapi, args: any) => Promise<Record<string, unknown>>;
};

export const schoolService = (strapi: Core.Strapi) => strapi.service('api::school.school') as any;
