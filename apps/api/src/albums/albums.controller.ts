import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { getCurrentUserIdFromRequest } from '../auth/request-session';
import { SessionService } from '../auth/session.service';
import { AlbumsService } from './albums.service';
import { CreateAlbumDto } from './dto/create-album.dto';

type UploadedPhotoFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Controller('albums')
export class AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
    private readonly sessionService: SessionService,
  ) {}

  @Post()
  async create(
    @Body() createAlbumDto: CreateAlbumDto,
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.create(createAlbumDto, userId);
  }

  @Get()
  async findAll(@Req() request: Request) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() request: Request) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.findOne(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() request: Request) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.delete(id, userId);
  }

  @Post(':id/invite')
  async createInvite(@Param('id') id: string, @Req() request: Request) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.createInvite(id, userId);
  }

  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('photo'))
  async addPhoto(
    @Param('id') id: string,
    @UploadedFile() file: UploadedPhotoFile,
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.addPhoto(id, userId, file);
  }

  @Delete(':id/photos/:photoId')
  async deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.deletePhoto(id, photoId, userId);
  }

  @Patch(':id/photos/:photoId')
  async updatePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Body() body: { title?: string | null; description?: string | null },
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.updatePhoto(id, photoId, userId, body);
  }

  @Post(':id/photos/:photoId/tags')
  async addPhotoTag(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Body() body: { name?: string },
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.addPhotoTag(id, photoId, userId, body);
  }

  @Delete(':id/photos/:photoId/tags/:photoTagId')
  async deletePhotoTag(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Param('photoTagId') photoTagId: string,
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.deletePhotoTag(id, photoId, photoTagId, userId);
  }

  @Post(':id/photos/:photoId/likes')
  async likePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.likePhoto(id, photoId, userId);
  }

  @Delete(':id/photos/:photoId/likes')
  async unlikePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() request: Request,
  ) {
    const userId = await getCurrentUserIdFromRequest(
      request,
      this.sessionService,
    );

    return this.albumsService.unlikePhoto(id, photoId, userId);
  }
}
