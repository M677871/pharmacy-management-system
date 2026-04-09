import { IsUUID } from 'class-validator';

export class MarkThreadReadDto {
  @IsUUID()
  contactId: string;
}
