

import passport from "passport";
import { Strategy as LocalStrategy} from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";

import { registerUser, loginUser } from "../services/users.service.js";
import { createError } from "../utils/errors.js";


passport.use('register', new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    async(req, email, password, done) => {
        try{

            const {first_name, last_name} = req.body;

            const user = await registerUser({ first_name, last_name, email, password });

            return done(null, user);

        }catch(error){
            return done(error);
        }
    }

));

passport.use('login', new LocalStrategy(
    {usernameField: 'email'},
    async(email, password, done) => {

        try{

            const user = await loginUser({ email, password });

            return done(null, user)

        }catch(error){
            return done(error);
        }
    }
));

const cookieExtractor = req => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies.currentUser;
  }
  return token;
}

passport.use('current', new JwtStrategy(
    { 
        jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
        secretOrKey: process.env.JWT_SECRET
    },
    async(payload, done) => {
        try{

            if(!payload || typeof payload !== 'object'){
                return done(createError('No autenticado', 401));
            }

            const validRoles = ['user', 'organizer', 'admin'];

            if(!payload.id || !payload.email){
                return done(createError('No autenticado', 401));
            }

            if(!validRoles.includes(payload.role)){
                return done(createError('No autenticado', 401));
            }

            return done(null, {
                id: payload.id,
                email: payload.email,
                role: payload.role
            });

        }catch(error){
            return done(error);
        }   
    }

));



const PASSPORT_MESSAGES = {
    '/api/sessions/register': {
        400: 'Faltan campos obligatorios',
    },
    '/api/sessions/login': {
        400: 'Credenciales inválidas',
        401: 'Credenciales inválidas',
    },
    '/api/sessions/current': {
        401: 'No autenticado',
    },
};

/**
 * posibles errores:
 * @param {Error} error  error recibido por el error handler global
 * @param {string} path  req.path
 * @returns {string|null} mensaje a responder, o null si no corresponde traducir
 */
export const translatePassportError = (error, path) => {
    if(error?.name !== 'AuthenticationError'){
        return null;
    }

    return PASSPORT_MESSAGES[path]?.[error.status] ?? null;
};
