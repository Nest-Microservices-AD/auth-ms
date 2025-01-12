import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoginUserDto, RegisterUserDto } from './dto';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { jwtPayload } from './interfaces/jwt-payload.interface';
import { envs } from 'src/config';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  private readonly logger = new Logger('AuthService');
  onModuleInit() {
    this.$connect();
    this.logger.log('AuthService connected to database');
  }

  async signToken(payload: jwtPayload) {
    return this.jwtService.sign(payload);
  }

  async registerUser(registerUserDto: RegisterUserDto) {
    const { name, password, email } = registerUserDto;
    const user = await this.user.findUnique({
      where: { email },
    });
    if (user) {
      throw new RpcException({
        status: 400,
        message: 'User already exists',
      });
    }
    try {
      const newUser = await this.user.create({
        data: {
          name,
          email,
          password: bcrypt.hashSync(password, 10),
        },
      });
      return {
        user: { name: newUser.name, email: newUser.email, id: newUser.id },
        token: await this.signToken({
          name: newUser.name,
          email: newUser.email,
          id: newUser.id,
        }),
      };
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        status: 500,
        message: 'Internal server error',
      });
    }
  }

  async loginUser(loginUserDto: LoginUserDto) {
    const { password, email } = loginUserDto;
    const user = await this.user.findUnique({
      where: { email },
    });
    if (!user) {
      throw new RpcException({
        status: 400,
        message: 'User does not exist',
      });
    }
    const isPasswordMatch = bcrypt.compareSync(password, user.password);
    if (!isPasswordMatch) {
      throw new RpcException({
        status: 400,
        message: 'Invalid credentials',
      });
    }
    return {
      user: { name: user.name, email: user.email, id: user.id },
      token: await this.signToken({
        name: user.name,
        email: user.email,
        id: user.id,
      }),
    };
  }

  async verifyToken(token: string) {
    try {
      const { sub, iat, ...user } = this.jwtService.verify(token, {
        secret: envs.JWT_SECRET,
      });
      return {
        user,
        token: await this.signToken({
          name: user.name,
          email: user.email,
          id: user.id,
        }),
      };
    } catch (_error) {
      throw new RpcException({
        status: 401,
        message: 'Unauthorized',
      });
    }
  }
}
