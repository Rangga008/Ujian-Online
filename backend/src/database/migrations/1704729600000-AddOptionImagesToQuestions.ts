import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddOptionImagesToQuestions1704729600000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// Check if column already exists before adding
		const table = await queryRunner.getTable("questions");
		const columnExists = table?.columns.some(
			(col) => col.name === "optionImages"
		);

		if (!columnExists) {
			await queryRunner.addColumn(
				"questions",
				new TableColumn({
					name: "optionImages",
					type: "json",
					isNullable: true,
					comment: "URLs for option images (A, B, C, D, E)",
				})
			);
			console.log("✅ Added optionImages column to questions table");
		} else {
			console.log("⚠️  optionImages column already exists");
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn("questions", "optionImages");
		console.log("✅ Dropped optionImages column from questions table");
	}
}
