import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TTLockCallbackDto {
  @IsNotEmpty()
  @IsString()
  notifyType: string;

  @IsNotEmpty()
  @IsString()
  lockId: string;

  @IsOptional()
  @IsString()
  lockMac?: string;

  @IsOptional()
  @IsString()
  records?: string;
}
