import axios from "axios";

export const uploadImage = async (file: File): Promise<string> => {
	const formData = new FormData();
	formData.append("file", file);

	try {
		const response = await axios.post("/api/upload/image", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});

		// Return path from response
		const path = response.data.path || response.data.url;
		if (!path) {
			throw new Error("No path returned from upload");
		}
		return path; // Returns /uploads/questions/filename.ext
	} catch (error: any) {
		const message =
			error.response?.data?.message || error.message || "Upload failed";
		throw new Error(message);
	}
};
