import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Staff) private readonly staffRepository: Repository<Staff>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub || payload.type === 'customer') {
      throw new UnauthorizedException();
    }

    if (payload.type === 'staff') {
      const staff = await this.staffRepository.findOne({ where: { id: Number(payload.staff_id) } });
      if (!staff || staff.is_blocked || ![1, 2].includes(Number(staff.role_id))) {
        throw new UnauthorizedException('Tài khoản nhân viên không còn quyền truy cập.');
      }
      return {
        userId: staff.id,
        staffId: staff.id,
        email: staff.email,
        roleId: Number(staff.role_id),
        apartmentId: staff.apartment_id ?? null,
        isStaff: true,
      };
    }

    return { userId: payload.sub, email: payload.email, roleId: payload.role_id, isStaff: false };
  }
}
