import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, headers: clientHeaders, body: requestBody } = body;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (clientHeaders) {
      for (const [k, v] of Object.entries(clientHeaders)) {
        if (typeof v === "string") headers[k] = v;
      }
    }

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: typeof requestBody === "string" ? requestBody : JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Upstream HTTP ${resp.status}` }), {
        status: resp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream the response back
    const readable = resp.body;
    if (!readable) {
      return new Response(JSON.stringify({ error: "No response body" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
