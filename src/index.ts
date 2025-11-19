import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';
import starterPlugin from './plugin.ts';
import telegramJobsPlugin from './telegram-jobs-plugin.ts';
import { character } from './character.ts';

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info('Initializing character');
  logger.info({ name: character.name }, 'Name:');
};

export const projectAgent: ProjectAgent = {
  character,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  // Плагины включены
  plugins: [
    starterPlugin,
    telegramJobsPlugin,  // Плагин для чтения резюме из @it_vakansii_jobs
  ]
};

const project: Project = {
  agents: [projectAgent],
};

export { character } from './character.ts';

export default project;
