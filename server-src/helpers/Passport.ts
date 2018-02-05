import * as _passport from 'passport';
import {PassportStatic} from 'passport';
import {ExtractJwt, Strategy, StrategyOptions, VerifiedCallback} from 'passport-jwt';
import {get} from 'config';

export const authenticateUser = (passport: PassportStatic) => {

    const options: StrategyOptions = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
        secretOrKey: process.env.JWT_SECRET || get('system.jwt_secret')
    };

    passport.use(new Strategy(options, async (jwtPayload: IJwtPayload, done: VerifiedCallback) => {
        const result = jwtPayload.user;

        if (!result) {
            return done(null, false);
        } else {
            return done(null, result, {issuedAt: jwtPayload.iat});
        }
    }));
};

export const expressAuthentication = _passport.authenticate('jwt', {session: false});

interface IJwtPayload {
    user?: string;
    iat?: Date;
}