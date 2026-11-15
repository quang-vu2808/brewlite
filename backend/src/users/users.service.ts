import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOneBy({ email });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOneBy({ id });
  }

  create(email: string, passwordHash: string): Promise<UserEntity> {
    return this.users.save(this.users.create({ email, passwordHash }));
  }
}
