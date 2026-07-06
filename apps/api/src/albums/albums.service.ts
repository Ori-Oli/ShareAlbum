import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { GroupRole, TagSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { PhotoTaggingService } from './photo-tagging.service';

type UploadedPhotoFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

type UpdatePhotoDto = {
  title?: string | null;
  description?: string | null;
};

type AddPhotoTagDto = {
  name?: string;
};

const photoInclude = {
  uploader: true,
  tags: {
    include: {
      tag: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
  likes: {
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} as const;

const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

@Injectable()
export class AlbumsService {
  private readonly storageBucket =
    process.env.SUPABASE_STORAGE_BUCKET ?? 'album-photos';
  private readonly supabase = createSupabaseAdminClient();
  private bucketReady?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly photoTaggingService: PhotoTaggingService,
  ) {}

  create(createAlbumDto: CreateAlbumDto, ownerId: string) {
    const title = createAlbumDto.title.trim();

    if (!title) {
      throw new BadRequestException('Album title is required.');
    }

    const description = createAlbumDto.description?.trim();

    return this.prisma.album.create({
      data: {
        title,
        description: description || undefined,
        coverUrl: createAlbumDto.coverUrl,
        groupId: createAlbumDto.groupId,
        ownerId,
      },
      include: {
        owner: true,
        group: true,
        photos: {
          orderBy: {
            createdAt: 'desc',
          },
          include: photoInclude,
        },
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.album.findMany({
      where: {
        OR: [
          {
            ownerId: userId,
          },
          {
            group: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        group: true,
        photos: {
          orderBy: {
            createdAt: 'desc',
          },
          include: photoInclude,
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const album = await this.prisma.album.findFirst({
      where: {
        id,
        OR: [
          {
            ownerId: userId,
          },
          {
            group: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
      include: {
        owner: true,
        photos: {
          orderBy: {
            createdAt: 'desc',
          },
          include: photoInclude,
        },
        group: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!album) {
      throw new NotFoundException('Album not found.');
    }

    return album;
  }

  async createInvite(id: string, ownerId: string) {
    const album = await this.prisma.album.findFirst({
      where: {
        id,
        ownerId,
      },
      include: {
        group: true,
      },
    });

    if (!album) {
      throw new NotFoundException('Album not found.');
    }

    if (album.group) {
      return {
        albumId: album.id,
        groupId: album.group.id,
        inviteCode: album.group.inviteCode,
        invitePath: `/invite/${album.group.inviteCode}`,
      };
    }

    const group = await this.prisma.group.create({
      data: {
        name: `${album.title} 공유 그룹`,
        description: album.description,
        ownerId,
        albums: {
          connect: {
            id: album.id,
          },
        },
        members: {
          create: {
            userId: ownerId,
            role: GroupRole.OWNER,
          },
        },
      },
    });

    return {
      albumId: album.id,
      groupId: group.id,
      inviteCode: group.inviteCode,
      invitePath: `/invite/${group.inviteCode}`,
    };
  }

  async delete(id: string, ownerId: string) {
    const album = await this.prisma.album.findFirst({
      where: {
        id,
        ownerId,
      },
      include: {
        photos: true,
        group: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!album) {
      throw new NotFoundException('Album not found.');
    }

    const storagePaths = album.photos
      .map((photo) =>
        getStoragePathFromPublicUrl(photo.url, this.storageBucket),
      )
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: removeError } = await this.supabase.storage
        .from(this.storageBucket)
        .remove(storagePaths);

      if (removeError) {
        throw new BadRequestException(
          `Failed to delete album photos from Supabase Storage: ${removeError.message}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.album.delete({
        where: {
          id: album.id,
        },
      });

      if (album.group) {
        await tx.group.delete({
          where: {
            id: album.group.id,
          },
        });
      }
    });

    return {
      deleted: true,
    };
  }

  async addPhoto(id: string, userId: string, file: UploadedPhotoFile) {
    if (!file) {
      throw new BadRequestException('Photo file is required.');
    }

    if (!SUPPORTED_PHOTO_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported photo file type.');
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      throw new BadRequestException('Photo file is too large.');
    }

    const album = await this.prisma.album.findFirst({
      where: {
        id,
        OR: [
          {
            ownerId: userId,
          },
          {
            group: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },
    });

    if (!album) {
      throw new NotFoundException('Album not found.');
    }

    const extension = getPhotoExtension(file);
    const storagePath = `${userId}/${album.id}/${randomUUID()}${extension}`;

    await this.ensureStorageBucket();

    const { error: uploadError } = await this.supabase.storage
      .from(this.storageBucket)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(
        `Failed to upload photo to Supabase Storage: ${uploadError.message}`,
      );
    }

    const { data } = this.supabase.storage
      .from(this.storageBucket)
      .getPublicUrl(storagePath);

    const photo = await this.prisma.photo.create({
      data: {
        albumId: album.id,
        uploaderId: userId,
        url: data.publicUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      include: photoInclude,
    });

    void this.photoTaggingService.generateForPhoto(photo.id);

    return photo;
  }

  async updatePhoto(
    id: string,
    photoId: string,
    userId: string,
    updatePhotoDto: UpdatePhotoDto,
  ) {
    await this.ensurePhotoAccess(id, photoId, userId);

    const title = updatePhotoDto.title?.trim();
    const description = updatePhotoDto.description?.trim();

    return this.prisma.photo.update({
      where: {
        id: photoId,
      },
      data: {
        title: title || null,
        description: description || null,
      },
      include: photoInclude,
    });
  }

  async addPhotoTag(
    id: string,
    photoId: string,
    userId: string,
    addPhotoTagDto: AddPhotoTagDto,
  ) {
    await this.ensurePhotoAccess(id, photoId, userId);

    const name = normalizeTagName(addPhotoTagDto.name);

    if (!name) {
      throw new BadRequestException('Tag name is required.');
    }

    await this.prisma.$transaction(async (tx) => {
      const tag = await tx.tag.upsert({
        where: {
          name,
        },
        create: {
          name,
        },
        update: {},
      });

      await tx.photoTag.upsert({
        where: {
          photoId_tagId: {
            photoId,
            tagId: tag.id,
          },
        },
        create: {
          photoId,
          tagId: tag.id,
          source: TagSource.USER,
          createdBy: userId,
        },
        update: {},
      });
    });

    return this.findPhotoById(photoId);
  }

  async deletePhotoTag(
    id: string,
    photoId: string,
    photoTagId: string,
    userId: string,
  ) {
    await this.ensurePhotoAccess(id, photoId, userId);

    const photoTag = await this.prisma.photoTag.findFirst({
      where: {
        id: photoTagId,
        photoId,
      },
    });

    if (!photoTag) {
      throw new NotFoundException('Photo tag not found.');
    }

    await this.prisma.photoTag.delete({
      where: {
        id: photoTag.id,
      },
    });

    return this.findPhotoById(photoId);
  }

  async likePhoto(id: string, photoId: string, userId: string) {
    await this.ensurePhotoAccess(id, photoId, userId);

    await this.prisma.photoLike.upsert({
      where: {
        photoId_userId: {
          photoId,
          userId,
        },
      },
      create: {
        photoId,
        userId,
      },
      update: {},
    });

    return this.findPhotoById(photoId);
  }

  async unlikePhoto(id: string, photoId: string, userId: string) {
    await this.ensurePhotoAccess(id, photoId, userId);

    const photoLike = await this.prisma.photoLike.findFirst({
      where: {
        photoId,
        userId,
      },
    });

    if (photoLike) {
      await this.prisma.photoLike.delete({
        where: {
          id: photoLike.id,
        },
      });
    }

    return this.findPhotoById(photoId);
  }

  async deletePhoto(id: string, photoId: string, ownerId: string) {
    const photo = await this.prisma.photo.findFirst({
      where: {
        id: photoId,
        albumId: id,
        album: {
          ownerId,
        },
      },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }

    const storagePath = getStoragePathFromPublicUrl(
      photo.url,
      this.storageBucket,
    );

    if (storagePath) {
      const { error: removeError } = await this.supabase.storage
        .from(this.storageBucket)
        .remove([storagePath]);

      if (removeError) {
        throw new BadRequestException(
          `Failed to delete photo from Supabase Storage: ${removeError.message}`,
        );
      }
    }

    await this.prisma.photo.delete({
      where: {
        id: photo.id,
      },
    });

    return {
      deleted: true,
    };
  }

  private ensureStorageBucket() {
    this.bucketReady ??= ensurePublicBucket(this.supabase, this.storageBucket);

    return this.bucketReady;
  }

  private async ensurePhotoAccess(
    albumId: string,
    photoId: string,
    userId: string,
  ) {
    const photo = await this.prisma.photo.findFirst({
      where: {
        id: photoId,
        albumId,
        album: {
          OR: [
            {
              ownerId: userId,
            },
            {
              group: {
                members: {
                  some: {
                    userId,
                  },
                },
              },
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found.');
    }
  }

  private async findPhotoById(photoId: string) {
    return this.prisma.photo.findUniqueOrThrow({
      where: {
        id: photoId,
      },
      include: photoInclude,
    });
  }
}

function createSupabaseAdminClient() {
  const supabaseUrl = getSupabaseProjectUrl(requiredEnv('SUPABASE_URL'));
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSupabaseProjectUrl(value: string) {
  return new URL(value).origin;
}

function getStoragePathFromPublicUrl(value: string, storageBucket: string) {
  const publicPathPrefix = `/storage/v1/object/public/${storageBucket}/`;
  const url = new URL(value);
  const prefixIndex = url.pathname.indexOf(publicPathPrefix);

  if (prefixIndex === -1) {
    return null;
  }

  return decodeURIComponent(
    url.pathname.slice(prefixIndex + publicPathPrefix.length),
  );
}

async function ensurePublicBucket(
  supabase: SupabaseClient,
  storageBucket: string,
) {
  const { error: getBucketError } =
    await supabase.storage.getBucket(storageBucket);

  if (!getBucketError) {
    return;
  }

  const { error: createBucketError } = await supabase.storage.createBucket(
    storageBucket,
    {
      public: true,
    },
  );

  if (createBucketError) {
    throw new BadRequestException(
      `Failed to prepare Supabase Storage bucket: ${createBucketError.message}`,
    );
  }
}

function getPhotoExtension(file: UploadedPhotoFile) {
  const extension = extname(file.originalname).toLowerCase();

  if (extension) {
    return extension;
  }

  switch (file.mimetype) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/heic':
      return '.heic';
    case 'image/heif':
      return '.heif';
    default:
      return '';
  }
}

function normalizeTagName(value: string | undefined) {
  return value?.trim().replace(/^#/, '').replace(/\s+/g, ' ');
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
