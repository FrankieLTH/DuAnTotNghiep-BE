import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User, Role } from '../../entities/user.entity';
export declare class AuthService {
    private userRepository;
    private roleRepository;
    private jwtService;
    constructor(userRepository: Repository<User>, roleRepository: Repository<Role>, jwtService: JwtService);
    register(data: {
        full_name: string;
        email: string;
        phone?: string;
        password: string;
    }): Promise<{
        message: string;
        access_token: string;
        user: {
            id: number;
            full_name: string;
            email: string;
            phone: string;
            role_id: number;
        };
    }>;
    login(data: {
        email: string;
        password: string;
    }): Promise<{
        message: string;
        access_token: string;
        user: {
            id: number;
            full_name: string;
            email: string;
            phone: string;
            role_id: number;
            role_name: string;
        };
    }>;
    getProfile(userId: number): Promise<{
        id: number;
        full_name: string;
        email: string;
        phone: string;
        role_id: number;
        role_name: string;
        status: string;
        created_at: Date;
    }>;
}
