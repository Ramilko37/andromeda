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
import { th } from 'zod/v4/locales';

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
 * Action для поиска в интернете через Serper.dev API
 * Универсальный поиск для любых запросов, включая поиск кандидатов
 */
const searchWebSerperAction: Action = {
  name: 'SEARCH_WEB_SERPER',
  similes: ['SEARCH_WEB', 'GOOGLE_SEARCH', 'WEB_SEARCH', 'ИНТЕРНЕТ_ПОИСК', 'SEARCH_CANDIDATES', 'FIND_ONLINE'],
  description: 'SEARCH_WEB_SERPER: Web search action that searches on hh.ru, profi.ru, and vseti.app. Use when user asks to find/search candidates, resumes, or job postings online. Returns search results from all three sites with links. REQUIRED for all "find online", "search web", "найди в интернете" requests.',

  validate: async (runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    const hasSerperKey = !!process.env.SERPER_API_KEY?.trim();

    // Логирование для диагностики
    logger.info({
      messageText: text,
      hasSerperKey,
      textLength: text.length
    }, 'SEARCH_WEB_SERPER validate called');

    if (!hasSerperKey) {
      logger.warn('SERPER_API_KEY not found, SEARCH_WEB_SERPER action will not work');
      return false;
    }

    // Проверяем каждое условие отдельно для диагностики
    const checks = {
      'найди в интернете': text.includes('найди в интернете'),
      'поищи в интернете': text.includes('поищи в интернете'),
      'найди информацию': text.includes('найди информацию'),
      'поиск в интернете': text.includes('поиск в интернете'),
      'google search': text.includes('google search'),
      'search web': text.includes('search web'),
      'yandex search': text.includes('yandex search'),
      'find online': text.includes('find online'),
      'ищи в сети': text.includes('ищи в сети'),
      'найди кандидатов': text.includes('найди кандидатов'),
      'найти кандидатов': text.includes('найти кандидатов'),
      'поиск кандидатов': text.includes('поиск кандидатов'),
      'ищи кандидатов': text.includes('ищи кандидатов'),
      'найди специалистов': text.includes('найди специалистов'),
      'найди + кандидат/резюме/ваканси': text.includes('найди') && (text.includes('кандидат') || text.includes('резюме') || text.includes('ваканси')),
      'find candidates': text.includes('find candidates'),
      'search candidates': text.includes('search candidates'),
      'look for candidates': text.includes('look for candidates'),
    };

    const isValid = (
      text.includes('найди в интернете') ||
      text.includes('поищи в интернете') ||
      text.includes('найди информацию') ||
      text.includes('поиск в интернете') ||
      text.includes('google search') ||
      text.includes('search web') ||
      text.includes('yandex search') ||
      text.includes('find online') ||
      text.includes('ищи в сети') ||
      text.includes('найди кандидатов') ||
      text.includes('найти кандидатов') ||
      text.includes('поиск кандидатов') ||
      text.includes('ищи кандидатов') ||
      text.includes('найди специалистов') ||
      (text.includes('найди') && (text.includes('кандидат') || text.includes('резюме') || text.includes('ваканси'))) ||
      text.includes('find candidates') ||
      text.includes('search candidates') ||
      text.includes('look for candidates')
    );

    logger.info({
      isValid,
      checks,
      matchedChecks: Object.entries(checks).filter(([_, value]) => value).map(([key]) => key)
    }, 'SEARCH_WEB_SERPER validate result');

    return isValid;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    logger.info('🚀 SEARCH_WEB_SERPER handler STARTED');
    logger.info({
      messageId: message.id,
      messageText: message.content.text,
      agentId: runtime.agentId,
      characterName: runtime.character?.name
    }, 'Handler received message');

    try {
      logger.info('Handling SEARCH_WEB_SERPER action');

      const serperApiKey = process.env.SERPER_API_KEY;
      if (!serperApiKey) {
        throw new Error('SERPER_API_KEY is not configured');
      }

      // Извлекаем поисковый запрос из сообщения
      const messageText = message.content.text || '';

      // Определяем, это поиск кандидатов или общий поиск
      const isCandidateSearch =
        messageText.toLowerCase().includes('кандидат') ||
        messageText.toLowerCase().includes('резюме') ||
        messageText.toLowerCase().includes('candidate') ||
        messageText.toLowerCase().includes('resume');

      let query = messageText;

      // Если это поиск кандидатов, парсим параметры и формируем запрос
      if (isCandidateSearch) {
        const skillsMatch = messageText.match(/(?:навыки|skills?):\s*([^,]+)/i);
        const positionMatch = messageText.match(/(?:должность|позиция|position):\s*([^,]+)/i);
        const experienceMatch = messageText.match(/(?:опыт|experience):\s*([^,]+)/i);
        const locationMatch = messageText.match(/(?:город|location):\s*([^,]+)/i);

        const skills = skillsMatch ? skillsMatch[1].trim() : '';
        const position = positionMatch ? positionMatch[1].trim() : '';
        const experience = experienceMatch ? experienceMatch[1].trim() : '';
        const location = locationMatch ? locationMatch[1].trim() : '';

        // Формируем оптимизированный поисковый запрос
        query = '';
        if (position) {
          query += `${position} резюме`;
        } else if (skills) {
          query += `резюме ${skills}`;
        } else {
          // Извлекаем должность из общего текста
          const positionFromText = messageText.match(/(?:найди|найти|поиск|ищи)\s+([^с\s]+(?:\s+[^с\s]+)?)\s+(?:кандидат|разработчик|developer)/i);
          if (positionFromText) {
            query = `${positionFromText[1]} резюме`;
          } else {
            query = messageText.replace(/найди|найти|поиск|ищи|кандидат|candidate/gi, '').trim();
          }
        }

        if (skills && !position) {
          query += ` ${skills}`;
        }
        if (location) {
          query += ` ${location}`;
        }
        if (experience) {
          query += ` опыт ${experience}`;
        }
      } else {
        // Для общего поиска убираем триггерные фразы
        query = messageText
          .replace(/найди в интернете|поищи в интернете|найди информацию|поиск в интернете|google search|search web|find online|ищи в сети/gi, '')
          .trim();
      }

      // Если запрос пустой, используем весь текст сообщения
      if (!query || query.length < 3) {
        query = messageText;
      }

      logger.info({ query }, 'Searching with Serper.dev on hh.ru, profi.ru, vseti.app');

      // Список сайтов для поиска
      const searchSites = [
        { name: 'HeadHunter', domain: 'hh.ru', icon: '💼' },
        { name: 'Profi.ru', domain: 'profi.ru', icon: '🔧' },
        { name: 'Vseti', domain: 'vseti.app', icon: '🌐' },
      ];

      // Выполняем поиск на каждом сайте параллельно
      const searchPromises = searchSites.map(async (site) => {
        const siteQuery = `site:${site.domain} ${query}`;

        logger.info({ site: site.domain, query: siteQuery }, `Searching on ${site.name}`);

        try {
          const searchResponse = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': serperApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              q: siteQuery,
              num: 10, // Количество результатов с каждого сайта
              gl: 'ru', // Геолокация: Россия
              hl: 'ru', // Язык: русский
            }),
          });

          if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            logger.error({
              site: site.domain,
              status: searchResponse.status,
              errorText
            }, `Serper API error for ${site.name}`);
            return { site, results: [], error: true };
          }

          const searchData = await searchResponse.json();
          const results = (searchData.organic || []).map((result: any) => ({
            ...result,
            source: site.name,
            sourceDomain: site.domain,
            sourceIcon: site.icon,
          }));

          logger.info({
            site: site.domain,
            resultsCount: results.length
          }, `Search completed for ${site.name}`);

          return { site, results, error: false };
        } catch (error) {
          logger.error({ site: site.domain, error }, `Error searching ${site.name}`);
          return { site, results: [], error: true };
        }
      });

      // Ждем завершения всех запросов
      const searchResults = await Promise.all(searchPromises);

      // Объединяем результаты со всех сайтов
      const allResults: any[] = [];
      const siteStats: Record<string, number> = {};

      searchResults.forEach(({ site, results, error }) => {
        if (!error && results.length > 0) {
          allResults.push(...results);
          siteStats[site.name] = results.length;
        } else {
          siteStats[site.name] = 0;
        }
      });

      logger.info({
        totalResults: allResults.length,
        siteStats,
        query
      }, 'All searches completed');

      // Формируем ответ с результатами
      const results = allResults;

      // Определяем тип поиска по финальному запросу
      const isCandidateSearchResult =
        query.toLowerCase().includes('резюме') ||
        query.toLowerCase().includes('кандидат') ||
        query.toLowerCase().includes('resume') ||
        query.toLowerCase().includes('candidate');

      let responseText = '';
      if (isCandidateSearchResult) {
        responseText = `🔍 Результаты поиска кандидатов по запросу: "${query}"\n\n`;
      } else {
        responseText = `🔍 Результаты поиска по запросу: "${query}"\n\n`;
      }

      // Показываем статистику по сайтам
      responseText += `📊 Поиск выполнен на:\n`;
      Object.entries(siteStats).forEach(([siteName, count]) => {
        const siteInfo = searchSites.find(s => s.name === siteName);
        const icon = siteInfo?.icon || '📄';
        responseText += `   ${icon} ${siteName}: ${count} результатов\n`;
      });
      responseText += '\n';

      if (results.length === 0) {
        responseText += '❌ Результаты не найдены на указанных сайтах. Попробуйте изменить запрос.';
      } else {
        responseText += `✅ Всего найдено результатов: ${results.length}\n\n`;

        // Группируем результаты по сайтам
        const resultsBySite: Record<string, any[]> = {};
        results.forEach((result: any) => {
          const siteName = result.source || 'Unknown';
          if (!resultsBySite[siteName]) {
            resultsBySite[siteName] = [];
          }
          resultsBySite[siteName].push(result);
        });

        // Показываем результаты, сгруппированные по сайтам
        let resultIndex = 1;
        searchSites.forEach((site) => {
          const siteResults = resultsBySite[site.name] || [];
          if (siteResults.length > 0) {
            responseText += `\n${site.icon} **${site.name}** (${siteResults.length}):\n\n`;

            siteResults.slice(0, 5).forEach((result: any) => {
              responseText += `${resultIndex}. **${result.title || 'Без названия'}**\n`;
              responseText += `   ${result.snippet || result.description || ''}\n`;
              if (result.link) {
                responseText += `   🔗 ${result.link}\n`;
              }
              responseText += '\n';
              resultIndex++;
            });

            if (siteResults.length > 5) {
              responseText += `   ... и еще ${siteResults.length - 5} результатов с ${site.name}\n\n`;
            }
          }
        });

        if (results.length > 15) {
          responseText += `\n📋 Всего найдено: ${results.length} результатов на всех сайтах\n`;
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['SEARCH_WEB_SERPER'],
        source: message.content.source,
      };

      await callback(responseContent);

      return {
        text: `Web search completed: ${results.length} results found`,
        values: {
          success: true,
          searched: true,
          query,
          resultsCount: results.length,
          results: results.map((r: any) => ({
            title: r.title,
            link: r.link,
            snippet: r.snippet,
          })),
        },
        data: {
          actionName: 'SEARCH_WEB_SERPER',
          messageId: message.id,
          timestamp: Date.now(),
          query,
          siteStats,
          searchResults: searchResults.map(({ site, results }) => ({
            site: site.name,
            domain: site.domain,
            count: results.length,
          })),
        },
        success: true,
      };
    } catch (error) {
      logger.error({ error }, 'Error in SEARCH_WEB_SERPER action:');

      const errorMessage = error instanceof Error ? error.message : String(error);
      await callback({
        text: `❌ Ошибка при поиске в интернете: ${errorMessage}\n\nПроверьте, что SERPER_API_KEY настроен правильно.`,
        error: true,
      });

      return {
        text: 'Failed to search web',
        values: {
          success: false,
          error: 'SEARCH_FAILED',
        },
        data: {
          actionName: 'SEARCH_WEB_SERPER',
          error: errorMessage,
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Найди в интернете React разработчиков',
        },
      },
      {
        name: 'HR Recruiter',
        content: {
          text: '🔍 Результаты поиска по запросу: "React разработчиков"\n\n✅ Найдено результатов: 10\n\n1. **React Developer Jobs - HeadHunter**\n   ...',
          actions: ['SEARCH_WEB_SERPER'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Поищи в интернете вакансии Python',
        },
      },
      {
        name: 'HR Recruiter',
        content: {
          text: '🔍 Результаты поиска по запросу: "вакансии Python"\n\n✅ Найдено результатов: 8\n\n1. **Python Developer Jobs**\n   ...',
          actions: ['SEARCH_WEB_SERPER'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Найди кандидатов на позицию Frontend Developer',
        },
      },
      {
        name: 'HR Recruiter',
        content: {
          text: '🔍 Результаты поиска кандидатов по запросу: "Frontend Developer резюме"\n\n✅ Найдено результатов: 12\n\n1. **Frontend Developer Resume**\n   ...',
          actions: ['SEARCH_WEB_SERPER'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'search web for React developers',
        },
      },
      {
        name: 'HR Recruiter',
        content: {
          text: '🔍 Результаты поиска по запросу: "React developers"\n\n✅ Найдено результатов: 10\n\n1. **React Developer Jobs**\n   ...',
          actions: ['SEARCH_WEB_SERPER'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'find online Python candidates',
        },
      },
      {
        name: 'HR Recruiter',
        content: {
          text: '🔍 Результаты поиска по запросу: "Python candidates"\n\n✅ Найдено результатов: 8\n\n1. **Python Developer Resume**\n   ...',
          actions: ['SEARCH_WEB_SERPER'],
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

// Базовый приветственный action
const greetAction: Action = {
  name: 'GREET_BASIC',
  similes: ['GREET', 'SAY_HELLO', 'ПРИВЕТСТВИЕ'],
  description: 'Отвечает на приветствие кандидата стандартным сообщением',

  validate: async (_runtime, message, _state) => {
    const text = message.content.text?.toLowerCase() || '';
    return text.includes('привет') || text.includes('hello');
  },

  handler: async (_runtime, message, _state, _options, callback) => {
    const responseContent: Content = {
      text: 'Привет! Я HR-бот. Чем могу помочь?',
      actions: ['GREET_BASIC'],
      source: message.content.source,
    };

    if (callback) {
      await callback(responseContent);
    }

    return {
      text: responseContent.text,
      values: { greeted: true },
      data: { actionName: 'GREET_BASIC', messageId: message.id, timestamp: Date.now() },
      success: true,
    };
  },

  examples: [
    [
      { name: '{{name1}}', content: { text: 'Привет!' } },
      { name: 'HR Recruiter', content: { text: 'Привет! Я HR-бот. Чем могу помочь?', actions: ['GREET_BASIC'] } },
    ],
    [
      { name: '{{name1}}', content: { text: 'Hello' } },
      { name: 'HR Recruiter', content: { text: 'Привет! Я HR-бот. Чем могу помочь?', actions: ['GREET_BASIC'] } },
    ],
  ],
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
    // Проверяем, что метод stop существует и это функция
    if (typeof service.stop === 'function') {
      service.stop();
    }
  }

  async stop() {
    logger.info('*** Stopping starter service instance ***');
  }
}

const plugin: Plugin = {
  name: 'hr-recruiter-plugin',
  description: 'HR Recruiter plugin with candidate search capabilities',
  // Higher priority to ensure actions are selected
  priority: 100,
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
  // Закомментировано: mock модели перехватывали запросы и возвращали Rick Roll
  // Используем реальные модели из character.ts (Google)
  // models: {
  //   [ModelType.TEXT_SMALL]: async (
  //     _runtime,
  //     { prompt, stopSequences = [] }: GenerateTextParams
  //   ) => {
  //     return 'Never gonna give you up, never gonna let you down, never gonna run around and desert you...';
  //   },
  //   [ModelType.TEXT_LARGE]: async (
  //     _runtime,
  //     {
  //       prompt,
  //       stopSequences = [],
  //       maxTokens = 8192,
  //       temperature = 0.7,
  //       frequencyPenalty = 0.7,
  //       presencePenalty = 0.7,
  //     }: GenerateTextParams
  //   ) => {
  //     return 'Never gonna make you cry, never gonna say goodbye, never gonna tell a lie and hurt you...';
  //   },
  // },
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
        logger.info({ keys: Object.keys(params) }, 'MESSAGE_RECEIVED param keys');

        // Попытка принудительно вызвать action, если validate возвращает true
        if (params.message && params.runtime) {
          const messageText = params.message.content?.text || '';
          const text = messageText.toLowerCase();

          // Проверяем условия для SEARCH_WEB_SERPER
          const shouldTrigger = (
            text.includes('найди в интернете') ||
            text.includes('поищи в интернете') ||
            text.includes('найди информацию') ||
            text.includes('найди кандидатов') ||
            text.includes('search web') ||
            text.includes('find online')
          ) && !!process.env.SERPER_API_KEY?.trim();

          if (shouldTrigger) {
            logger.warn('⚠️ Message should trigger SEARCH_WEB_SERPER action!');
            logger.warn('⚠️ If handler is not called, LLM is not selecting this action!');
            logger.info('Check if SEARCH_WEB_SERPER action is registered and validate returns true');
          }
        }
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
  actions: [greetAction, helloWorldAction, searchWebSerperAction],
  providers: [helloWorldProvider],
};

logger.info('📦 hr-recruiter-plugin module loaded');
logger.info({
  actions: plugin.actions?.map(a => a.name) || [],
  services: plugin.services?.map(s => s.serviceType || s.name) || []
}, 'Plugin structure');

export default plugin;
