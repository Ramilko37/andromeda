import type {
    Plugin,
    Action,
    ActionResult,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    UUID,
} from '@elizaos/core';
import { ChannelType } from '@elizaos/core';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { logger, Service } from '@elizaos/core';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

/**
 * Интерфейс для резюме кандидата
 */
interface CandidateResume {
    name: string;
    position: string;
    level?: string;
    location?: string;
    salary?: string;
    skills?: string[];
    experience?: string;
    contacts?: string;
    messageLink?: string;
    date?: Date;
    rawText?: string;
}

/**
 * Вспомогательная функция для интерактивного ввода через readline
 */
function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) =>
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        })
    );
}

/**
 * Сервис для чтения резюме из Telegram канала @it_vakansii_jobs
 */
class TelegramJobsService extends Service {
    static serviceType = 'telegram-jobs';
    capabilityDescription = 'Читает резюме из Telegram канала @it_vakansii_jobs';


    private telegramClient: TelegramClient | null = null;
    private channelUsername = 'javascript_jobs';
    private channelUrl = 'https://t.me/javascript_jobs';
    private cachedResumes: CandidateResume[] = [];
    private lastUpdateTime: Date | null = null;

    constructor(runtime: IAgentRuntime) {
        super(runtime);
    }

    // Обновите метод start:
    static async start(runtime: IAgentRuntime) {
        logger.info('*** Starting Telegram Jobs service ***');
        const service = new TelegramJobsService(runtime);

        // Инициализируем Telegram Client
        await service.initTelegramClient();

        // Пытаемся загрузить резюме при старте
        try {
            await service.fetchChannelMessages(runtime);
        } catch (error) {
            logger.warn({ error }, 'Could not fetch messages on startup');
        }

        return service;
    }

    async initTelegramClient() {
        try {
            const apiId = process.env.TELEGRAM_API_ID;
            const apiHash = process.env.TELEGRAM_API_HASH;
            const phoneNumber = process.env.TELEGRAM_PHONE;

            if (!apiId || !apiHash || !phoneNumber) {
                logger.warn('Telegram Client API credentials not provided');
                logger.warn('Set TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE in .env');
                return;
            }

            logger.info('📱 Initializing Telegram Client...');

            const stringSession = new StringSession(process.env.TELEGRAM_SESSION || '');

            this.telegramClient = new TelegramClient(
                stringSession,
                parseInt(apiId),
                apiHash,
                {
                    connectionRetries: 5,
                }
            );

            await this.telegramClient.start({
                phoneNumber: async () => phoneNumber,
                password: async () => {
                    if (process.env.TELEGRAM_PASSWORD) {
                        return process.env.TELEGRAM_PASSWORD;
                    }
                    logger.info('🔐 2FA password required');
                    const password = await askQuestion('Enter your 2FA password (or press Enter to skip): ');
                    return password;
                },
                phoneCode: async () => {
                    logger.info('📩 Telegram sent you a verification code. Check your messages!');
                    const code = await askQuestion('Enter the code you received: ');
                    return code;
                },
                onError: (err) => logger.error({ err }, 'Telegram auth error'),
            });

            logger.info('✅ Telegram Client connected successfully!');

            // Сохраните session для следующего запуска
            const session = this.telegramClient.session.save();
            logger.info('💾 IMPORTANT: Save this session to .env to avoid re-authentication:');
            logger.info(`TELEGRAM_SESSION=${session}`);
            logger.info('(Add this line to your .env file)');

        } catch (error) {
            logger.error({ error }, 'Failed to initialize Telegram Client');
        }
    }


    static async stop(runtime: IAgentRuntime) {
        logger.info('*** Stopping Telegram Jobs service ***');
        const service = runtime.getService(TelegramJobsService.serviceType);
        if (service && typeof (service as any).stop === 'function') {
            await (service as any).stop();
        }
    }

    async stop() {
        logger.info('*** Stopping Telegram Jobs service instance ***');
        // Очищаем кэш
        this.cachedResumes = [];
        this.lastUpdateTime = null;
    }

