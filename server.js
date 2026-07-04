const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 8000);
const host = "0.0.0.0";
const root = __dirname;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("文件不存在");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent(request.url.split("?")[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const requestedPath = safePath === "/" ? "/index.html" : safePath;
  const filePath = path.join(root, requestedPath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("禁止访问");
    return;
  }

  sendFile(response, filePath);
});

server.listen(port, host, () => {
  console.log(`南开安全卫士已启动：http://localhost:${port}`);
  console.log(`局域网访问：请使用 http://你的电脑IP:${port}`);
});
