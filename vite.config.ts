/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 프로젝트 페이지(user.github.io/catdog)이므로 base 경로 필수.
// 배포 후 흰 화면이면 90% 이게 원인. (CLAUDE.md: GitHub Pages 함정 #1)
export default defineConfig({
  base: '/catdog/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
