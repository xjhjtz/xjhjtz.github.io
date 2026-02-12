// Project data configuration file
// Used to manage data for the project display page

export interface Project {
	id: string;
	title: string;
	description: string;
	image: string;
	category: "web" | "mobile" | "desktop" | "other";
	techStack: string[];
	status: "completed" | "in-progress" | "planned";
	liveDemo?: string;
	sourceCode?: string;
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
	visitUrl?: string; // 添加前往项目链接字段
}

export const projectsData: Project[] = [
	{
		id: "skmnq",
		title: "上课模拟器",
		description: "早期作品，没什么用",
		image: "",
		category: "cpp",
		techStack: ["C++"],
		status: "completed",
		liveDemo: "",
		sourceCode: "https://github.com/xjhjtz/skmnq", // 更改为GitHub链接
		visitUrl: "https://github.com/xjhjtz/skmnq", // 添加前往项目链接
		startDate: "2025-10-22",
		endDate: "2026-01-29",
		featured: true,
		tags: ["娱乐", "抽象", "开源"],
	},
	{
		id: "small-tools",
		title: "小工具",
		description: "也是早期作品，当年学OI的时候写的，",
		image: "",
		category: "cpp",
		techStack: ["C++"],
		status: "completed",
		liveDemo: "",
		sourceCode: "https://github.com/xjhjtz/small-tools",
		visitUrl: "https://github.com/xjhjtz/small-tools", // 添加前往项目链接
		startDate: "2025-03-07",
		endDate: "2025-05-22",
		featured: true,
		tags: ["娱乐", "抽象", "开源"],
	},
];

// Get project statistics
export const getProjectStats = () => {
	const total = projectsData.length;
	const completed = projectsData.filter(
		(p) => p.status === "completed",
	).length;
	const inProgress = projectsData.filter(
		(p) => p.status === "in-progress",
	).length;
	const planned = projectsData.filter((p) => p.status === "planned").length;

	return {
		total,
		byStatus: {
			completed,
			inProgress,
			planned,
		},
	};
};

// Get projects by category
export const getProjectsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return projectsData;
	}
	return projectsData.filter((p) => p.category === category);
};

// Get featured projects
export const getFeaturedProjects = () => {
	return projectsData.filter((p) => p.featured);
};

// Get all tech stacks
export const getAllTechStack = () => {
	const techSet = new Set<string>();
	projectsData.forEach((project) => {
		project.techStack.forEach((tech) => {
			techSet.add(tech);
		});
	});
	return Array.from(techSet).sort();
};
