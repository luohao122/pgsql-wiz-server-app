import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

import { envConfig } from '@/config/env.config';
import { User } from '@/entities/user.entity';
import { ChartInfo } from '@/entities/chartInfo.entity';

import { Datasource } from '@/entities/datasource.entity';

const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  username: envConfig.DB_USERNAME,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_DATABASE,
  synchronize: false,
  logging: false,
  entities: [User, ChartInfo, Datasource],
  migrations: [join(__dirname, '../database/migrations/**/*{.ts,.js}')],
  ssl: envConfig.DB_SSL
    ? {
        rejectUnauthorized: false
      }
    : false
};

export const AppDataSource = new DataSource(databaseConfig);
