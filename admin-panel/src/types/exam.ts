export interface Subject {
	id: number;
	name: string;
	code: string;
}

export interface Class {
	id: number;
	name: string;
	major: string;
	grade?: number;
	semesterId?: number;
}

export interface Semester {
	id: number;
	name: string;
	year: string;
	isActive: boolean;
}

export interface Grade {
	id: number;
	name: string;
	section: string;
	isActive: boolean;
}

export interface Question {
	id?: number;
	questionText: string;
	type: "multiple_choice" | "mixed_multiple_choice" | "true_false" | "essay";
	options: string[];
	correctAnswer: string;
	points: number;
	orderIndex: number;
	imageUrl?: string;
	imageFile?: File | null;
	optionImages?: string[];
	optionImageFiles?: (File | null)[];
	optionImagePreviews?: string[];
	allowPhotoAnswer?: boolean;
}

export interface Exam {
	id: number;
	title: string;
	description: string;
	duration: number;
	startTime: string;
	endTime: string;
	semesterId: number;
	targetType: "class" | "grade";
	classId?: number;
	gradeId?: number;
	grade?: string;
	subjectId?: number;
	randomizeQuestions: boolean;
	showResultImmediately: boolean;
	requireToken: boolean;
	token?: string;
	status: string;
	totalScore: number;
	totalQuestions: number;
	imageUrl?: string;
	questions: Question[];
}
