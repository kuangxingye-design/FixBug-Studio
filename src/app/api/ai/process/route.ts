import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { processMarkdownStream } from "@/lib/ai/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate file type
    if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown")) {
      return new Response(
        JSON.stringify({ error: "Only .md files are supported" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 5MB." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Read file content
    const rawContent = await file.text();

    if (!rawContent.trim()) {
      return new Response(
        JSON.stringify({ error: "File is empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          const generator = processMarkdownStream(rawContent);

          for await (const event of generator) {
            switch (event.type) {
              case "progress":
                sendEvent("progress", {
                  step: event.step,
                  message: event.message,
                });
                break;
              case "complete":
                sendEvent("complete", { result: event.result });
                break;
              case "error":
                sendEvent("error", { message: event.message });
                break;
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          sendEvent("error", {
            message:
              error instanceof Error ? error.message : "Unknown error",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI process error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
