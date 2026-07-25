import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // Admin-only — assign a new task to a freelancer.
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  // Freelancer's own tasks.
  @Get('mine')
  findMine(@Req() req: any) {
    return this.tasksService.findMine(req.user.userId);
  }

  // Admin-only — every task across the platform.
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  // A freelancer can update their own task (e.g. drag between Kanban
  // columns); an admin can update any task.
  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(+id, req.user.userId, req.user.role === UserRole.ADMIN, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(+id);
  }
}
