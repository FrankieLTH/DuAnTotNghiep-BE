import { AIService } from './ai.service';
export declare class AIController {
    private readonly aiService;
    constructor(aiService: AIService);
    chat(body: {
        user_id?: number;
        session_id?: string;
        message: string;
    }): Promise<{
        session_id: string;
        response: string;
        timestamp: Date;
    }>;
}
