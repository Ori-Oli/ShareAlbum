import { Injectable, NotFoundException } from '@nestjs/common';
import { GroupRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createGroupDto: CreateGroupDto, ownerId: string) {
    return this.prisma.group.create({
      data: {
        ...createGroupDto,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: GroupRole.OWNER,
          },
        },
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        albums: true,
        members: true,
      },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        owner: true,
        albums: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found.');
    }

    return group;
  }

  async getInvite(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: {
        id: true,
        inviteCode: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found.');
    }

    return {
      groupId: group.id,
      inviteCode: group.inviteCode,
      invitePath: `/invite/${group.inviteCode}`,
    };
  }

  async getInviteByCode(inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
      include: {
        owner: true,
        albums: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Invite not found.');
    }

    return group;
  }

  async joinByInviteCode(inviteCode: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
      include: {
        albums: {
          select: {
            id: true,
            title: true,
          },
          take: 1,
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Invite not found.');
    }

    await this.prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId,
        },
      },
      update: {},
      create: {
        groupId: group.id,
        userId,
        role: group.ownerId === userId ? GroupRole.OWNER : GroupRole.MEMBER,
      },
    });

    return {
      groupId: group.id,
      albumId: group.albums[0]?.id ?? null,
      alreadyOwner: group.ownerId === userId,
    };
  }
}