    /**
     * Получение резюме из канала
     */
    async fetchChannelMessages(runtime: IAgentRuntime, limit: number = 10): Promise<CandidateResume[]> {
        try {
            logger.info({ channel: this.channelUsername, limit }, 'Fetching from Telegram channel');

            if (!this.telegramClient) {
                logger.warn('⚠️ Telegram client not initialized');
                return this.cachedResumes;
            }

            // Получаем сообщения из канала
            const messages = await this.telegramClient.getMessages(this.channelUsername, {
                limit: limit,
            });

            logger.info({ count: messages.length }, '📥 Received messages from channel');

            // Парсим резюме
            const resumes = messages
                .map((msg) => this.parseResumeFromMessage(msg))
                .filter((r) => r !== null) as CandidateResume[];

            this.cachedResumes = resumes;
            this.lastUpdateTime = new Date();

            logger.info({
                totalMessages: messages.length,
                parsedResumes: resumes.length
            }, '✅ Successfully parsed resumes');

            // Логируем первые 5 резюме при загрузке
            console.log('\n========================================');
            console.log('📋 ПЕРВЫЕ 5 РЕЗЮМЕ ПРИ ЗАГРУЗКЕ ИЗ TELEGRAM:');
            console.log('========================================\n');

            resumes.slice(0, 5).forEach((resume, index) => {
                console.log(`${index + 1}. ${resume.name}`);
                console.log(`   💼 Должность: ${resume.position}`);
                console.log(`   📊 Уровень: ${resume.level || 'Не указан'}`);
                console.log(`   📍 Локация: ${resume.location || 'Не указана'}`);
                console.log(`   💰 ЗП: ${resume.salary || 'Не указана'}`);
                console.log(`   🛠️ Навыки: ${resume.skills?.slice(0, 5).join(', ') || 'Не указаны'}`);
                console.log(`   📞 Контакты: ${resume.contacts || 'Не указаны'}`);
                console.log(`   🔗 Ссылка: ${resume.messageLink}`);
                console.log('----------------------------------------\n');
            });

            console.log(`✅ Всего загружено и кэшировано: ${resumes.length} резюме`);
            console.log(`⏰ Время загрузки: ${new Date().toLocaleString('ru-RU')}`);
            console.log('========================================\n');


            return resumes;
        } catch (error) {
            logger.error({ error }, 'Error fetching channel messages');
            return this.cachedResumes;
        }
    }
    /**
     * Парсинг резюме из сообщения Telegram
     */
    private parseResumeFromMessage(message: any): CandidateResume | null {
        try {
            const text = message.text || message.message || '';

            // Пропускаем слишком короткие сообщения
            if (text.length < 50) {
                return null;
            }

            // Ищем признаки резюме (а не вакансии)
            const isResume =
                text.toLowerCase().includes('резюме') ||
                text.toLowerCase().includes('ищу работу') ||
                text.toLowerCase().includes('рассмотрю предложения') ||
                text.match(/опыт работы/i) ||
                text.match(/навыки:/i);

            // Пропускаем вакансии
            const isVacancy =
                text.toLowerCase().includes('вакансия') ||
                text.toLowerCase().includes('требуется') ||
                text.toLowerCase().includes('ищем') ||
                text.toLowerCase().includes('vacancy');

            if (isVacancy && !isResume) {
                return null;
            }

            // Извлекаем информацию
            const name = this.extractName(text);
            const position = this.extractPosition(text);
            const level = this.extractLevel(text);
            const location = this.extractLocation(text);
            const salary = this.extractSalary(text);
            const skills = this.extractSkills(text);
            const experience = this.extractExperience(text);
            const contacts = this.extractContacts(text);

            // Создаем ссылку на сообщение
            const messageLink = message.id
                ? `https://t.me/${this.channelUsername}/${message.id}`
                : this.channelUrl;

            return {
                name,
                position,
                level,
                location,
                salary,
                skills,
                experience,
                contacts,
                messageLink,
                date: message.date ? new Date(message.date * 1000) : new Date(),
                rawText: text,
            };
        } catch (error) {
            logger.error({ error, message }, 'Error parsing resume from message');
            return null;
        }
    }

