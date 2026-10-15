

import passport from "passport";
import { Strategy as LocalStrategy} from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";

import { hashPassword, isValidPassword } from "../utils/hash.js";
import { findUserByEmail, saveUser } from "../repositories/users.repository.js";

const MIN_PASSWORD_LENGTH = 6;

const authError = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

passport.use('register', new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
    async(req, email, password, done) => {
        try{
            const {first_name, last_name} = req.body;
    
            if(!first_name || !last_name || !email || !password){
                return done(authError('Faltan campos obligatorios', 400));
            }

            const normalizedEmail = String(email).trim().toLowerCase();

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if(!emailRegex.test(normalizedEmail)){
                return done(authError('Email inválido', 400));
            }

            if(password.length < MIN_PASSWORD_LENGTH){
                return done(authError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`, 400));
            }

            const existingUser = await findUserByEmail(normalizedEmail);

            if(existingUser){
                return done(authError('El email ya está registrado', 409));
            }

            const hashedPassword = await hashPassword(password);

            const userData = {
                first_name,
                last_name,
                email: normalizedEmail,
                password: hashedPassword,
                role: 'user'
            };

            let savedUser;

            try{
                savedUser = await saveUser(userData);
            }catch(error){

                if(error.code === 11000){
                    return done(authError('El email ya está registrado', 409));
                }

                return done(error);
            }

            const { _id, password: _pass, ...rest} = savedUser.toObject();

            const userWithoutPassword = {id: _id, ...rest};

            return done(null, userWithoutPassword);

        }catch(error){
            return done(error);
        }
    }

));

passport.use('login', new LocalStrategy(
    {usernameField: 'email'},
    async(email, password, done) => {

        try{

            const normalizedEmail = String(email).trim().toLowerCase();

            const user = await findUserByEmail(normalizedEmail);

            if(!user){
                return done(authError('Credenciales inválidas', 401));
            }

            const validPassword = await isValidPassword(password, user.password);

            if(!validPassword){
                return done(authError('Credenciales inválidas', 401));
            }

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
                return done(authError('No autenticado', 401));
            }

            const validRoles = ['user', 'organizer', 'admin'];

            if(!payload.id || !payload.email){
                return done(authError('No autenticado', 401));
            }

            if(!validRoles.includes(payload.role)){
                return done(authError('No autenticado', 401));
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