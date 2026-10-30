"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("../../entities/user.entity");
let AuthService = class AuthService {
    constructor(userRepository, roleRepository, jwtService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.jwtService = jwtService;
    }
    async register(data) {
        const existing = await this.userRepository.findOne({ where: { email: data.email } });
        if (existing) {
            throw new common_1.BadRequestException('Email đã được sử dụng');
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(data.password, salt);
        const user = this.userRepository.create({
            full_name: data.full_name,
            email: data.email,
            phone: data.phone,
            password_hash,
            role_id: 3,
            status: 'active',
        });
        await this.userRepository.save(user);
        const payload = { sub: user.id, email: user.email, role_id: user.role_id };
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
    async login(data) {
        const user = await this.userRepository.findOne({
            where: { email: data.email },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không chính xác');
        }
        const isMatch = await bcrypt.compare(data.password, user.password_hash);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không chính xác');
        }
        if (user.status === 'blocked') {
            throw new common_1.UnauthorizedException('Tài khoản của bạn đã bị khóa');
        }
        const payload = { sub: user.id, email: user.email, role_id: user.role_id };
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
    async getProfile(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role'],
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Không tìm thấy thông tin người dùng');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.Role)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map