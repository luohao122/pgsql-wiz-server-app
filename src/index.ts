import 'reflect-metadata';

import http from 'http';

import express, { Application, json, urlencoded, Request, Response } from 'express';
import cookieSession from 'cookie-session';
import cors from 'cors';

import { GraphQLFormattedError, GraphQLSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServer, BaseContext } from '@apollo/server';

import { ExpressContextFunctionArgument, expressMiddleware } from '@apollo/server/express4';

import { envConfig } from '@/config/env.config';
import { AppDataSource } from '@/database/config';
import { mergedGQLSchema } from '@/graphql/schemas';

import { mergedGQLResolvers } from '@/graphql/resolvers';

async function bootstrap() {
  const app = express();
  const httpServer: http.Server = new http.Server(app);

  const graphQLServer = startGraphQLServer(httpServer);
  await graphQLServer.start();

  securityMiddleware(app);
  graphQLMiddleware(app, graphQLServer);

  healthRoute(app);
  startApp(httpServer);
}

function healthRoute(app: Application) {
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).send('DataWiz service is healthy and OK.');
  });
}

function graphQLMiddleware(app: Application, server: ApolloServer<BaseContext>) {
  const corsOptions = {
    origin: [envConfig.REACT_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  };

  app.use(
    '/graphql',
    cors(corsOptions),
    json({ limit: '50mb' }),
    urlencoded({ extended: true, limit: '50mb' }),
    expressMiddleware(server, {
      context: async ({ req, res }: ExpressContextFunctionArgument) => {
        return { req, res };
      }
    })
  );
}

function startGraphQLServer(httpServer: http.Server) {
  const schema: GraphQLSchema = makeExecutableSchema({
    typeDefs: mergedGQLSchema,
    resolvers: mergedGQLResolvers
  });

  const server = new ApolloServer({
    schema,
    formatError(error: GraphQLFormattedError) {
      return {
        message: error.message,
        code: error.extensions?.code || 'INTERNAL_SERVER_ERROR'
      };
    },
    introspection: envConfig.NODE_ENV === 'development',
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      envConfig.NODE_ENV === 'development'
        ? ApolloServerPluginLandingPageLocalDefault({
            embed: true,
            includeCookies: true
          })
        : ApolloServerPluginLandingPageDisabled()
    ]
  });

  return server;
}

function securityMiddleware(app: Application) {
  app.set('trust proxy', 1);
  app.use(
    cookieSession({
      name: 'session',
      keys: [envConfig.SECRET_KEY_ONE, envConfig.SECRET_KEY_TWO],
      maxAge: 24 * 7 * 3600000,
      secure: envConfig.NODE_ENV !== 'development',
      ...(envConfig.NODE_ENV !== 'development' && {
        sameSite: 'none'
      }),
      httpOnly: envConfig.NODE_ENV !== 'development'
    })
  );

  const corsOptions = {
    origin: [envConfig.REACT_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  };
  app.use(cors(corsOptions));
}

function startApp(httpServer: http.Server) {
  try {
    httpServer.listen(envConfig.PORT, () => {
      console.log(`Server running on port ${envConfig.PORT}`);
    });
  } catch (error) {
    console.error('Error starting server');
  }
}

AppDataSource.initialize()
  .then(() => {
    console.log('PostgreSQL database connected successfully.');
    bootstrap().catch((e) => console.error(e));
  })
  .catch((error) => console.error('Error connection to PostgreSQL.', error));
