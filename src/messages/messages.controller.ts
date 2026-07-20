import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId')
  findForProject(@Param('projectId') projectId: string, @Req() req: any) {
    return this.messagesService.findForProject(+projectId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body('projectId') projectId: number, @Body('content') content: string, @Req() req: any) {
    return this.messagesService.create(projectId, content, req.user);
  }

  // New — send a message with a PDF/JPG attachment. Same access
  // control as create() since it goes through messagesService.create().
  @UseGuards(JwtAuthGuard)
  @Post('with-attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only PDF and JPG files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async createWithAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: number,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file was uploaded');

    return this.messagesService.create(
      +projectId,
      content || '',
      req.user,
      {
        attachmentUrl: `/uploads/${file.filename}`,
        attachmentName: file.originalname,
        attachmentType: file.mimetype,
      },
    );
  }
}
