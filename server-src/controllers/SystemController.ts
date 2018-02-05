import {Body, Controller, Get, Path, Post, Request, Route, Security, Tags} from 'tsoa';
import {MongoError} from 'mongodb';
import {IErrorResponse, IMongoError} from '../models/responses/response.index';
import {Connection} from 'mongoose';
import {get} from 'config';
import {Request as ExpressRequest} from 'express';

import App from '../app';
import {ISystemAuthResponse} from '../models/responses/response.index';
import {sign} from 'jsonwebtoken';
import {IAuthLoginParams} from '../models/requests/request.index';

@Route('auth')
@Tags('System')
export class SystemController extends Controller {
    private static resolveErrorResponse(error: MongoError | null, message: string): IErrorResponse {
        return {
            thrown: true,
            error: error as IMongoError,
            message
        };
    }

    private _mongooseConnection: Connection = App.mongooseConnection;

    @Post()
    public async adminAuth(@Body() loginParams: IAuthLoginParams): Promise<ISystemAuthResponse> {
        const nick: string = loginParams.nick;
        const pass: string = loginParams.pass;

        if (nick === (process.env.ADMIN_AUTH || get('system.adminAuth')) && pass === (process.env.ADMIN_AUTH_PASS || get('system.adminAuthPassword'))) {
            const payload = {user: 'NartcBotAdmin'};
            const token: string = sign(payload, process.env.JWT_SECRET || get('system.jwt_secret'), {expiresIn: 1800});
            return {
                authToken: `JWT ${token}`
            }
        } else {
            throw SystemController.resolveErrorResponse(null, 'Unauthorized');
        }
    }

    @Security('JWT')
    @Get('clear/{collection}')
    public async clearDatabase(@Request() expressRequest: ExpressRequest, @Path() collection: string): Promise<boolean> {
        console.log(this._mongooseConnection);
        if (expressRequest.user === 'NartcBotAdmin') {
            await this._mongooseConnection.db.dropCollection(collection);
            return true;
        } else {
            return false;
        }
    }
}