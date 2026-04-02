import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const messages = Array.isArray(body?.messages) ? body.messages : [];

        const prompt = messages
            .map((m: { role: string; content: string }) => {
                const role = m.role === "user" ? "User" : "Assistant";
                return `${role}: ${m.content}`;
            })
            .join("\n");

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a helpful chatbot.\n\n${prompt}\nAssistant:`,
        });

        const text = result.text ?? "No response generated.";

        return NextResponse.json({ reply: text });
    } catch (error) {
        console.error("Gemini API error:", error);
        return NextResponse.json(
            { reply: "Something went wrong while generating the response." },
            { status: 500 }
        );
    }
}