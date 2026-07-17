import type { ProjectConfig, GeneratedFile, DepMap } from "../../core/types.js";
import { ver } from "../../core/versions.js";
import { ext } from "../../utils/helpers.js";

export function testingDevDeps(config: ProjectConfig): DepMap {
  const runner = config.features.testing;
  if (runner === "none") return {};
  if (runner === "vitest") return { vitest: ver("vitest") };
  if (runner === "jest") {
    const d: DepMap = { jest: ver("jest") };
    if (config.language === "ts") {
      d["ts-jest"] = ver("ts-jest");
      d["@types/jest"] = ver("@types/jest");
    }
    return d;
  }
  // mocha
  const d: DepMap = { mocha: ver("mocha"), chai: ver("chai") };
  if (config.language === "ts") {
    d["@types/mocha"] = ver("@types/mocha");
    d["@types/chai"] = ver("@types/chai");
    d.tsx = ver("tsx");
  }
  return d;
}

export function testingScripts(config: ProjectConfig): Record<string, string> {
  const runner = config.features.testing;
  if (runner === "none") return {};
  if (runner === "vitest") return { test: "vitest run" };
  if (runner === "jest") return { test: "jest" };
  if (config.language === "ts") {
    return { test: "mocha --import=tsx 'tests/**/*.test.ts'" };
  }
  return { test: "mocha 'tests/**/*.test.js'" };
}

export function testingConfigFiles(config: ProjectConfig): GeneratedFile[] {
  const runner = config.features.testing;
  if (runner === "none") return [];
  const files: GeneratedFile[] = [];

  if (runner === "jest") {
    files.push({
      path: "jest.config.cjs",
      content:
        config.language === "ts"
          ? `/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\\\.{1,2}/.*)\\\\.js$': '$1',
  },
};
`
          : `/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
};
`,
    });
  }

  return files;
}

/** Health test for the selected framework + test runner. */
export function healthTestFile(config: ProjectConfig): GeneratedFile | null {
  if (config.features.testing === "none") return null;
  const e = ext(config.language);
  const runner = config.features.testing;
  const fw = config.framework;

  if (runner === "vitest") {
    if (fw === "express") {
      return {
        path: `tests/health.test.${e}`,
        content: `import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/create-app.js';

describe('health', () => {
  it('returns 200', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const res = await fetch(\`http://127.0.0.1:\${port}/health\`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    server.close();
  });
});
`,
      };
    }
    if (fw === "fastify") {
      return {
        path: `tests/health.test.${e}`,
        content: `import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/create-app.js';

describe('health', () => {
  it('returns 200', async () => {
    const app = await createApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    await app.close();
  });
});
`,
      };
    }
    if (fw === "hono") {
      return {
        path: `tests/health.test.${e}`,
        content: `import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/create-app.js';

describe('health', () => {
  it('returns 200', async () => {
    const app = createApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
`,
      };
    }
    // koa
    return {
      path: `tests/health.test.${e}`,
      content: `import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app/create-app.js';

describe('health', () => {
  it('returns 200', async () => {
    const app = createApp();
    const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const res = await fetch(\`http://127.0.0.1:\${port}/health\`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    server.close();
  });
});
`,
    };
  }

  if (runner === "jest") {
    return {
      path: `tests/health.test.${e}`,
      content: `const { createApp } = require('../src/app/create-app');

describe('health', () => {
  it('returns 200', async () => {
    const app = ${fw === "fastify" ? "await createApp()" : "createApp()"};
    ${
      fw === "fastify"
        ? `const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    await app.close();`
        : fw === "hono"
          ? `const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');`
          : `const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const res = await fetch(\`http://127.0.0.1:\${port}/health\`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    server.close();`
    }
  });
});
`,
    };
  }

  // mocha + chai
  return {
    path: `tests/health.test.${e}`,
    content: `import { expect } from 'chai';
import { createApp } from '../src/app/create-app.js';

describe('health', () => {
  it('returns 200', async () => {
    const app = ${fw === "fastify" ? "await createApp()" : "createApp()"};
    ${
      fw === "fastify"
        ? `const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).to.equal(200);
    expect(res.json().status).to.equal('ok');
    await app.close();`
        : fw === "hono"
          ? `const res = await app.request('/health');
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body.status).to.equal('ok');`
          : `const server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const res = await fetch(\`http://127.0.0.1:\${port}/health\`);
    expect(res.status).to.equal(200);
    const body = await res.json();
    expect(body.status).to.equal('ok');
    server.close();`
    }
  });
});
`,
  };
}
