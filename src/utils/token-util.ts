import { sign, verify } from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { Request } from 'express';

import { TokenPayload } from '@/interfaces/auth.interface';
import { envConfig } from '@/config/env.config';

export const generateAccessToken = (payload: TokenPayload): string => {
  return sign(payload, envConfig.JWT_TOKEN_SECRET);
};

export const verifyToken = (token: string, secret: string): TokenPayload => {
  return verify(token, secret) as TokenPayload;
};

export const authenticateGraphQLRoute = (req: Request): void => {
  if (!req.session?.accessToken) {
    throw new GraphQLError('Please login again.');
  }

  try {
    const payload: TokenPayload = verifyToken(req.session?.accessToken, envConfig.JWT_TOKEN_SECRET);
    req.currentUser = payload;
  } catch (error: any) {
    throw new GraphQLError(error?.message);
  }
};
