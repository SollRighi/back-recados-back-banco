import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Recado extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    idUsuario: number;

    @Column()
    descricao: string;

    @Column()
    detalhamento: string;

}