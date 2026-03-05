import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateWishDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
