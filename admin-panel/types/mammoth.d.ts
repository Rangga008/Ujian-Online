declare module "mammoth/mammoth.browser" {
	export interface ImageElement {
		contentType: string;
		read: (encoding: "base64") => Promise<string>;
	}

	export interface ConvertImageOptions {
		inline: (
			handler: (element: ImageElement) => Promise<{ src: string }>
		) => any;
	}

	export interface ConvertOptions {
		convertImage?: ConvertImageOptions;
	}

	export function convertToMarkdown(
		input: { arrayBuffer: ArrayBuffer },
		options?: ConvertOptions
	): Promise<{ value: string; messages: any[] }>;

	export const images: ConvertImageOptions;
}
