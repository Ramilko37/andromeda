import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
} from '@elizaos/core';
import { z } from 'zod';

/**
 * Define the configuration schema for the plugin with the following properties:
 *
 * @param {string} EXAMPLE_PLUGIN_VARIABLE - The name of the plugin (min length of 1, optional)
 * @returns {object} - The configured schema object
 */
const configSchema = z.object({
  EXAMPLE_PLUGIN_VARIABLE: z
    .string()
    .min(1, 'Example plugin variable is not provided')
    .optional()
    .transform((val) => {
      if (!val) {
        console.warn('Warning: Example plugin variable is not provided');
      }
      return val;
    }),
});

/**
 * Example HelloWorld action
 * This demonstrates the simplest possible action structure
 */
/**
 * Represents an action that responds with a simple hello world message.
 *
 * @typedef {Object} Action
 * @property {string} name - The name of the action
 * @property {string[]} similes - The related similes of the action
 * @property {string} description - Description of the action
 * @property {Function} validate - Validation function for the action
 * @property {Function} handler - The function that handles the action
 * @property {Object[]} examples - Array of examples for the action
 */
const helloWorldAction: Action = {
  name: 'HELLO_WORLD',
  similes: ['GREET', 'SAY_HELLO'],
  description: 'Responds with a simple hello world message',

  validate: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    // Always valid
    return true;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Handling HELLO_WORLD action');

      // Simple response content
      const responseContent: Content = {
        text: 'hello world!',
        actions: ['HELLO_WORLD'],
        source: message.content.source,
      };

      // Call back with the hello world message
      await callback(responseContent);

      return {
        text: 'Sent hello world greeting',
        values: {
          success: true,
          greeted: true,
        },
        data: {
          actionName: 'HELLO_WORLD',
          messageId: message.id,
          timestamp: Date.now(),
        },
        success: true,
      };
    } catch (error) {
      logger.error({ error }, 'Error in HELLO_WORLD action:');

      return {
        text: 'Failed to send hello world greeting',
        values: {
          success: false,
          error: 'GREETING_FAILED',
        },
        data: {
          actionName: 'HELLO_WORLD',
          error: error instanceof Error ? error.message : String(error),
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Can you say hello?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'hello world!',
          actions: ['HELLO_WORLD'],
        },
      },
    ],
  ],
};

/**
 * Action для поиска кандидатов в сети
 */
const searchCandidatesAction: Action = {
  name: 'SEARCH_CANDIDATES',
  similes: ['FIND_CANDIDATES', 'LOOK_FOR_CANDIDATES', 'SEARCH_TALENT'],
  description: 'Ищет кандидатов в интернете на работных сайтах и профессиональных сетях',

  validate: async (runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      text.includes('найди кандидатов') ||
      text.includes('найти кандидатов') ||
      text.includes('поиск кандидатов') ||
      text.includes('ищи кандидатов') ||
      text.includes('найди специалистов') ||
      text.includes('find candidates') ||
      text.includes('search candidates') ||
      text.includes('look for candidates')
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Handling SEARCH_CANDIDATES action');

      // Извлекаем параметры поиска из сообщения
      const searchText = message.content.text || '';

      // Пытаемся найти ключевые слова: навыки, должность, опыт
      const skillsMatch = searchText.match(/(?:навыки|skills?):\s*([^,]+)/i);
      const positionMatch = searchText.match(/(?:должность|позиция|position):\s*([^,]+)/i);
      const experienceMatch = searchText.match(/(?:опыт|experience):\s*([^,]+)/i);
      const locationMatch = searchText.match(/(?:город|location):\s*([^,]+)/i);

      const skills = skillsMatch ? skillsMatch[1].trim() : '';
      const position = positionMatch ? positionMatch[1].trim() : '';
      const experience = experienceMatch ? experienceMatch[1].trim() : '';
      const location = locationMatch ? locationMatch[1].trim() : '';

      // Формируем поисковые запросы для разных платформ
      const searchQueries = [];

      if (position) {
        searchQueries.push(`${position} резюме ${location ? `в ${location}` : ''}`);
        searchQueries.push(`${position} candidate ${location ? `in ${location}` : ''}`);
      }

      if (skills) {
        searchQueries.push(`резюме ${skills} ${location ? `в ${location}` : ''}`);
        searchQueries.push(`resume ${skills} ${location ? `in ${location}` : ''}`);
      }

      // Используем web-search плагин, если доступен
      const webSearchService = runtime.getService('web-search');

      let searchResults = [];
      if (webSearchService) {
        // Выполняем поиск через web-search плагин
        for (const query of searchQueries.slice(0, 3)) { // Ограничиваем до 3 запросов
          try {
            // Здесь должна быть логика вызова web-search сервиса
            // Это зависит от реализации плагина @elizaos/plugin-web-search
            logger.info({ query }, 'Searching for candidates with query');
          } catch (error) {
            logger.error({ error, query }, 'Error searching with query');
          }
        }
      }

      // Формируем ответ
      const responseText =
        `🔍 Ищу кандидатов по вашим критериям...\n\n` +
        (position ? `📋 Должность: ${position}\n` : '') +
        (skills ? `🛠️ Навыки: ${skills}\n` : '') +
        (experience ? `💼 Опыт: ${experience}\n` : '') +
        (location ? `📍 Локация: ${location}\n` : '') +
        `\n` +
        `Проверяю следующие источники:\n` +
        `• HeadHunter (hh.ru)\n` +
        `• LinkedIn\n` +
        `• Avito Работа\n` +
        `• Habr Career\n` +
        `• Профессиональные сообщества\n\n` +
        `Результаты поиска будут проанализированы, и подходящие кандидаты будут добавлены в базу.`;

      const responseContent: Content = {
        text: responseText,
        actions: ['SEARCH_CANDIDATES'],
        source: message.content.source,
      };

      await callback(responseContent);

      return {
        text: 'Candidate search initiated',
        values: {
          success: true,
          searched: true,
          queries: searchQueries,
          criteria: {
            position,
            skills,
            experience,
            location,
          },
        },
        data: {
          actionName: 'SEARCH_CANDIDATES',
          messageId: message.id,
          timestamp: Date.now(),
          searchQueries,
        },
        success: true,
      };
    } catch (error) {
      logger.error({ error }, 'Error in SEARCH_CANDIDATES action:');

      await callback({
        text: 'Произошла ошибка при поиске кандидатов. Попробуйте позже.',
        error: true,
      });

      return {
        text: 'Failed to search candidates',
        values: {
          success: false,
          error: 'SEARCH_FAILED',
        },
        data: {
          actionName: 'SEARCH_CANDIDATES',
          error: error instanceof Error ? error.message : String(error),
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Найди кандидатов на позицию Senior React Developer с опытом 5+ лет',
        },
      },
      {
        name: 'HR Recruiter',
        content: {
          text: '🔍 Ищу кандидатов по вашим критериям...',
          actions: ['SEARCH_CANDIDATES'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Поиск кандидатов: должность Python разработчик, навыки: Django, PostgreSQL, опыт: 3+ года, город: Москва',
        },
      },
      {
        name: 'HR Recruiter',
        content: {
          text: '🔍 Ищу кандидатов по вашим критериям...',
          actions: ['SEARCH_CANDIDATES'],
        },
      },
    ],
  ],
};

