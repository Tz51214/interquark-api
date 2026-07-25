import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTasksTable1785004633863 implements MigrationInterface {
    name = 'AddTasksTable1785004633863'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum" AS ENUM('todo', 'in_progress', 'review', 'completed')`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_priority_enum" AS ENUM('low', 'medium', 'high')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" text, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'todo', "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium', "dueDate" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "projectId" integer, "freelancerId" integer, CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_e08fca67ca8966e6b9914bf2956" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_11e43afd32478f292ac124aa40e" FOREIGN KEY ("freelancerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_11e43afd32478f292ac124aa40e"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_e08fca67ca8966e6b9914bf2956"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    }

}
