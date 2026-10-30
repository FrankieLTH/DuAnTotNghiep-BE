import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(body: {
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
    login(body: {
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
    getProfile(req: any): Promise<{
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