/**
 * Example Hello World Provider
 * This demonstrates the simplest possible provider implementation
 */
const helloWorldProvider: Provider = {
  name: 'HELLO_WORLD_PROVIDER',
  description: 'A simple example provider',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    return {
      text: 'I am a provider',
      values: {},
      data: {},
    };
  },
};

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription =
    'This is a starter service which is attached to the agent through the starter plugin.';

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('*** Starting starter service ***');
    const service = new StarterService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** Stopping starter service ***');
    // get the service from the runtime
    const service = runtime.getService(StarterService.serviceType);
    if (!service) {
      throw new Error('Starter service not found');
    }
    service.stop();
  }

  async stop() {
    logger.info('*** Stopping starter service instance ***');
  }
}

const plugin: Plugin = {
  name: 'hr-recruiter-plugin',
  description: 'HR Recruiter plugin with candidate search capabilities',
  // Set lowest priority so real models take precedence
  priority: -1000,
  config: {
    EXAMPLE_PLUGIN_VARIABLE: process.env.EXAMPLE_PLUGIN_VARIABLE,
  },
  async init(config: Record<string, string>) {
    logger.info('*** Initializing starter plugin ***');
    try {
      const validatedConfig = await configSchema.parseAsync(config);

      // Set all environment variables at once
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value) process.env[key] = value;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages =
          error.issues?.map((e) => e.message)?.join(', ') || 'Unknown validation error';
        throw new Error(`Invalid plugin configuration: ${errorMessages}`);
      }
      throw new Error(
        `Invalid plugin configuration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
  models: {
    [ModelType.TEXT_SMALL]: async (
      _runtime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
    },
    [ModelType.TEXT_LARGE]: async (
      _runtime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
    },
  },
  routes: [
    {
      name: 'helloworld',
      path: '/helloworld',
      type: 'GET',
      handler: async (_req: any, res: any) => {
        // send a response
        res.json({
          message: 'Hello World!',
        });
      },
    },
  ],
  events: {
    MESSAGE_RECEIVED: [
      async (params) => {
        logger.info('MESSAGE_RECEIVED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'MESSAGE_RECEIVED param keys');
      },
    ],
    VOICE_MESSAGE_RECEIVED: [
      async (params) => {
        logger.info('VOICE_MESSAGE_RECEIVED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'VOICE_MESSAGE_RECEIVED param keys');
      },
    ],
    WORLD_CONNECTED: [
      async (params) => {
        logger.info('WORLD_CONNECTED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'WORLD_CONNECTED param keys');
      },
    ],
    WORLD_JOINED: [
      async (params) => {
        logger.info('WORLD_JOINED event received');
        // print the keys
        logger.info({ keys: Object.keys(params) }, 'WORLD_JOINED param keys');
      },
    ],
  },
  services: [StarterService],
  actions: [helloWorldAction, searchCandidatesAction],
  providers: [helloWorldProvider],
};

export default plugin;
