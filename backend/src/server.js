import { access, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { evaluateInterviewAnswer } from "./services/evaluation.service.js";
import { generateInterviewQuestions } from "./services/questions.service.js";
import { extractResumeText } from "./services/resume.service.js";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const host =
  process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1");
const port = Number(process.env.PORT) || 4000;
const aiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const maxResumeSizeBytes = 5 * 1024 * 1024;
const maxJsonBodyBytes = 8 * 1024 * 1024;
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const frontendDistDirectory = resolve(currentDirectory, "../../frontend/dist");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });

  res.end(JSON.stringify(payload));
}

function collectRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > maxBytes) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("error", reject);
  });
}

function isPdfUpload(payload) {
  return (
    payload?.mimeType === "application/pdf" ||
    payload?.fileName?.toLowerCase().endsWith(".pdf")
  );
}

function getContentType(filePath) {
  return contentTypes[extname(filePath)] || "application/octet-stream";
}

async function canAccess(pathname) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function serveFrontendAsset(res, requestPathname, requestMethod) {
  const normalizedPath = normalize(requestPathname).replace(/^(\.\.[/\\])+/, "");
  const relativePath =
    normalizedPath === "/" ? "index.html" : normalizedPath.replace(/^\/+/, "");
  const requestedFilePath = join(frontendDistDirectory, relativePath);
  const indexFilePath = join(frontendDistDirectory, "index.html");
  const hasFrontendBuild = await canAccess(indexFilePath);

  if (!hasFrontendBuild) {
    res.writeHead(503, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Frontend build not found. Run `npm run build` before starting production.");
    return;
  }

  const isAssetRequest = extname(relativePath) !== "";
  const hasRequestedFile = await canAccess(requestedFilePath);
  const filePath = hasRequestedFile
    ? requestedFilePath
    : isAssetRequest
      ? null
      : indexFilePath;

  if (!filePath) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    res.end("Asset not found.");
    return;
  }

  res.writeHead(200, {
    "Content-Type": getContentType(filePath),
  });

  if (requestMethod === "HEAD") {
    res.end();
    return;
  }

  const fileContents = await readFile(filePath);
  res.end(fileContents);
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    return sendJson(res, 404, {
      error: "Not found.",
    });
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    return sendJson(res, 200, {
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      aiModel,
      status: "ok",
      service: "ai-interview-copilot-api",
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === "POST" && req.url === "/api/resume/upload") {
    try {
      const bodyBuffer = await collectRequestBody(req, maxJsonBodyBytes);
      const payload = JSON.parse(bodyBuffer.toString("utf8"));

      if (!payload?.fileDataBase64 || !payload?.fileName) {
        return sendJson(res, 400, {
          error: "Please upload a resume PDF.",
        });
      }

      if (!isPdfUpload(payload)) {
        return sendJson(res, 400, {
          error: "Only PDF resumes are supported right now.",
        });
      }

      const fileBuffer = Buffer.from(payload.fileDataBase64, "base64");

      if (fileBuffer.byteLength > maxResumeSizeBytes) {
        return sendJson(res, 400, {
          error: "Resume PDF must be 5 MB or smaller.",
        });
      }

      const resume = await extractResumeText(fileBuffer);

      if (!resume.text) {
        return sendJson(res, 422, {
          error: "We could not extract readable text from this PDF.",
        });
      }

      return sendJson(res, 200, {
        fileName: payload.fileName,
        ...resume,
      });
    } catch (error) {
      console.error(error);

      return sendJson(res, 500, {
        error: "Failed to process the resume PDF.",
      });
    }
  }

  if (req.method === "POST" && req.url === "/api/questions/generate") {
    try {
      const bodyBuffer = await collectRequestBody(req, maxJsonBodyBytes);
      const payload = JSON.parse(bodyBuffer.toString("utf8"));
      const role = payload?.role?.trim();
      const resumeText = payload?.resumeText?.trim();

      if (!role) {
        return sendJson(res, 400, {
          error: "Please enter the target role.",
        });
      }

      if (!resumeText) {
        return sendJson(res, 400, {
          error: "Upload a resume before generating questions.",
        });
      }

      const result = await generateInterviewQuestions({
        role,
        resumeText,
      });

      return sendJson(res, 200, result);
    } catch (error) {
      console.error(error);

      return sendJson(res, 500, {
        error: error.message || "Failed to generate interview questions.",
      });
    }
  }

  if (req.method === "POST" && req.url === "/api/answers/evaluate") {
    try {
      const bodyBuffer = await collectRequestBody(req, maxJsonBodyBytes);
      const payload = JSON.parse(bodyBuffer.toString("utf8"));
      const role = payload?.role?.trim();
      const resumeText = payload?.resumeText?.trim();
      const question = payload?.question?.trim();
      const answer = payload?.answer?.trim();

      if (!role) {
        return sendJson(res, 400, {
          error: "Please enter the target role.",
        });
      }

      if (!resumeText) {
        return sendJson(res, 400, {
          error: "Upload a resume before evaluating answers.",
        });
      }

      if (!question) {
        return sendJson(res, 400, {
          error: "Generate questions before evaluating an answer.",
        });
      }

      if (!answer) {
        return sendJson(res, 400, {
          error: "Please enter an answer before evaluation.",
        });
      }

      const result = await evaluateInterviewAnswer({
        role,
        resumeText,
        question,
        answer,
      });

      return sendJson(res, 200, result);
    } catch (error) {
      console.error(error);

      return sendJson(res, 500, {
        error: error.message || "Failed to evaluate interview answer.",
      });
    }
  }

  if ((req.method === "GET" || req.method === "HEAD") && !req.url.startsWith("/api")) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    try {
      await serveFrontendAsset(res, requestUrl.pathname, req.method);
    } catch (error) {
      console.error(error);

      res.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      res.end("Failed to serve the frontend.");
    }

    return;
  }

  return sendJson(res, 404, {
    error: "Not found.",
  });
});

server.listen(port, host, () => {
  console.log(`API server listening on http://${host}:${port}`);
});
