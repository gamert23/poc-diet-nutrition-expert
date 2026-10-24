import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function handleRoute<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof ZodError) {
        return NextResponse.json({ error: "Invalid request", issues: error.issues }, { status: 400 });
      }
      console.error(error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
