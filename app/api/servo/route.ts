import { NextResponse } from "next/server"

// In a real application, this would send commands to your ESP32
export async function POST(request: Request) {
  try {
    const { position } = await request.json()

    // Validate position
    if (typeof position !== "number" || position < 0 || position > 180) {
      return NextResponse.json({ error: "Invalid position. Must be a number between 0 and 180." }, { status: 400 })
    }

    // In a real app, you would send this position to your ESP32
    console.log(`Setting servo position to ${position}°`)

    // Return success response
    return NextResponse.json({ success: true, position })
  } catch (error) {
    console.error("Error processing servo request:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
