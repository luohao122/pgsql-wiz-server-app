import { Pool, PoolClient } from 'pg';
import { GraphQLError } from 'graphql';

import { IDataSourceDocument, IQueryProp } from '@/interfaces/datasource.interface';
import { DatasourceService } from '@/services/DatasourceService';
import { base64Decoded } from '@/utils/utils';

export async function testPostgreSQLConnection(data: IDataSourceDocument): Promise<string> {
  let client: PoolClient | null = null;
  const { databaseName, databaseUrl, username, password, port } = data;
  const pool: Pool = new Pool({
    host: databaseUrl,
    user: username,
    password,
    port: parseInt(`${port}`, 10) ?? 5432,
    database: databaseName,
    max: 20, // Maximum number of clients in pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 second if connection could not be established
    maxUses: 7500 // Number of times a connection can be used before being closed
  });

  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return 'Successfully connected to PostgreSQL';
  } catch (error: any) {
    throw new GraphQLError(error?.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function getPostgreSQLCollections(projectId: string, schema: string = 'public'): Promise<string[]> {
  let client: PoolClient | null = null;
  try {
    const project = await DatasourceService.getDataSourceByProjectId(projectId);
    const { databaseName, databaseUrl, username, password, port } = project;
    const pool: Pool = new Pool({
      host: base64Decoded(databaseUrl!)!,
      user: base64Decoded(username!)!,
      password: base64Decoded(password!)!,
      port: parseInt(`${port}`, 10) ?? 5432,
      database: base64Decoded(databaseName!)!,
      max: 20, // Maximum number of clients in pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 second if connection could not be established
      maxUses: 7500 // Number of times a connection can be used before being closed
    });
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    client = await pool.connect();
    const result = await client.query(query, [schema]);
    const tables = result.rows.map((row) => row.table_name);
    return tables;
  } catch (error: any) {
    throw new GraphQLError(error?.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function executePostgreSQLQuery(data: IQueryProp): Promise<Record<string, unknown>[]> {
  let client: PoolClient | null = null;
  try {
    const { projectId, sqlQuery } = data;
    const project = await DatasourceService.getDataSourceByProjectId(projectId);
    const { databaseName, databaseUrl, username, password, port } = project;
    const pool: Pool = new Pool({
      host: base64Decoded(databaseUrl!)!,
      user: base64Decoded(username!)!,
      password: base64Decoded(password!)!,
      port: parseInt(`${port}`, 10) ?? 5432,
      database: base64Decoded(databaseName!)!,
      max: 20, // Maximum number of clients in pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 second if connection could not be established
      maxUses: 7500 // Number of times a connection can be used before being closed
    });
    client = await pool.connect();
    const result = await client.query(sqlQuery);
    return result.rows ?? [];
  } catch (error: any) {
    throw new GraphQLError(error?.message);
  } finally {
    if (client) {
      client.release();
    }
  }
}
