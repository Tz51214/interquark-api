import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.projectsService.findMine(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/assign')
  assignFreelancer(@Param('id') id: string, @Body('freelancerId') freelancerId: number) {
    return this.projectsService.assignFreelancer(+id, freelancerId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Req() req: any) {
    return this.projectsService.updateStatus(+id, status, req.user);
  }
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Delete(':id')
remove(@Param('id') id: string) {
  return this.projectsService.remove(+id);
}

  @UseGuards(JwtAuthGuard)
  @Patch(':id/progress')
  updateProgress(@Param('id') id: string, @Body('progress') progress: number, @Req() req: any) {
    return this.projectsService.updateProgress(+id, progress, req.user);
  }
}
