export interface IErrorResponse {
    thrown?: boolean,
    error?: IMongoError;
    message?: string;
}

export interface IMongoError {
    code?: number;
    message?: string;
    name?: string;
    stack?: string;
}
