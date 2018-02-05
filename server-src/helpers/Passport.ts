import * as config from 'config';
import * as _passport from 'passport';
import {PassportStatic} from 'passport';
import {ExtractJwt, Strategy, StrategyOptions, VerifiedCallback} from 'passport-jwt';

export const authenticateUser = (passport: PassportStatic) => {

    const options: StrategyOptions = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
        secretOrKey: process.env.JWT_SECRET || config.get('system.jwt_secret')
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