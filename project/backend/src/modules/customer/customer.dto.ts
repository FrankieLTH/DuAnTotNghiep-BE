import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateIf, IsByteLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestOtpDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email: string;
  @IsIn(['lookup', 'booking']) purpose: 'lookup' | 'booking';
}

export class CustomerEmailDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email: string;
}
export class CustomerLoginDto extends CustomerEmailDto {
  @IsString() @Length(1, 72) @IsByteLength(1, 72) password: string;
}
export class RegisterCustomerDto extends CustomerEmailDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 150) full_name: string;
  @IsOptional() @IsString() @Matches(/^(?:|(?:0|\+84)\d{9})$/) phone?: string;
  @IsString() @Length(8, 72) @IsByteLength(8, 72) password: string;
}
export class CustomerEmailTokenDto extends CustomerEmailDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token: string;
}
export class CustomerRegistrationCodeDto extends CustomerEmailDto {
  @IsString() @Matches(/^\d{6}$/) code: string;
}
export class ResetCustomerPasswordCodeDto extends CustomerRegistrationCodeDto {
  @IsString() @Length(8, 72) @IsByteLength(8, 72) password: string;
}
export class ResetCustomerPasswordDto extends CustomerEmailTokenDto {
  @IsString() @Length(8, 72) @IsByteLength(8, 72) password: string;
}
export class ChangeCustomerPasswordDto {
  @IsString() @Length(1, 72) @IsByteLength(1, 72) current_password: string;
  @IsString() @Length(8, 72) @IsByteLength(8, 72) password: string;
}

export class UpdateCustomerProfileDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 150) full_name: string;
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/[\s.-]/g, '') : value)
  @IsString() @Matches(/^(?:|(?:0|\+84)\d{9})$/) phone: string;
}

export class CustomerBookingRequestDto {
  @IsIn(['cancel', 'refund', 'extend', 'change_room']) type: 'cancel' | 'refund' | 'extend' | 'change_room';
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(5, 1000) reason: string;
  @ValidateIf(o => o.type === 'extend' || o.requested_end_date !== undefined)
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) requested_end_date?: string;
  @ValidateIf(o => o.type === 'change_room' || o.requested_room_type_id !== undefined)
  @IsInt() @Min(1) requested_room_type_id?: number;
}

export class ReviewCustomerRequestDto {
  @IsIn(['reviewing', 'resolved', 'rejected']) status: 'reviewing' | 'resolved' | 'rejected';
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(5, 1000) staff_reply: string;
}
export class VerifyOtpDto extends RequestOtpDto {
  @IsString() @Matches(/^\d{6}$/) code: string;
}
export class CustomerBookingQuery {
  @IsOptional() @IsIn(['draft', 'pending_payment', 'confirmed', 'checked_in', 'checked_out', 'expired', 'cancelled']) status?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100000) page: number = 1;
}
export class GuestBookingDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 150) full_name: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsInt() @Min(1) room_type_id: number;
  @IsInt() @Min(1) @Max(10) num_rooms: number;
  @IsInt() @Min(1) @Max(30) adults: number;
  @IsInt() @Min(0) @Max(30) children: number;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) check_in_date: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) check_out_date: string;
}
