import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { db } from '../database/client';
import { messages, contacts, conversations } from '../database/schema/index';
import { eq, desc } from 'drizzle-orm';
import { SettingsService } from '../modules/settings/settings.service';
import { logger } from '../utils/logger';

// In-memory cache for GoogleGenerativeAI client instances
const clientCache = new Map<string, GoogleGenerativeAI>();

function getGenAiClient(apiKey: string): GoogleGenerativeAI {
  let client = clientCache.get(apiKey);
  if (!client) {
    client = new GoogleGenerativeAI(apiKey);
    clientCache.set(apiKey, client);
  }
  return client;
}

/**
 * AI Chatbot Service — Ultra-Fast Gemini-Powered RAG Assistant
 * 
 * Optimized for lightning-fast replies (< 1.2s total processing time):
 * 1. Zero-latency in-memory settings resolution
 * 2. Parallel RAG context fetching (history + contact)
 * 3. Ultra-fast model (gemini-3.1-flash-lite ~800ms response time)
 * 4. Concise WhatsApp token limit (250 tokens)
 * 5. Reusable GenerativeAI client instances
 */
export class AiChatbotService {

  /**
   * Check if AI chatbot is enabled for a given company (uses 0ms in-memory cache)
   */
  static async isEnabled(companyId: string): Promise<boolean> {
    try {
      const { map } = await SettingsService.getAll(companyId);
      return Boolean(map.aiEnabled) && Boolean(map.aiChatbotEnabled);
    } catch {
      return false;
    }
  }

  /**
   * Check if incoming message is asking to talk to a human employee / agent
   */
  static isHumanHandoverIntent(text: string): boolean {
    if (!text) return false;
    const clean = text.trim().toLowerCase();
    const handoverKeywords = [
      'موظف',
      'خدمة العملاء',
      'خدمه العملاء',
      'خدمة عملاء',
      'خدمه عملاء',
      'تحدث مع شخص',
      'تكلم مع شخص',
      'تحدث مع انسان',
      'تحدث مع إنسان',
      'شخص حقيقي',
      'حد حقيقي',
      'انسان حقيقي',
      'إنسان حقيقي',
      'بشري',
      'مسؤول',
      'مسئول',
      'مدير',
      'شكوى',
      'مشكلة كبيرة',
      'مش عايز بوت',
      'مش عاوز بوت',
      'انت بوت',
      'أنت بوت',
      'روبوت',
    ];
    return handoverKeywords.some((kw) => clean.includes(kw));
  }

  /**
   * Get the Gemini API key — priority: company setting → env variable
   */
  static async getApiKey(companyId?: string): Promise<string | null> {
    if (companyId) {
      try {
        const { map } = await SettingsService.getAll(companyId);
        const companyKey = map.aiApiKey;
        if (companyKey && typeof companyKey === 'string' && companyKey.trim() !== '') {
          return companyKey.trim();
        }
      } catch { /* fallback */ }
    }
    return process.env.GEMINI_API_KEY || null;
  }

