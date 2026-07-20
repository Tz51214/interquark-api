import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateDeveloperProfileDto } from './create-developer-profile.dto';

export class UpdateDeveloperProfileDto extends PartialType(
  OmitType(CreateDeveloperProfileDto, ['userId'] as const),
) {}
