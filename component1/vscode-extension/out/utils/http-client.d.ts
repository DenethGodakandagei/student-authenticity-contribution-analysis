import { ExtConfig } from '../types';
export declare function postJson(url: string, token: string, body: object, timeoutMs?: number): Promise<{
    ok: boolean;
    data: any;
    statusCode?: number;
}>;
export declare function getJson(url: string, token?: string, timeoutMs?: number): Promise<{
    ok: boolean;
    data: any;
    statusCode?: number;
}>;
export declare function testBackendConnection(cfg: ExtConfig): Promise<{
    success: boolean;
    message: string;
}>;
