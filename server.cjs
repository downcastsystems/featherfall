const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const types = {
  ".ttf": "font/ttf",
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".md": "text/plain",
};
const server = http.createServer((req, res) => {
  let file;
  try {
    file = path.resolve(
      root,
      "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
    );
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (file === root) file = path.join(root, "index.html");
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
});
server.listen(Number(process.env.PORT) || 4173, "127.0.0.1", () =>
  console.log("One Big Sky ready at http://localhost:" + server.address().port),
);
