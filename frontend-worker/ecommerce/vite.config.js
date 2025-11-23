import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Only use HTTPS for local development
const useHttps = process.env.NODE_ENV !== 'production' && 
                 fs.existsSync(path.resolve(__dirname, 'localhost-key.pem'));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: useHttps ? {
		https: {
			key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
			cert: fs.readFileSync(path.resolve(__dirname, 'localhost.pem'))
		}
	} : {}
});
