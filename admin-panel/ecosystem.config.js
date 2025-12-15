module.exports = {
	apps: [
		{
			name: "admin",
			script: "npm",
			args: "start",
			max_memory_restart: "300M",
			instances: 1,
			exec_mode: "fork",
			autorestart: true,
		},
	],
};
