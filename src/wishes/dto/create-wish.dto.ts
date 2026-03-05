import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateWishDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
