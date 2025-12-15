// Role-based access control helper
export const allowedRolesForPage: Record<string, string[]> = {
	"/dashboard": ["admin", "teacher"],
	"/exams": ["admin", "teacher"],
	"/students": ["admin", "teacher"],
	"/classes": ["admin", "teacher"],
	"/results": ["admin", "teacher"],
	"/teachers": ["admin"],
	"/users": ["admin"],
	"/semesters": ["admin"],
	"/settings": ["admin"],
};

export const isPageAccessible = (page: string, userRole?: string): boolean => {
	if (!userRole) return false;
	const allowedRoles = allowedRolesForPage[page] || [];
	return allowedRoles.includes(userRole);
};
