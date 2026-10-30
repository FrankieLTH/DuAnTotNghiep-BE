export declare class Role {
    id: number;
    role_name: string;
}
export declare class User {
    id: number;
    role_id: number;
    role: Role;
    full_name: string;
    email: string;
    phone: string;
    password_hash: string;
    status: string;
    created_at: Date;
    updated_at: Date;
}