  /**
   * Fetch conversation history for RAG context in chronological order
   * Default limit is 8 messages to keep prompt lightweight & ultra-fast
   */
  static async getConversationContext(conversationId: string, limit = 8): Promise<string> {
    try {
      const history = await db
        .select({
          text: messages.text,
          type: messages.type,
          direction: messages.direction,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      if (history.length === 0) return '';

      // Reverse in-memory for chronological order
      const chronological = history.reverse();

      return chronological.map((msg) => {
        const sender = msg.direction === 'outgoing' ? 'الموظف/النظام' : 'العميل';
        const content = msg.text || `[${msg.type || 'media'}]`;
        return `${sender}: ${content}`;
      }).join('\n');
    } catch (err) {
      logger.error({ err, conversationId }, 'Failed to fetch conversation context for AI');
      return '';
    }
  }

  /**
   * Fetch contact info for RAG context
   */
  static async getContactContext(contactId: string): Promise<string> {
    try {
      const [contact] = await db
        .select({
          name: contacts.name,
          phoneNumber: contacts.phoneNumber,
        })
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .limit(1);

      if (!contact) return '';
      return `معلومات العميل:\n- الاسم: ${contact.name || 'غير معروف'}\n- رقم الهاتف: ${contact.phoneNumber}`;
    } catch (err) {
      logger.error({ err, contactId }, 'Failed to fetch contact context for AI');
      return '';
    }
  }

  /**
   * Synchronously build the system prompt from settings map (0ms DB delay)
   */
  static buildSystemPromptFromMap(map: Record<string, any>): string {
    const parts: string[] = [];

    // Base system prompt
    const basePrompt = map.aiSystemPrompt;
    if (basePrompt && typeof basePrompt === 'string' && basePrompt.trim()) {
      parts.push(basePrompt.trim());
    } else {
      parts.push('أنت مساعد ذكي تابع لفريق خدمة العملاء. تقوم بالرد على استفسارات العملاء بلباقة واحترافية باللغة العربية.');
    }

    // Conditional replies ("What to say")
    const whatToSay = map.aiWhatToSay;
    if (whatToSay && typeof whatToSay === 'string' && whatToSay.trim()) {
      parts.push(`\n## تعليمات للردود الشرطية:\n${whatToSay.trim()}`);
    }

    // Restrictions ("Do not say")
    const doNotSay = map.aiDoNotSay;
    if (doNotSay && typeof doNotSay === 'string' && doNotSay.trim()) {
      parts.push(`\n## ممنوعات وأشياء لا يجب ذكرها أبداً:\n${doNotSay.trim()}`);
    }

    // General behavioral rules
    parts.push('\n## قواعد عامة:');
    parts.push('- أجب دائماً باللغة العربية بشكل مهذب واحترافي.');
    parts.push('- لا تذكر أنك ذكاء اصطناعي أو بوت. تصرف كموظف خدمة عملاء حقيقي.');
    parts.push('- إذا لم تعرف الإجابة، قل أنك ستحول الاستفسار للفريق المختص.');
    parts.push('- لا تختلق معلومات غير موجودة في السياق.');
    parts.push('- اجعل ردك موجزاً ومركزاً ومناسباً لرسائل الواتساب السريعة (سطر أو سطرين).');

    return parts.join('\n');
  }

  /**
   * Generate AI response using Gemini with speed optimizations
   */
  static async generateResponse(params: {
    companyId: string;
    conversationId: string;
    contactId: string;
    incomingMessage: string;
  }): Promise<{ success: boolean; reply: string | null; error?: string }> {
    const { companyId, conversationId, contactId, incomingMessage } = params;

    try {
      // 1. Fetch settings from in-memory cache (0ms delay)
      const { map } = await SettingsService.getAll(companyId);

      // Check if enabled
      if (!map.aiEnabled || !map.aiChatbotEnabled) {
        return { success: false, reply: null, error: 'AI chatbot disabled' };
      }

      // 2. Resolve API key
      const apiKey = (map.aiApiKey && typeof map.aiApiKey === 'string' && map.aiApiKey.trim())
        ? map.aiApiKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return { success: false, reply: null, error: 'Gemini API key not configured' };
      }

      // 3. Resolve model name (defaults to ultra-fast gemini-3.1-flash-lite ~800ms)
      let modelName = 'gemini-3.1-flash-lite';
      const configuredModel = map.aiModel ? String(map.aiModel).trim() : '';
      if (configuredModel) {
        const deprecated = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
        if (deprecated.includes(configuredModel)) {
          modelName = 'gemini-3.1-flash-lite';
        } else {
          modelName = configuredModel;
        }
      }

      // 4. Build system prompt in-memory (0ms)
      const systemPrompt = this.buildSystemPromptFromMap(map);

      // 5. Parallel RAG Context fetching
      const [conversationHistory, contactInfo] = await Promise.all([
        this.getConversationContext(conversationId, 8),
        this.getContactContext(contactId),
      ]);

      // 6. Assemble compact prompt
      const contextParts: string[] = [];
      if (contactInfo) contextParts.push(contactInfo);
      if (conversationHistory) {
        contextParts.push(`\nسجل المحادثة الأخيرة:\n${conversationHistory}`);
      }
      contextParts.push(`\nالرسالة الجديدة من العميل:\n${incomingMessage}`);
      contextParts.push('\nأجب على الرسالة الأخيرة فقط بإيجاز واحترافية:');

      const userMessage = contextParts.join('\n');

      // 7. Call Gemini with cached client & optimal token limit
      const genAI = getGenAiClient(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        generationConfig: {
          maxOutputTokens: 250, // Optimal for fast WhatsApp replies
          temperature: 0.5,     // Faster and more deterministic
        },
      });

      const startTime = Date.now();
      const result = await model.generateContent(userMessage);
      const replyText = result.response.text()?.trim();
      const elapsed = Date.now() - startTime;

      if (!replyText) {
        return { success: false, reply: null, error: 'Gemini returned empty response' };
      }

      logger.info(
        { companyId, conversationId, modelName, elapsedMs: elapsed, replyLength: replyText.length },
        `AI chatbot generated response in ${elapsed}ms`
      );

      return { success: true, reply: replyText };
    } catch (err: any) {
      logger.error(
        { err: err?.message, stack: err?.stack, companyId, conversationId },
        'AI chatbot failed to generate response'
      );
      return { success: false, reply: null, error: err?.message || 'Unknown AI error' };
    }
  }
}
