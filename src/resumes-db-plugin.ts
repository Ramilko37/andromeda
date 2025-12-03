import type { Plugin } from '@elizaos/core';
import { resumesTable } from './resumes-schema.ts';

const resumesDbPlugin: Plugin = {
  name: 'resumes-db-plugin',
  description: 'Schema for storing parsed resumes',
  priority: 10,
  schema: {
    resumes: resumesTable,
  },
};

export default resumesDbPlugin;
