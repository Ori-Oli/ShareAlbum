import { Injectable } from '@nestjs/common';
import { PhotoAiStatus, TagSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const GEMINI_INTERACTIONS_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_VISION_MODEL = 'gemini-3.5-flash';
const TAG_COUNT = 3;

type GeminiInteractionResponse = {
  output_text?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class PhotoTaggingService {
  private readonly apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  private readonly model =
    process.env.GEMINI_VISION_MODEL ?? DEFAULT_VISION_MODEL;

  constructor(private readonly prisma: PrismaService) {}

  async generateForPhoto(photoId: string) {
    try {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY is required to generate photo tags.');
      }

      const photo = await this.prisma.photo.findUnique({
        where: {
          id: photoId,
        },
        select: {
          id: true,
          url: true,
          mimeType: true,
        },
      });

      if (!photo) {
        return;
      }

      await this.prisma.photo.update({
        where: {
          id: photo.id,
        },
        data: {
          aiStatus: PhotoAiStatus.PENDING,
          aiError: null,
        },
      });

      const tags = await generateTagsWithGemini({
        apiKey: this.apiKey,
        model: this.model,
        imageUrl: photo.url,
        mimeType: photo.mimeType,
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.photoTag.deleteMany({
          where: {
            photoId: photo.id,
          },
        });

        if (tags.length > 0) {
          for (const tagName of tags) {
            const tag = await tx.tag.upsert({
              where: {
                name: tagName,
              },
              create: {
                name: tagName,
              },
              update: {},
            });

            await tx.photoTag.create({
              data: {
                photoId: photo.id,
                tagId: tag.id,
                source: TagSource.AI,
              },
            });
          }
        }

        await tx.photo.update({
          where: {
            id: photo.id,
          },
          data: {
            aiStatus: PhotoAiStatus.READY,
            aiError: null,
          },
        });
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate photo tags.';

      await markPhotoTaggingFailed(this.prisma, photoId, message);
    }
  }
}

async function generateTagsWithGemini({
  apiKey,
  model,
  imageUrl,
  mimeType,
}: {
  apiKey: string;
  model: string;
  imageUrl: string;
  mimeType: string;
}) {
  const response = await fetch(GEMINI_INTERACTIONS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          type: 'text',
          text:
            '사진을 보고 한국어 태그를 정확히 3개 생성하세요. ' +
            '규칙: 짧은 명사형, 보이는 내용만, 사람 이름 추측 금지, ' +
            '중복 금지. JSON 문자열 배열만 반환하세요. 예: ["바다","여행","노을"]',
        },
        {
          type: 'image',
          uri: imageUrl,
          mime_type: mimeType,
        },
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: {
          type: 'array',
          items: {
            type: 'string',
          },
          minItems: TAG_COUNT,
          maxItems: TAG_COUNT,
        },
      },
    }),
  });

  const body = (await response.json()) as GeminiInteractionResponse;

  if (!response.ok) {
    throw new Error(
      body.error?.message ?? `Gemini tag generation failed: ${response.status}`,
    );
  }

  const outputText = getGeminiOutputText(body);

  if (!outputText) {
    throw new Error('Gemini response did not include text output.');
  }

  return parseTags(outputText);
}

function getGeminiOutputText(response: GeminiInteractionResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  return response.steps
    ?.find((step) => step.type === 'model_output')
    ?.content?.find((content) => content.type === 'text' && content.text)?.text;
}

function parseTags(value: string) {
  const parsed = parseJsonResponse(value);
  const tags = Array.isArray(parsed)
    ? parsed
    : isTagObject(parsed)
      ? parsed.tags
      : null;

  if (!tags) {
    throw new Error('Gemini response was not a JSON array.');
  }

  const normalizedTags = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);

  return Array.from(new Set(normalizedTags)).slice(0, TAG_COUNT);
}

function parseJsonResponse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    const jsonArrayMatch = value.match(/\[[\s\S]*\]/);

    if (jsonArrayMatch) {
      return JSON.parse(jsonArrayMatch[0]) as unknown;
    }

    throw new Error('Gemini response was not valid JSON.');
  }
}

function isTagObject(value: unknown): value is { tags: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'tags' in value &&
    Array.isArray(value.tags)
  );
}

async function markPhotoTaggingFailed(
  prisma: PrismaService,
  photoId: string,
  message: string,
) {
  try {
    await prisma.photo.update({
      where: {
        id: photoId,
      },
      data: {
        aiStatus: PhotoAiStatus.FAILED,
        aiError: message,
      },
    });
  } catch {
    // The photo may have been deleted while the async tagging job was running.
  }
}
