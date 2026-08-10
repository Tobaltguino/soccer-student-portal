import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global() // así no tienes que importarlo en cada módulo que lo use
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}