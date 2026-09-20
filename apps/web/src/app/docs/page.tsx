import { notFound } from "next/navigation";

export const metadata = {
  title: "API Documentation | HostelHub",
};

export default function DocsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-white/10 bg-slate-900/80 px-6 py-4 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center font-bold text-white text-sm">
            API
          </div>
          <div>
            <h1 className="text-base font-bold text-white">HostelHub OpenAPI 3.1 Explorer</h1>
            <p className="text-xs text-slate-400">
              Development Documentation &bull; Spec: /api/v1/openapi.json
            </p>
          </div>
        </div>
        <a
          href="/api/v1/openapi.json"
          target="_blank"
          rel="noreferrer"
          className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-slate-300 transition-colors"
        >
          View Raw JSON
        </a>
      </header>

      <main className="flex-1 w-full h-[calc(100vh-65px)]">
        <iframe
          srcDoc={`
            <!doctype html>
            <html>
              <head>
                <title>HostelHub API Docs</title>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>
                  body { margin: 0; background: #020617; }
                </style>
              </head>
              <body>
                <script
                  id="api-reference"
                  data-url="/api/v1/openapi.json"
                  data-configuration='{"theme": "deepSpace", "layout": "modern", "darkMode": true}'
                ></script>
                <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
              </body>
            </html>
          `}
          className="w-full h-full border-none"
          title="HostelHub OpenAPI Documentation"
        />
      </main>
    </div>
  );
}
