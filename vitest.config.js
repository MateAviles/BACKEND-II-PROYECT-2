import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        setupFiles: ["./tests/setup.js"],
        // Los tests comparten una base de datos: corren en serie
        fileParallelism: false,
        testTimeout: 20000
    }
});
