import 'dotenv/config';
import * as joi from 'joi';

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.string().required(),
    DATABASE_URL: joi.string().required(),
    JWT_SECRET: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env);
if (error) {
  throw new Error(`Env Vars error ${error.message}`);
}

const envValues: {
  PORT: number;
  NATS_SERVERS: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
} = value;

export const envs = {
  PORT: envValues.PORT,
  NATS_SERVERS: envValues.NATS_SERVERS.split(','),
  DATABASE_URL: envValues.DATABASE_URL,
  JWT_SECRET: envValues.JWT_SECRET,
};
