/**
 * messagingAdapters.ts — Outbound WhatsApp & Telegram Adapters
 * Specification: docs/PACK.md §11 (Phase L3), §9.4 Rule 12, Egypt PDPL Law 151/2020.
 *
 * Provides simulated outbound integration adapters for:
 * 1. WhatsApp Cloud API (Meta Graph API v19.0)
 * 2. Telegram Bot API (v7.0)
 *
 * Rules:
 * - Patient consent validation mandatory under Egypt PDPL Law 151/2020.
 * - Delivery receipt simulation (queued -> sent -> delivered -> read).
 * - Standardized clinical notification templates.
 */

import type { MessageChannel, MessageDeliveryStatus } from './types';

export interface MessageTemplate {
  name: string;
  category: 'appointment' | 'lab' | 'medication' | 'general';
  descriptionEn: string;
  descriptionAr: string;
  templateEn: string;
  templateAr: string;
  requiredParams: string[];
}

export const CLINICAL_MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
  appointment_reminder: {
    name: 'appointment_reminder',
    category: 'appointment',
    descriptionEn: 'Clinical Appointment Reminder',
    descriptionAr: 'تذكير بالموعد الطبي',
    templateEn: 'Hello {{patientName}}, this is a reminder for your upcoming clinical consultation at {{clinicName}} on {{appointmentDate}}. Please reply to confirm.',
    templateAr: 'مرحباً {{patientName}}، نذكركم بموعد استشارتكم الطبية القادمة في {{clinicName}} بتاريخ {{appointmentDate}}. يرجى الرد لتأكيد الحضور.',
    requiredParams: ['patientName', 'clinicName', 'appointmentDate'],
  },
  lab_ready: {
    name: 'lab_ready',
    category: 'lab',
    descriptionEn: 'Diagnostic Results Ready',
    descriptionAr: 'نتائج التحاليل جاهزة',
    templateEn: 'Hello {{patientName}}, your diagnostic results for {{testName}} are now available. Dr. Tarek has reviewed them in your Umbrella health portal.',
    templateAr: 'مرحباً {{patientName}}، نتائج تحاليل {{testName}} متوفرة الآن وتمت مراجعتها من قِبل د. طارق في ملفكم الطبي بنظام أمبريلا.',
    requiredParams: ['patientName', 'testName'],
  },
  medication_refill: {
    name: 'medication_refill',
    category: 'medication',
    descriptionEn: 'Medication Refill Notice',
    descriptionAr: 'إشعار تجديد الدواء',
    templateEn: 'Hello {{patientName}}, your prescription for {{medicationName}} is due for refill. Please schedule a brief follow-up before completing the course.',
    templateAr: 'مرحباً {{patientName}}، وصفتكم الطبية لدواء {{medicationName}} قاربت على الانتهاء. يرجى حجز استشارة متابعة لتجديد الوصفة بأمان.',
    requiredParams: ['patientName', 'medicationName'],
  },
  care_plan_checkin: {
    name: 'care_plan_checkin',
    category: 'general',
    descriptionEn: 'Care Plan & Vitals Check-in',
    descriptionAr: 'متابعة خطة الرعاية والعلامات الحيوية',
    templateEn: 'Hello {{patientName}}, please remember to log your home blood pressure reading today and check off your morning medications.',
    templateAr: 'مرحباً {{patientName}}، نرجو تذكيركم بتسجيل قراءة ضغط الدم المنزلية اليوم وتأكيد تناول أدوية الصباح في تطبيقكم.',
    requiredParams: ['patientName'],
  },
};

export function renderTemplate(
  templateName: string,
  lang: 'en' | 'ar',
  params: Record<string, string>
): string {
  const tpl = CLINICAL_MESSAGE_TEMPLATES[templateName];
  if (!tpl) {
    throw new Error(`Unknown clinical template: ${templateName}`);
  }

  let text = lang === 'ar' ? tpl.templateAr : tpl.templateEn;
  for (const [key, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return text;
}

export interface AdapterSendResult {
  success: boolean;
  messageId: string;
  channel: MessageChannel;
  deliveryStatus: MessageDeliveryStatus;
  externalPayload: Record<string, unknown>;
  sentAt: string;
  error?: string;
}

/**
 * WhatsApp Cloud API Dispatcher
 */
export async function sendWhatsAppMessage({
  recipientPhone,
  content,
  templateName,
  templateParams = {},
  lang = 'en',
  consentObtained,
}: {
  recipientPhone: string;
  content?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  lang?: 'en' | 'ar';
  consentObtained: boolean;
}): Promise<AdapterSendResult> {
  // PDPL Egypt Law 151/2020: Direct messaging via third-party OTT channels requires explicit consent
  if (!consentObtained) {
    throw new Error(
      'Patient consent for WhatsApp messaging is required under Egypt PDPL Law 151/2020 before dispatching external messages.'
    );
  }

  // Validate E.164 phone formatting
  const sanitizedPhone = recipientPhone.replace(/[\s\-()]/g, '');
  if (!/^\+?[1-9]\d{7,14}$/.test(sanitizedPhone)) {
    throw new Error(`Invalid recipient phone number format: "${recipientPhone}". Expected E.164.`);
  }

  const messageText = templateName
    ? renderTemplate(templateName, lang, templateParams)
    : content || '';

  const externalId = `wamid.HBg${Date.now()}${Math.floor(Math.random() * 10000)}==`;

  const externalPayload = templateName
    ? {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: sanitizedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: lang === 'ar' ? 'ar_EG' : 'en_US' },
          components: [
            {
              type: 'body',
              parameters: Object.entries(templateParams).map(([_, val]) => ({
                type: 'text',
                text: val,
              })),
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: sanitizedPhone,
        type: 'text',
        text: { preview_url: false, body: messageText },
      };

  return {
    success: true,
    messageId: externalId,
    channel: 'whatsapp',
    deliveryStatus: 'delivered',
    externalPayload,
    sentAt: new Date().toISOString(),
  };
}

/**
 * Telegram Bot API Dispatcher
 */
export async function sendTelegramMessage({
  chatId,
  content,
  templateName,
  templateParams = {},
  lang = 'en',
  consentObtained,
}: {
  chatId: string;
  content?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
  lang?: 'en' | 'ar';
  consentObtained: boolean;
}): Promise<AdapterSendResult> {
  if (!consentObtained) {
    throw new Error(
      'Patient consent for Telegram messaging is required under Egypt PDPL Law 151/2020 before dispatching external messages.'
    );
  }

  if (!chatId || chatId.trim().length === 0) {
    throw new Error('Telegram chatId or @handle is required.');
  }

  const messageText = templateName
    ? renderTemplate(templateName, lang, templateParams)
    : content || '';

  const externalId = `tg_msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const externalPayload = {
    chat_id: chatId.startsWith('@') || /^\d+$/.test(chatId) ? chatId : `@${chatId}`,
    text: messageText,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  return {
    success: true,
    messageId: externalId,
    channel: 'telegram',
    deliveryStatus: 'delivered',
    externalPayload,
    sentAt: new Date().toISOString(),
  };
}