    /**
     * Извлечение имени
     */
    private extractName(text: string): string {
        // Паттерны для имени
        const patterns = [
            /(?:меня зовут|имя:?)\s+([А-Яа-яЁё]+(?:\s+[А-Яа-яЁё]+)*)/i,
            /^([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/m,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return 'Не указано';
    }

    /**
     * Извлечение должности
     */
    private extractPosition(text: string): string {
        const patterns = [
            /(?:должность|позиция|специальность):?\s*([^\n]+)/i,
            /(Frontend|Backend|Fullstack|React|Vue|Angular|Node\.?js|Python|Java|DevOps|QA|Mobile|iOS|Android|Designer|UI\/UX|Product Manager|Project Manager|Analyst|Data Scientist)\s*(?:разработчик|developer|engineer|инженер|дизайнер|менеджер|аналитик)?/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1]?.trim() || match[0].trim();
            }
        }

        return 'Не указано';
    }

    /**
     * Извлечение уровня
     */
    private extractLevel(text: string): string | undefined {
        const match = text.match(/\b(Junior|Middle|Senior|Lead|Intern|Trainee)\b/i);
        return match ? match[1] : undefined;
    }

    /**
     * Извлечение локации
     */
    private extractLocation(text: string): string | undefined {
        const patterns = [
            /(?:город|локация|location):?\s*([^\n,]+)/i,
            /\b(Москва|Санкт-Петербург|СПб|Питер|Екатеринбург|Новосибирск|Казань|Нижний Новгород|Краснодар|Удалённо|Remote|Релокация)\b/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return undefined;
    }

    /**
     * Извлечение зарплаты
     */
    private extractSalary(text: string): string | undefined {
        const patterns = [
            /(?:зарплата|salary|зп|оклад):?\s*([^\n]+)/i,
            /от\s*(\d+\s*(?:000|k|к)?\s*(?:руб|₽|rub)?)/i,
            /(\d+\s*-\s*\d+\s*(?:000|k|к)?\s*(?:руб|₽|rub)?)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return undefined;
    }

    /**
     * Извлечение навыков
     */
    private extractSkills(text: string): string[] | undefined {
        const skillsSection = text.match(/(?:навыки|skills|стек|технологии):?\s*([^\n]+(?:\n[^\n]+)*)/i);

        if (skillsSection) {
            const skillsText = skillsSection[1];
            const skills = skillsText
                .split(/[,;•\n]/)
                .map(s => s.trim())
                .filter(s => s.length > 0 && s.length < 50);

            return skills.length > 0 ? skills : undefined;
        }

        return undefined;
    }

    /**
     * Извлечение опыта работы
     */
    private extractExperience(text: string): string | undefined {
        const patterns = [
            /(?:опыт работы|experience):?\s*([^\n]+)/i,
            /(\d+\s*(?:лет|года?|years?)(?:\s+опыта)?)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return undefined;
    }

    /**
     * Извлечение контактов
     */
    private extractContacts(text: string): string | undefined {
        const patterns = [
            /(?:telegram|тг|tg):?\s*@?(\w+)/i,
            /(?:email|почта|e-mail):?\s*([\w\.-]+@[\w\.-]+\.\w+)/i,
            /(?:телефон|phone|тел):?\s*(\+?\d[\d\s\-()]+)/i,
        ];

        const contacts: string[] = [];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                contacts.push(match[0].trim());
            }
        }

        return contacts.length > 0 ? contacts.join(', ') : undefined;
    }

    /**
     * Поиск резюме по критериям
     */
    async searchResumes(filters: {
        profession?: string;
        level?: string;
        location?: string;
        forceRefresh?: boolean;
    }): Promise<CandidateResume[]> {
        try {
            // Логируем состояние кэша
            const cacheAge = this.lastUpdateTime
                ? Math.floor((Date.now() - this.lastUpdateTime.getTime()) / 1000)
                : null;

            console.log('\n🔍 searchResumes вызвана:');
            console.log(`   📦 В кэше: ${this.cachedResumes.length} резюме`);
            console.log(`   🔄 forceRefresh: ${filters.forceRefresh}`);
            console.log(`   ⏰ Возраст кэша: ${cacheAge ? cacheAge + ' сек (' + Math.floor(cacheAge / 60) + ' мин)' : 'нет данных'}`);

            if (this.cachedResumes.length > 0) {
                console.log(`   ✅ Первое резюме в кэше: "${this.cachedResumes[0].name}" - ${this.cachedResumes[0].position}`);
            }

            // Обновляем кэш, если нужно
            if (filters.forceRefresh || !this.lastUpdateTime ||
                Date.now() - this.lastUpdateTime.getTime() > 3600000) { // 1 час
                console.log('   🌐 Делаю НОВЫЙ запрос к Telegram...\n');
                await this.fetchChannelMessages(this.runtime);
            } else {
                console.log('   📦 Использую КЭШ (свежий, не требует обновления)\n');
            }

            // Фильтруем резюме
            let results = [...this.cachedResumes];

            console.log('results', results);

            if (filters.profession) {
                const professionLower = filters.profession.toLowerCase();
                results = results.filter(r =>
                    r.position.toLowerCase().includes(professionLower) ||
                    r.skills?.some(s => s.toLowerCase().includes(professionLower))
                );
            }

            if (filters.level) {
                const levelLower = filters.level.toLowerCase();
                results = results.filter(r =>
                    r.level?.toLowerCase() === levelLower
                );
            }

            if (filters.location) {
                const locationLower = filters.location.toLowerCase();
                results = results.filter(r =>
                    r.location?.toLowerCase().includes(locationLower)
                );
            }

            // Сортируем по дате (новые сначала)
            results.sort((a, b) =>
                (b.date?.getTime() || 0) - (a.date?.getTime() || 0)
            );

            return results;
        } catch (error) {
            logger.error({ error }, 'Error searching resumes');
            throw error;
        }
    }

    /**
     * Получение инструкций для ручного подключения
     */
    getManualInstructions(): string {
        return (
            `📱 **Как подключиться к каналу @it_vakansii_jobs:**\n\n` +
            `1️⃣ Откройте канал: ${this.channelUrl}\n` +
            `2️⃣ Подпишитесь на канал (если еще не подписаны)\n` +
            `3️⃣ Читайте новые резюме в ленте канала\n\n` +
            `🤖 **Для автоматического чтения настройте Telegram API:**\n\n` +
            `1. Получите API credentials на https://my.telegram.org/apps\n` +
            `2. Добавьте в .env:\n` +
            `   \`\`\`\n` +
            `   TELEGRAM_API_ID=your_api_id\n` +
            `   TELEGRAM_API_HASH=your_api_hash\n` +
            `   TELEGRAM_PHONE=+79001234567\n` +
            `   \`\`\`\n` +
            `3. Перезапустите агента: \`bun run dev\`\n\n` +
            `🔗 Прямая ссылка: ${this.channelUrl}`
        );
    }
}

/**
 * Action для поиска резюме в канале @it_vakansii_jobs
 */
const searchTelegramJobsAction: Action = {
    name: 'SEARCH_TELEGRAM_JOBS',
    similes: ['FIND_TELEGRAM_JOBS', 'IT_VAKANSII', 'ПОИСК_ТЕЛЕГРАМ', 'FIND_RESUMES_TELEGRAM'],
    description: 'Ищет резюме frontend разработчиков в Telegram канале @it_vakansii_jobs',

    validate: async (runtime: IAgentRuntime, message: Memory, _state: State): Promise<boolean> => {
        const text = message.content.text?.toLowerCase() || '';

        // Проверяем упоминание Telegram
        const hasTelegram =
            text.includes('telegram') ||
            text.includes('телеграм') ||
            text.includes('it_vakansii');

        // Проверяем упоминание резюме/кандидатов
        const hasResumes =
            text.includes('резюме') ||
            text.includes('кандидат') ||
            text.includes('разработчик') ||
            text.includes('список');

        // Проверяем действие (найди, покажи, поиск)
        const hasAction =
            text.includes('найди') ||
            text.includes('покажи') ||
            text.includes('поиск') ||
            text.includes('найти') ||
            text.includes('показать') ||
            text.includes('ищи') ||
            text.includes('найдите') ||
            text.includes('загрузи') ||
            text.includes('обнови');

        // Срабатывает если есть (telegram + резюме) ИЛИ (действие + telegram) ИЛИ (действие + резюме + telegram)
        return (hasTelegram && hasResumes) || (hasAction && hasTelegram) || (hasAction && hasResumes && hasTelegram);
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback,
        _responses: Memory[]
    ): Promise<ActionResult> => {
        try {
            logger.info('Handling SEARCH_TELEGRAM_JOBS action');

            const searchText = message.content.text?.toLowerCase() || '';

            // Извлекаем параметры
            const professionMatch = searchText.match(/\b(frontend|backend|fullstack|react|vue|angular|node|python|java|devops|qa|mobile|ios|android|designer|ui|ux|product|project|analyst|data)\b/i);
            const levelMatch = searchText.match(/\b(junior|middle|senior|lead|intern)\b/i);
            const locationMatch = searchText.match(/\b(москва|питер|спб|екатеринбург|новосибирск|удалённо|remote|релокация)\b/i);

            const filters = {
                profession: professionMatch?.[0] || 'frontend',
                level: levelMatch?.[0] || undefined,
                location: locationMatch?.[0] || undefined,
                forceRefresh: searchText.includes('обновить') || searchText.includes('refresh'),
            };

            // Получаем сервис
            const telegramJobsService = runtime.getService('telegram-jobs') as TelegramJobsService;

            if (!telegramJobsService) {
                await callback({
                    text: '⚠️ Сервис Telegram Jobs недоступен. Проверьте настройки плагина.',
                    error: true,
                });

                return {
                    text: 'Telegram jobs service not available',
                    success: false,
                    error: new Error('Service not initialized'),
                };
            }

            // Показываем статус поиска
            await callback({
                text:
                    `🔍 Читаю резюме из канала @it_vakansii_jobs...\n\n` +
                    `📋 Критерии поиска:\n` +
                    `• Профессия: ${filters.profession}\n` +
                    `${filters.level ? `• Уровень: ${filters.level}\n` : ''}` +
                    `${filters.location ? `• Локация: ${filters.location}\n` : ''}` +
                    `\n⏳ Анализирую сообщения...`,
            });

            // Пытаемся найти резюме
            let resumes: CandidateResume[] = [];
            let isManualMode = false;

            try {
                resumes = await telegramJobsService.searchResumes(filters);
            } catch (error) {
                logger.error({ error }, 'Error searching resumes - falling back to manual mode');
                isManualMode = true;
            }

            // Формируем ответ
            let responseText = '';

            if (isManualMode) {
                // Ручной режим - даем инструкции
                responseText =
                    `⚠️ Не удалось автоматически прочитать канал.\n\n` +
                    telegramJobsService.getManualInstructions();
            } else if (resumes.length === 0) {
                responseText =
                    `😔 По вашим критериям резюме не найдено в канале @it_vakansii_jobs.\n\n` +
                    `💡 Рекомендации:\n` +
                    `• Попробуйте изменить критерии поиска\n` +
                    `• Подождите — новые резюме появляются регулярно\n` +
                    `• Подпишитесь на канал для получения уведомлений\n\n` +
                    `🔗 Канал: https://t.me/it_vakansii_jobs`;
            } else {
                responseText =
                    `✅ Найдено резюме в канале @it_vakansii_jobs: **${resumes.length}**\n\n` +
                    `📋 Топ-10 кандидатов:\n\n`;

                resumes.slice(0, 10).forEach((resume, index) => {
                    responseText +=
                        `**${index + 1}. ${resume.name}**\n` +
                        `💼 ${resume.position}\n` +
                        (resume.level ? `📊 ${resume.level}\n` : '') +
                        (resume.location ? `📍 ${resume.location}\n` : '') +
                        (resume.salary ? `💰 ${resume.salary}\n` : '') +
                        (resume.experience ? `⏱️ ${resume.experience}\n` : '') +
                        (resume.skills && resume.skills.length > 0 ? `🛠️ ${resume.skills.slice(0, 5).join(', ')}\n` : '') +
                        (resume.contacts ? `📞 ${resume.contacts}\n` : '') +
                        `🔗 ${resume.messageLink}\n\n`;
                });

                // Логируем первые 10 резюме
                console.log('\n========================================');
                console.log('📋  ');
                console.log('========================================\n');
                resumes.slice(0, 10).forEach((resume, index) => {
                    console.log(`${index + 1}. ${resume.name}`);
                    console.log(`   Должность: ${resume.position}`);
                    console.log(`   Уровень: ${resume.level || 'Не указан'}`);
                    console.log(`   Локация: ${resume.location || 'Не указана'}`);
                    console.log(`   ЗП: ${resume.salary || 'Не указана'}`);
                    console.log(`   Навыки: ${resume.skills?.join(', ') || 'Не указаны'}`);
                    console.log(`   Опыт: ${resume.experience || 'Не указан'}`);
                    console.log(`   Контакты: ${resume.contacts || 'Не указаны'}`);
                    console.log(`   Ссылка: ${resume.messageLink}`);
                    console.log(`   Дата: ${resume.date?.toLocaleString('ru-RU') || 'Не указана'}`);
                    console.log('----------------------------------------\n');
                });
                console.log(`Всего найдено резюме: ${resumes.length}\n`);
                console.log('========================================\n');

                if (resumes.length > 10) {
                    responseText += `\n... и еще ${resumes.length - 10} резюме(й)\n\n`;
                }

                responseText += `\n📱 Канал: https://t.me/javascript_jobs`;
            }

            const responseContent: Content = {
                text: responseText,
                actions: ['SEARCH_TELEGRAM_JOBS'],
                source: message.content.source,
            };

            await callback(responseContent);

            return {
                text: 'Telegram jobs search completed',
                values: {
                    success: true,
                    manualMode: isManualMode,
                    resultsCount: resumes.length,
                    resumes: resumes.slice(0, 10),
                },
                data: {
                    actionName: 'SEARCH_TELEGRAM_JOBS',
                    messageId: message.id,
                    timestamp: Date.now(),
                    filters,
                    results: resumes,
                },
                success: true,
            };
        } catch (error) {
            logger.error({ error }, 'Error in SEARCH_TELEGRAM_JOBS action');

            const service = runtime.getService('telegram-jobs') as TelegramJobsService;
            const instructions = service?.getManualInstructions() || 'Откройте канал вручную: https://t.me/it_vakansii_jobs';

            await callback({
                text:
                    `⚠️ Произошла ошибка при чтении канала.\n\n` +
                    instructions,
                error: true,
            });

            return {
                text: 'Failed to search via Telegram',
                values: {
                    success: false,
                    error: 'TELEGRAM_SEARCH_FAILED',
                },
                data: {
                    actionName: 'SEARCH_TELEGRAM_JOBS',
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
                    text: 'Найди frontend разработчиков в канале it_vakansii_jobs',
                },
            },
            {
                name: 'HR Recruiter',
                content: {
                    text: '🔍 Читаю резюме из канала @it_vakansii_jobs...',
                    actions: ['SEARCH_TELEGRAM_JOBS'],
                },
            },
        ],
        [
            {
                name: '{{name1}}',
                content: {
                    text: 'Поищи senior frontend разработчиков в Москве в телеграм канале',
                },
            },
            {
                name: 'HR Recruiter',
                content: {
                    text: '🔍 Читаю резюме из канала...\n📋 Критерии: senior frontend в Москве',
                    actions: ['SEARCH_TELEGRAM_JOBS'],
                },
            },
        ],
        [
            {
                name: '{{name1}}',
                content: {
                    text: 'Покажи список резюме из телеграм',
                },
            },
            {
                name: 'HR Recruiter',
                content: {
                    text: '🔍 Читаю резюме из канала @it_vakansii_jobs...',
                    actions: ['SEARCH_TELEGRAM_JOBS'],
                },
            },
        ],
        [
            {
                name: '{{name1}}',
                content: {
                    text: 'Покажи кандидатов из телеграм канала',
                },
            },
            {
                name: 'HR Recruiter',
                content: {
                    text: '🔍 Читаю резюме из канала @it_vakansii_jobs...',
                    actions: ['SEARCH_TELEGRAM_JOBS'],
                },
            },
        ],
        [
            {
                name: '{{name1}}',
                content: {
                    text: 'Загрузи резюме разработчиков из телеграм',
                },
            },
            {
                name: 'HR Recruiter',
                content: {
                    text: '🔍 Читаю резюме из канала @it_vakansii_jobs...',
                    actions: ['SEARCH_TELEGRAM_JOBS'],
                },
            },
        ],
    ],
};

/**
 * Плагин для чтения канала @it_vakansii_jobs
 */
const telegramJobsPlugin: Plugin = {
    name: 'telegram-jobs-plugin',
    description: 'Читает резюме кандидатов из Telegram канала @it_vakansii_jobs',
    priority: 100,

    services: [TelegramJobsService],
    actions: [searchTelegramJobsAction],
};

export default telegramJobsPlugin;
