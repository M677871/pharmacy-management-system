import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TranslationResult {
  translatedText: string | null;
  provider: string;
  status: 'translated' | 'disabled' | 'failed';
}

interface GenericTranslationResponse {
  translatedText?: unknown;
}

@Injectable()
export class TranslationService {
  constructor(private readonly configService: ConfigService) {}

  async translate(params: {
    text: string;
    sourceLanguage?: string | null;
    targetLanguage?: string | null;
  }): Promise<TranslationResult> {
    const targetLanguage = params.targetLanguage?.trim();

    if (!targetLanguage) {
      return {
        translatedText: null,
        provider: 'none',
        status: 'disabled',
      };
    }

    if (
      params.sourceLanguage &&
      params.sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()
    ) {
      return {
        translatedText: params.text,
        provider: 'local',
        status: 'translated',
      };
    }

    const provider = this.configService.get<string>(
      'TRANSLATION_PROVIDER',
      'none',
    );

    if (!provider || provider === 'none') {
      return {
        translatedText: null,
        provider: 'none',
        status: 'disabled',
      };
    }

    if (provider !== 'generic-http') {
      return {
        translatedText: null,
        provider,
        status: 'disabled',
      };
    }

    return this.translateWithGenericHttp(params);
  }

  private async translateWithGenericHttp(params: {
    text: string;
    sourceLanguage?: string | null;
    targetLanguage?: string | null;
  }): Promise<TranslationResult> {
    const endpoint = this.configService.get<string>('TRANSLATION_API_URL');
    const apiKey = this.configService.get<string>('TRANSLATION_API_KEY');

    if (!endpoint || !apiKey) {
      return {
        translatedText: null,
        provider: 'generic-http',
        status: 'disabled',
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text: params.text,
          sourceLanguage: params.sourceLanguage ?? null,
          targetLanguage: params.targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Translation provider request failed.',
        );
      }

      const body = (await response.json()) as GenericTranslationResponse;

      if (typeof body.translatedText !== 'string') {
        throw new ServiceUnavailableException(
          'Translation provider returned an invalid response.',
        );
      }

      return {
        translatedText: body.translatedText,
        provider: 'generic-http',
        status: 'translated',
      };
    } catch {
      return {
        translatedText: null,
        provider: 'generic-http',
        status: 'failed',
      };
    }
  }
}
