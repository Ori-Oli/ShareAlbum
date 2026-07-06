import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getCurrentUserIdFromRequest } from '../auth/request-session';
import { SessionService } from '../auth/session.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly sessionService: SessionService,
  ) {}

  @Post()
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.groupsService.create(createGroupDto, userId);
  }

  @Get()
  async findAll(@Req() request: Request) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.groupsService.findAll(userId);
  }

  @Get('invite/:inviteCode')
  getInviteByCode(@Param('inviteCode') inviteCode: string) {
    return this.groupsService.getInviteByCode(inviteCode);
  }

  @Post('invite/:inviteCode/join')
  async joinByInviteCode(
    @Param('inviteCode') inviteCode: string,
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.groupsService.joinByInviteCode(inviteCode, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Get(':id/invite')
  getInvite(@Param('id') id: string) {
    return this.groupsService.getInvite(id);
  }
}
