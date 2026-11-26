import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, Staff } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    private jwtService: JwtService,
  ) {}

  async register(data: { full_name: string; email: string; phone?: string; password: string }) {
    const existing = await this.userRepository.findOne({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password, salt);

    const user = this.userRepository.create({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      password_hash,
      role_id: 3, // Customer role
      status: 'active',
    });

    await this.userRepository.save(user);

    const isStaff = [1, 2].includes(Number(user.role_id));
    const payload: any = {
      sub: user.id,
      email: user.email,
      role_id: user.role_id,
      ...(isStaff ? { type: 'staff', staff_id: user.id } : {}),
    };
    return {
      message: 'Đăng ký tài khoản thành công',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
      },
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.userRepository.findOne({
      where: { email: data.email },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.status === 'blocked') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const isStaff = [1, 2].includes(Number(user.role_id));
    const payload: any = {
      sub: user.id,
      email: user.email,
      role_id: user.role_id,
      ...(isStaff ? { type: 'staff', staff_id: user.id } : {}),
    };
    return {
      message: 'Đăng nhập thành công',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role_id: user.role_id,
        role_name: user.role?.role_name,
      },
    };
  }

  async loginStaff(data: { email: string; password: string }) {
    const email = data.email?.trim().toLowerCase();
    if (!email || !data.password) {
      throw new BadRequestException('Vui lòng nhập email và mật khẩu.');
    }

    const staff = await this.staffRepository.findOne({
      where: { email },
      relations: ['role', 'apartment'],
    });
    if (!staff || staff.is_blocked || ![1, 2].includes(Number(staff.role_id))) {
      throw new UnauthorizedException('Email hoặc mật khẩu quản trị không chính xác.');
    }
    if (!(await bcrypt.compare(data.password, staff.password_hash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu quản trị không chính xác.');
    }

    const role = Number(staff.role_id) === 1 ? 'admin' : 'manager';
    const payload = {
      sub: staff.id,
      staff_id: staff.id,
      email: staff.email,
      role_id: staff.role_id,
      apartment_id: staff.apartment_id ?? null,
      type: 'staff',
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: staff.id,
        name: staff.full_name,
        email: staff.email,
        role,
        branchId: staff.apartment_id ?? undefined,
        branchName: staff.apartment?.name,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng');
    }
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role_id: user.role_id,
      role_name: user.role?.role_name,
      status: user.status,
      created_at: user.created_at,
    };
  }
}
