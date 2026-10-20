import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { editContentStream } from "@/lib/ai/edit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { content, instruction, history } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return new Response(
        JSON.stringify({ error: "Article content is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (
      !instruction ||
      typeof instruction !== "string" ||
      !instruction.trim()
    ) {
      return new Response(
        JSON.stringify({ error: "Instruction is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          const generator = editContentStream(content, instruction, history);

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
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
